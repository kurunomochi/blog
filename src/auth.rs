use crate::{SharedState, error::AppError, oauth};
use axum::{
    Json,
    extract::{Request, State},
    http::{HeaderMap, Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use subtle::ConstantTimeEq;
use uuid::Uuid;

pub const SESSION_SECONDS: u64 = 12 * 60 * 60;
#[derive(Clone)]
pub struct Session {
    pub token: String,
    csrf: String,
    created: Instant,
}
#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}
#[derive(Serialize)]
pub struct LoginResponse {
    token: String,
}

pub fn secret_eq(left: &str, right: &str) -> bool {
    bool::from(left.as_bytes().ct_eq(right.as_bytes()))
}
pub async fn issue_session(state: &SharedState) -> Session {
    let session = Session {
        token: Uuid::new_v4().to_string(),
        csrf: Uuid::new_v4().to_string(),
        created: Instant::now(),
    };
    let mut sessions = state.sessions.write().await;
    sessions.retain(|s| s.created.elapsed().as_secs() < SESSION_SECONDS);
    if sessions.len() >= 20 {
        sessions.remove(0);
    }
    sessions.push(session.clone());
    session
}
fn bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}
async fn authenticated(
    state: &SharedState,
    headers: &HeaderMap,
) -> Result<(Session, bool), AppError> {
    let (token, cookie_auth) = if let Some(value) = bearer(headers) {
        if !state.oauth.password_enabled() {
            return Err(AppError::Unauthorized);
        }
        (value, false)
    } else {
        (
            oauth::cookie(headers, oauth::SESSION_COOKIE).ok_or(AppError::Unauthorized)?,
            true,
        )
    };
    state
        .sessions
        .read()
        .await
        .iter()
        .find(|s| secret_eq(&s.token, token) && s.created.elapsed().as_secs() < SESSION_SECONDS)
        .cloned()
        .map(|s| (s, cookie_auth))
        .ok_or(AppError::Unauthorized)
}
fn csrf_valid(headers: &HeaderMap, origin: Option<&str>, csrf: &str) -> bool {
    origin.is_some_and(|expected| {
        headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) == Some(expected)
    }) && headers
        .get("x-csrf-token")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|value| secret_eq(value, csrf))
}
// Authenticate before parsing uploaded bodies. Cookie sessions also require same-origin writes.
pub async fn guard(
    State(state): State<SharedState>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let (session, cookie_auth) = authenticated(&state, request.headers()).await?;
    if cookie_auth
        && !matches!(
            *request.method(),
            Method::GET | Method::HEAD | Method::OPTIONS
        )
        && !csrf_valid(request.headers(), state.oauth.origin(), &session.csrf)
    {
        return Err(AppError::Forbidden);
    }
    Ok(next.run(request).await)
}
pub async fn session(
    State(state): State<SharedState>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let (session, cookie_auth) = authenticated(&state, &headers).await?;
    if cookie_auth {
        Ok(Json(serde_json::json!({"csrf_token":session.csrf})).into_response())
    } else {
        Ok(StatusCode::NO_CONTENT.into_response())
    }
}
pub async fn login(
    State(state): State<SharedState>,
    Json(input): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    if !state.oauth.password_enabled() {
        return Err(AppError::Unauthorized);
    }
    let mut attempts = state.login_attempts.lock().await;
    attempts.retain(|time| time.elapsed().as_secs() < 60);
    if attempts.len() >= 10 {
        return Err(AppError::TooManyRequests);
    }
    attempts.push(Instant::now());
    drop(attempts);
    if !secret_eq(&input.username, &state.admin_username)
        || !secret_eq(&input.password, &state.admin_password)
    {
        return Err(AppError::Unauthorized);
    }
    Ok(Json(LoginResponse {
        token: issue_session(&state).await.token,
    }))
}
pub async fn logout(
    State(state): State<SharedState>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let (session, _) = authenticated(&state, &headers).await?;
    state
        .sessions
        .write()
        .await
        .retain(|s| !secret_eq(&s.token, &session.token));
    let mut response = StatusCode::NO_CONTENT.into_response();
    oauth::set_cookie(&mut response, oauth::SESSION_COOKIE, "", 0);
    Ok(response)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn cookie_session_is_revoked_on_logout_and_password_mode_is_disabled() {
        let state = crate::oauth::tests::state();
        let session = issue_session(&state).await;
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            format!("{}={}", oauth::SESSION_COOKIE, session.token)
                .parse()
                .unwrap(),
        );
        assert!(authenticated(&state, &headers).await.unwrap().1);
        let result = login(
            State(state.clone()),
            Json(LoginRequest {
                username: "admin".into(),
                password: "test-only".into(),
            }),
        )
        .await;
        assert!(matches!(result, Err(AppError::Unauthorized)));
        let response = logout(State(state.clone()), headers.clone()).await.unwrap();
        let cookie = response.headers()[header::SET_COOKIE].to_str().unwrap();
        assert!(
            cookie.contains("HttpOnly")
                && cookie.contains("Secure")
                && cookie.contains("Max-Age=0")
        );
        assert!(authenticated(&state, &headers).await.is_err());
    }
    #[test]
    fn cookie_writes_require_both_exact_origin_and_csrf() {
        let mut headers = HeaderMap::new();
        assert!(!csrf_valid(
            &headers,
            Some("https://blog.example"),
            "secret"
        ));
        headers.insert(header::ORIGIN, "https://blog.example".parse().unwrap());
        assert!(!csrf_valid(
            &headers,
            Some("https://blog.example"),
            "secret"
        ));
        headers.insert("x-csrf-token", "secret".parse().unwrap());
        assert!(csrf_valid(&headers, Some("https://blog.example"), "secret"));
        headers.insert(header::ORIGIN, "https://evil.example".parse().unwrap());
        assert!(!csrf_valid(
            &headers,
            Some("https://blog.example"),
            "secret"
        ));
        assert!(!csrf_valid(&headers, None, "secret"));
    }
}
