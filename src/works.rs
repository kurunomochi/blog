use crate::{SharedState, error::AppError, storage};
use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::StatusCode,
    routing::{get, post, put},
};
use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Work {
    pub id: String,
    #[serde(flatten)]
    pub details: WorkInput,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkInput {
    pub title: String,
    pub category: String,
    pub date: String,
    pub description: String,
    pub cover: String,
    #[serde(default)]
    pub images: Vec<String>,
    #[serde(default = "default_software")]
    pub software: String,
    #[serde(default)]
    pub featured: bool,
}
fn default_software() -> String {
    "Blender".into()
}

pub fn public_routes() -> Router<SharedState> {
    Router::new()
        .route("/works", get(list))
        .route("/works/{id}", get(detail))
}
pub fn protected_routes() -> Router<SharedState> {
    Router::new()
        .route("/works", post(create))
        .route("/works/{id}", put(update).delete(remove))
        .route(
            "/uploads",
            post(upload).layer(DefaultBodyLimit::max(20 * 1024 * 1024)),
        )
}
pub fn safe_image(url: &str) -> bool {
    if url.len() > 2048
        || url.chars().any(|c| c.is_control() || c.is_whitespace())
        || url.contains(['\\', '<', '>', '"', '\''])
        || url.contains("..")
    {
        return false;
    }
    if url.starts_with("/uploads/") || url.starts_with("/assets/") {
        return !url.contains('%') && url.rsplit('/').next().is_some_and(|name| !name.is_empty());
    }
    url.parse::<axum::http::Uri>().is_ok_and(|uri| {
        uri.scheme_str() == Some("https")
            && uri.host().is_some_and(|host| !host.is_empty())
            && uri
                .authority()
                .is_some_and(|authority| !authority.as_str().contains('@'))
    })
}
fn validate(input: &WorkInput) -> Result<(), AppError> {
    if input.title.trim().is_empty()
        || input.title.len() > 200
        || input.category.trim().is_empty()
        || input.category.len() > 80
        || input.description.len() > 30000
        || input.date.len() > 32
        || input.software.len() > 200
        || !safe_image(&input.cover)
        || std::iter::once(&input.cover)
            .chain(&input.images)
            .collect::<std::collections::HashSet<_>>()
            .len()
            > 30
        || input.images.iter().any(|url| !safe_image(url))
    {
        return Err(AppError::BadRequest(
            "请检查标题、分类及图片路径（站内路径或 HTTPS URL），最多 30 张图片".into(),
        ));
    }
    Ok(())
}
async fn list(State(state): State<SharedState>) -> Json<Vec<Work>> {
    Json(state.works.read().await.clone())
}
async fn detail(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<Json<Work>, AppError> {
    state
        .works
        .read()
        .await
        .iter()
        .find(|w| w.id == id)
        .cloned()
        .map(Json)
        .ok_or(AppError::NotFound)
}
async fn create(
    State(state): State<SharedState>,
    Json(input): Json<WorkInput>,
) -> Result<(StatusCode, Json<Work>), AppError> {
    validate(&input)?;
    let work = Work {
        id: Uuid::new_v4().to_string(),
        details: input,
    };
    let mut works = state.works.write().await;
    let mut updated = works.clone();
    updated.insert(0, work.clone());
    storage::save(&state.works_file, &updated).await?;
    *works = updated;
    Ok((StatusCode::CREATED, Json(work)))
}
async fn update(
    State(state): State<SharedState>,
    Path(id): Path<String>,
    Json(input): Json<WorkInput>,
) -> Result<Json<Work>, AppError> {
    validate(&input)?;
    let mut works = state.works.write().await;
    let mut updated = works.clone();
    let work = updated
        .iter_mut()
        .find(|w| w.id == id)
        .ok_or(AppError::NotFound)?;
    work.details = input;
    let result = work.clone();
    storage::save(&state.works_file, &updated).await?;
    *works = updated;
    Ok(Json(result))
}
async fn remove(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let mut works = state.works.write().await;
    let updated: Vec<_> = works.iter().filter(|w| w.id != id).cloned().collect();
    if works.len() == updated.len() {
        return Err(AppError::NotFound);
    }
    storage::save(&state.works_file, &updated).await?;
    *works = updated;
    Ok(StatusCode::NO_CONTENT)
}
fn image_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("png")
    } else if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("jpg")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}
async fn upload(
    State(state): State<SharedState>,
    bytes: Bytes,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let extension = image_extension(&bytes).ok_or_else(|| {
        AppError::BadRequest("仅支持 PNG、JPEG、WebP 图片，单张最大 20 MB".into())
    })?;
    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    fs::write(state.uploads_dir.join(&filename), &bytes)
        .await
        .map_err(AppError::storage)?;
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "url": format!("/uploads/{filename}") })),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_active_content_and_path_traversal() {
        for url in [
            "javascript:alert(1)",
            "//evil.com/x",
            "/uploads/../posts.json",
            "/assets/a\".png",
            "data:image/svg+xml,x",
            "/uploads/%2e%2e/posts.json",
            "https://",
            "https://user:pass@example.com/a.png",
        ] {
            assert!(!safe_image(url), "{url}");
        }
        assert!(safe_image("/uploads/render.png"));
        assert!(safe_image("https://example.com/render.webp"));
        assert_eq!(image_extension(b"<svg onload='alert(1)'>"), None);
        assert_eq!(image_extension(b"\x89PNG\r\n\x1a\n"), Some("png"));
    }
}
