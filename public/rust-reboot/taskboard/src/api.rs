use crate::{
    domain::*,
    error::Error,
    jobs::{Job, Jobs},
    service::Database,
};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub jobs: Jobs,
}
pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/tasks", get(list).post(create))
        .route("/tasks/{id}", get(detail).put(update).delete(remove))
        .route("/stats", get(stats))
        .route("/events", get(events))
        .route("/export", get(export))
        .route("/jobs/import", axum::routing::post(import))
        .route("/jobs/{id}", get(job))
        .layer(DefaultBodyLimit::max(256 * 1024))
        .with_state(state)
}
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            Error::Invalid(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid_input",
                self.to_string(),
            ),
            Error::NotFound(_) => (StatusCode::NOT_FOUND, "not_found", self.to_string()),
            Error::Conflict => (StatusCode::CONFLICT, "version_conflict", self.to_string()),
            Error::Busy => (StatusCode::SERVICE_UNAVAILABLE, "busy", self.to_string()),
            Error::Database(_) | Error::Internal(_) => {
                eprintln!("request failed: {self}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "内部存储错误".into(),
                )
            }
        };
        (
            status,
            Json(json!({"error":{"code":code,"message":message}})),
        )
            .into_response()
    }
}
async fn health(State(s): State<AppState>) -> Result<Json<serde_json::Value>, Error> {
    s.database.call(|r| r.stats()).await?;
    Ok(Json(json!({"status":"ok","schema":1})))
}
async fn list(
    State(s): State<AppState>,
    Query(filter): Query<Filter>,
) -> Result<Json<Page<Task>>, Error> {
    Ok(Json(s.database.call(move |r| r.list(filter)).await?))
}
async fn create(State(s): State<AppState>, Json(input): Json<NewTask>) -> Result<Response, Error> {
    let task = s.database.call(move |r| r.create(input)).await?;
    Ok((
        StatusCode::CREATED,
        [(header::LOCATION, format!("/tasks/{}", task.id))],
        Json(task),
    )
        .into_response())
}
async fn detail(State(s): State<AppState>, Path(id): Path<i64>) -> Result<Json<Task>, Error> {
    Ok(Json(s.database.call(move |r| r.get(id)).await?))
}
async fn update(
    State(s): State<AppState>,
    Path(id): Path<i64>,
    Json(input): Json<UpdateTask>,
) -> Result<Json<Task>, Error> {
    Ok(Json(s.database.call(move |r| r.update(id, input)).await?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Version {
    expected_version: i64,
}
async fn remove(
    State(s): State<AppState>,
    Path(id): Path<i64>,
    Query(v): Query<Version>,
) -> Result<StatusCode, Error> {
    s.database
        .call(move |r| r.delete(id, v.expected_version))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn stats(State(s): State<AppState>) -> Result<Json<Stats>, Error> {
    Ok(Json(s.database.call(|r| r.stats()).await?))
}
async fn events(State(s): State<AppState>) -> Result<Json<Vec<Event>>, Error> {
    Ok(Json(s.database.call(|r| r.events()).await?))
}
async fn export(State(s): State<AppState>) -> Result<Json<Vec<NewTask>>, Error> {
    Ok(Json(s.database.call(|r| r.export()).await?))
}
async fn import(
    State(s): State<AppState>,
    Json(tasks): Json<Vec<NewTask>>,
) -> Result<(StatusCode, Json<Job>), Error> {
    Ok((StatusCode::ACCEPTED, Json(s.jobs.submit(tasks)?)))
}
async fn job(State(s): State<AppState>, Path(id): Path<u64>) -> Result<Json<Job>, Error> {
    Ok(Json(s.jobs.get(id)?))
}
