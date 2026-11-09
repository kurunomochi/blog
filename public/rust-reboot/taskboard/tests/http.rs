use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use rust_taskboard::{
    api::{AppState, router},
    domain::NewTask,
    jobs::{JobStatus, Jobs},
    repository::Repository,
    service::Database,
};
use serde_json::{Value, json};
use tower::ServiceExt;

fn app() -> (Router, tokio::task::JoinHandle<()>) {
    let db = Database::new(Repository::memory().unwrap());
    let (jobs, worker) = Jobs::start(db.clone());
    (router(AppState { database: db, jobs }), worker)
}
async fn request(
    app: &Router,
    method: &str,
    url: &str,
    value: Option<Value>,
) -> (StatusCode, Value) {
    let body = value.map(|v| v.to_string()).unwrap_or_default();
    let req = Request::builder()
        .method(method)
        .uri(url)
        .header("content-type", "application/json")
        .body(Body::from(body))
        .unwrap();
    let response = app.clone().oneshot(req).await.unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 1_000_000).await.unwrap();
    (
        status,
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| json!({"text":String::from_utf8_lossy(&bytes)})),
    )
}
#[tokio::test]
async fn crud_conflict_and_json_errors() {
    let (app, worker) = app();
    let (status, t) = request(
        &app,
        "POST",
        "/tasks",
        Some(json!({"title":"API task","priority":3,"tags":["Rust"]})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(t["version"], 1);
    let id = t["id"].as_i64().unwrap();
    let update = json!({"expected_version":1,"title":"updated","priority":3,"tags":[],"status":"done","due_at":null});
    assert_eq!(
        request(&app, "PUT", &format!("/tasks/{id}"), Some(update.clone()))
            .await
            .0,
        StatusCode::OK
    );
    let conflict = request(&app, "PUT", &format!("/tasks/{id}"), Some(update)).await;
    assert_eq!(conflict.0, StatusCode::CONFLICT);
    assert_eq!(conflict.1["error"]["code"], "version_conflict");
    assert_eq!(request(&app, "GET", "/stats", None).await.1["done"], 1);
    assert_eq!(
        request(
            &app,
            "DELETE",
            &format!("/tasks/{id}?expected_version=2"),
            None
        )
        .await
        .0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        request(&app, "GET", &format!("/tasks/{id}"), None).await.0,
        StatusCode::NOT_FOUND
    );
    drop(app);
    worker.await.unwrap();
}
#[tokio::test]
async fn invalid_inputs_and_request_limit() {
    let (app, worker) = app();
    assert_eq!(
        request(&app, "POST", "/tasks", Some(json!({"title":" "})))
            .await
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        request(&app, "GET", "/tasks?limit=0", None).await.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        request(&app, "POST", "/tasks", Some(json!({"title":"x","typo":1})))
            .await
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        request(
            &app,
            "POST",
            "/tasks",
            Some(json!({"title":"x","description":"x".repeat(300_000)}))
        )
        .await
        .0,
        StatusCode::PAYLOAD_TOO_LARGE
    );
    assert_eq!(request(&app, "GET", "/stats", None).await.1["total"], 0);
    drop(app);
    worker.await.unwrap();
}
#[tokio::test]
async fn background_import_can_be_observed() {
    let (app, worker) = app();
    let (status, accepted) = request(
        &app,
        "POST",
        "/jobs/import",
        Some(json!([{"title":"one"},{"title":"two"}])),
    )
    .await;
    assert_eq!(status, StatusCode::ACCEPTED);
    let id = accepted["id"].as_u64().unwrap();
    tokio::time::timeout(std::time::Duration::from_secs(5), async {
        loop {
            let (_, job) = request(&app, "GET", &format!("/jobs/{id}"), None).await;
            if job["status"] == "succeeded" {
                assert_eq!(job["created_ids"].as_array().unwrap().len(), 2);
                break;
            }
            assert_ne!(job["status"], "failed");
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    assert_eq!(request(&app, "GET", "/stats", None).await.1["total"], 2);
    drop(app);
    worker.await.unwrap();
}
#[tokio::test]
async fn bounded_queue_rejects_and_drains() {
    let database = Database::new(Repository::memory().unwrap());
    let (jobs, worker) = Jobs::start(database.clone());
    // 当前线程 runtime 在本段无 await，因此 worker 尚未读取队列。
    let mut ids = vec![];
    for n in 0..8 {
        ids.push(
            jobs.submit(vec![NewTask::simple(format!("task {n}"))])
                .unwrap()
                .id,
        );
    }
    assert!(jobs.submit(vec![NewTask::simple("full")]).is_err());
    tokio::time::timeout(std::time::Duration::from_secs(5), async {
        loop {
            if jobs.get(*ids.last().unwrap()).unwrap().status == JobStatus::Succeeded {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    drop(jobs);
    worker.await.unwrap();
    assert_eq!(database.call(|r| r.stats()).await.unwrap().total, 8);
}
#[tokio::test]
async fn concurrent_writers_do_not_silently_overwrite() {
    let (app, worker) = app();
    let (_, task) = request(&app, "POST", "/tasks", Some(json!({"title":"original"}))).await;
    let url = format!("/tasks/{}", task["id"].as_i64().unwrap());
    let update = |title: &str| json!({"expected_version":1,"title":title,"priority":2,"tags":[],"status":"doing","due_at":null});
    let (a, b) = tokio::join!(
        request(&app, "PUT", &url, Some(update("a"))),
        request(&app, "PUT", &url, Some(update("b")))
    );
    let mut statuses = [a.0.as_u16(), b.0.as_u16()];
    statuses.sort();
    assert_eq!(statuses, [200, 409]);
    assert_eq!(request(&app, "GET", &url, None).await.1["version"], 2);
    drop(app);
    worker.await.unwrap();
}
