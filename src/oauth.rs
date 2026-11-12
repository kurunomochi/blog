use crate::{SharedState, auth, error::AppError};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, header},
    response::{IntoResponse, Redirect, Response},
    routing::get,
};
use oauth2::{
    AuthType, AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointNotSet,
    EndpointSet, PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, TokenResponse, TokenUrl,
    basic::BasicClient,
};
use serde::Deserialize;
use std::{
    collections::HashMap,
    path::Path as FilePath,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

const FLOW_COOKIE: &str = "__Host-blog-oauth";
pub const SESSION_COOKIE: &str = "__Host-blog-session";
const FLOW_SECONDS: u64 = 600;
type Client = BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Settings {
    pub origin: String,
    #[serde(default)]
    pub allow_password_login: bool,
    pub github: Option<GithubSettings>,
    pub google: Option<GoogleSettings>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GithubSettings {
    client_id: String,
    client_secret: String,
    allowed_user_id: u64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GoogleSettings {
    client_id: String,
    client_secret: String,
    allowed_email: String,
    allowed_sub: Option<String>,
}
pub struct OAuth {
    pub settings: Option<Settings>,
    http: reqwest::Client,
    pending: Mutex<HashMap<String, Pending>>,
}
struct Pending {
    provider: String,
    verifier: PkceCodeVerifier,
    return_to: String,
    created: Instant,
}

impl OAuth {
    pub fn load(path: &FilePath) -> Result<Self, Box<dyn std::error::Error>> {
        let settings: Option<Settings> = match std::fs::read(path) {
            Ok(bytes) => {
                Some(serde_json::from_slice(&bytes).map_err(|_| "授权登录配置 JSON 无效")?)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
            Err(_) => return Err("无法读取授权登录配置".into()),
        };
        if let Some(value) = &settings {
            value.validate()?;
        }
        Ok(Self {
            settings,
            http: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(20))
                .user_agent("kurumochi-blog-auth")
                .build()?,
            pending: Mutex::new(HashMap::new()),
        })
    }
    pub fn password_enabled(&self) -> bool {
        self.settings
            .as_ref()
            .is_none_or(|s| s.allow_password_login)
    }
    pub fn origin(&self) -> Option<&str> {
        self.settings.as_ref().map(|s| s.origin.as_str())
    }
    fn client(&self, provider: &str) -> Result<Client, AppError> {
        let settings = self.settings.as_ref().ok_or(AppError::NotFound)?;
        let (id, secret, auth, token) = match provider {
            "github" => {
                let p = settings.github.as_ref().ok_or(AppError::NotFound)?;
                (
                    &p.client_id,
                    &p.client_secret,
                    "https://github.com/login/oauth/authorize",
                    "https://github.com/login/oauth/access_token",
                )
            }
            "google" => {
                let p = settings.google.as_ref().ok_or(AppError::NotFound)?;
                (
                    &p.client_id,
                    &p.client_secret,
                    "https://accounts.google.com/o/oauth2/v2/auth",
                    "https://oauth2.googleapis.com/token",
                )
            }
            _ => return Err(AppError::NotFound),
        };
        Ok(BasicClient::new(ClientId::new(id.clone()))
            .set_client_secret(ClientSecret::new(secret.clone()))
            .set_auth_uri(AuthUrl::new(auth.into()).map_err(|_| AppError::Internal)?)
            .set_token_uri(TokenUrl::new(token.into()).map_err(|_| AppError::Internal)?)
            .set_auth_type(AuthType::RequestBody)
            .set_redirect_uri(
                RedirectUrl::new(format!("{}/api/auth/{provider}/callback", settings.origin))
                    .map_err(|_| AppError::Internal)?,
            ))
    }
}
impl Settings {
    fn validate(&self) -> Result<(), &'static str> {
        let url = reqwest::Url::parse(&self.origin).map_err(|_| "授权 origin 无效")?;
        if url.scheme() != "https"
            || url.host_str().is_none()
            || url.origin().ascii_serialization() != self.origin
        {
            return Err("授权 origin 必须是 HTTPS 域名，不能含路径、账号、查询或尾部斜杠");
        }
        if self.github.is_none() && self.google.is_none() {
            return Err("至少配置一个授权登录提供方");
        }
        if let Some(p) = &self.github
            && (p.client_id.trim().is_empty()
                || p.client_secret.trim().is_empty()
                || p.allowed_user_id == 0)
        {
            return Err("GitHub 授权配置不完整");
        }
        if let Some(p) = &self.google
            && (p.client_id.trim().is_empty()
                || p.client_secret.trim().is_empty()
                || !p.allowed_email.contains('@')
                || p.allowed_email.trim() != p.allowed_email
                || p.allowed_sub.as_ref().is_some_and(|v| v.is_empty()))
        {
            return Err("Google 授权配置不完整");
        }
        Ok(())
    }
}
pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/auth/providers", get(providers))
        .route("/auth/{provider}/start", get(start))
        .route("/auth/{provider}/callback", get(callback))
}
async fn providers(State(state): State<SharedState>) -> Json<serde_json::Value> {
    Json(
        serde_json::json!({"github": state.oauth.settings.as_ref().is_some_and(|s| s.github.is_some()), "google": state.oauth.settings.as_ref().is_some_and(|s| s.google.is_some()), "password": state.oauth.password_enabled()}),
    )
}
#[derive(Deserialize)]
struct StartQuery {
    return_to: Option<String>,
}
pub fn safe_return(value: Option<&str>) -> &str {
    match value {
        Some("/studio.html") => "/studio.html",
        Some("/admin.html?module=reviews") => "/admin.html?module=reviews",
        Some("/admin.html?module=weekly") => "/admin.html?module=weekly",
        _ => "/admin.html",
    }
}
async fn start(
    State(state): State<SharedState>,
    Path(provider): Path<String>,
    Query(query): Query<StartQuery>,
) -> Result<Response, AppError> {
    let client = state.oauth.client(&provider)?;
    let mut pending = state.oauth.pending.lock().await;
    pending.retain(|_, flow| flow.created.elapsed().as_secs() < FLOW_SECONDS);
    if pending.len() >= 100 {
        return Err(AppError::TooManyRequests);
    }
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let mut request = client
        .authorize_url(CsrfToken::new_random)
        .set_pkce_challenge(challenge);
    if provider == "google" {
        request = request
            .add_scope(Scope::new("openid".into()))
            .add_scope(Scope::new("email".into()))
            .add_extra_param("prompt", "select_account");
    } else {
        request = request.add_extra_param("allow_signup", "false");
    }
    let (url, csrf) = request.url();
    pending.insert(
        csrf.secret().clone(),
        Pending {
            provider,
            verifier,
            return_to: safe_return(query.return_to.as_deref()).into(),
            created: Instant::now(),
        },
    );
    let mut response = Redirect::to(url.as_str()).into_response();
    set_cookie(&mut response, FLOW_COOKIE, csrf.secret(), FLOW_SECONDS);
    response
        .headers_mut()
        .insert(header::REFERRER_POLICY, "no-referrer".parse().unwrap());
    Ok(response)
}
#[derive(Deserialize)]
struct CallbackQuery {
    state: Option<String>,
    code: Option<String>,
    error: Option<String>,
}
async fn callback(
    State(state): State<SharedState>,
    Path(provider): Path<String>,
    headers: HeaderMap,
    Query(query): Query<CallbackQuery>,
) -> Response {
    // A state value alone is insufficient: it must belong to this browser and provider.
    let Some(csrf) = query.state.filter(|s| s.len() <= 256) else {
        return failure("/admin.html", "invalid_state");
    };
    if !cookie(&headers, FLOW_COOKIE).is_some_and(|value| auth::secret_eq(value, &csrf)) {
        return failure("/admin.html", "invalid_state");
    }
    let flow = {
        let mut pending = state.oauth.pending.lock().await;
        pending.retain(|_, flow| flow.created.elapsed().as_secs() < FLOW_SECONDS);
        if !pending
            .get(&csrf)
            .is_some_and(|flow| flow.provider == provider)
        {
            return failure("/admin.html", "invalid_state");
        }
        pending.remove(&csrf).unwrap()
    };
    if query.error.is_some() {
        return failure(&flow.return_to, "cancelled");
    }
    let Some(code) = query.code.filter(|s| !s.is_empty() && s.len() <= 4096) else {
        return failure(&flow.return_to, "failed");
    };
    let result = authenticate(&state.oauth, &provider, code, flow.verifier).await;
    match result {
        Ok(true) => {
            let session = auth::issue_session(&state).await;
            let mut response = Redirect::to(&flow.return_to).into_response();
            set_cookie(
                &mut response,
                SESSION_COOKIE,
                &session.token,
                auth::SESSION_SECONDS,
            );
            set_cookie(&mut response, FLOW_COOKIE, "", 0);
            response
        }
        Ok(false) => failure(&flow.return_to, "denied"),
        Err(_) => failure(&flow.return_to, "failed"),
    }
}
#[derive(Deserialize)]
struct GithubUser {
    id: u64,
}
#[derive(Deserialize)]
struct GoogleUser {
    sub: String,
    email: String,
    email_verified: bool,
}
fn google_allowed(user: &GoogleUser, settings: &GoogleSettings) -> bool {
    user.email_verified
        && !user.sub.is_empty()
        && user.email.eq_ignore_ascii_case(&settings.allowed_email)
        && settings
            .allowed_sub
            .as_ref()
            .is_none_or(|sub| sub == &user.sub)
}
async fn authenticate(
    oauth: &OAuth,
    provider: &str,
    code: String,
    verifier: PkceCodeVerifier,
) -> Result<bool, ()> {
    let token = oauth
        .client(provider)
        .map_err(|_| ())?
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(verifier)
        .request_async(&oauth.http)
        .await
        .map_err(|_| ())?;
    let settings = oauth.settings.as_ref().ok_or(())?;
    // User identity is fetched using only this server's freshly exchanged access token.
    // Browser-supplied tokens/claims are never accepted; no ID token is decoded as proof.
    if provider == "github" {
        let user: GithubUser = oauth
            .http
            .get("https://api.github.com/user")
            .bearer_auth(token.access_token().secret())
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .map_err(|_| ())?
            .error_for_status()
            .map_err(|_| ())?
            .json()
            .await
            .map_err(|_| ())?;
        Ok(user.id == settings.github.as_ref().ok_or(())?.allowed_user_id)
    } else {
        let user: GoogleUser = oauth
            .http
            .get("https://openidconnect.googleapis.com/v1/userinfo")
            .bearer_auth(token.access_token().secret())
            .send()
            .await
            .map_err(|_| ())?
            .error_for_status()
            .map_err(|_| ())?
            .json()
            .await
            .map_err(|_| ())?;
        Ok(google_allowed(&user, settings.google.as_ref().ok_or(())?))
    }
}
fn failure(target: &str, reason: &str) -> Response {
    let separator = if target.contains('?') { '&' } else { '?' };
    let mut response =
        Redirect::to(&format!("{target}{separator}auth_error={reason}")).into_response();
    set_cookie(&mut response, FLOW_COOKIE, "", 0);
    response
}
pub fn cookie<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(';'))
        .find_map(|part| {
            let (key, value) = part.trim().split_once('=')?;
            (key == name).then_some(value)
        })
}
pub fn set_cookie(response: &mut Response, name: &str, value: &str, seconds: u64) {
    let value =
        format!("{name}={value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age={seconds}");
    response.headers_mut().append(
        header::SET_COOKIE,
        value.parse().expect("generated cookie is valid"),
    );
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    pub(crate) fn state() -> SharedState {
        use crate::{AppState, models};
        use std::{path::PathBuf, sync::Arc};
        use tokio::sync::RwLock;
        Arc::new(AppState {
            posts: RwLock::new(vec![]),
            works: RwLock::new(vec![]),
            sessions: RwLock::new(vec![]),
            login_attempts: Mutex::new(vec![]),
            data_file: PathBuf::new(),
            works_file: PathBuf::new(),
            uploads_dir: PathBuf::new(),
            admin_username: "admin".into(),
            admin_password: "test-only".into(),
            models: models::ModelService::new(PathBuf::new()),
            oauth: OAuth {
                settings: Some(Settings {
                    origin: "https://blog.example".into(),
                    allow_password_login: false,
                    github: Some(GithubSettings {
                        client_id: "test-id".into(),
                        client_secret: "test-secret".into(),
                        allowed_user_id: 1,
                    }),
                    google: Some(GoogleSettings {
                        client_id: "test-google".into(),
                        client_secret: "test-secret".into(),
                        allowed_email: "owner@gmail.com".into(),
                        allowed_sub: None,
                    }),
                }),
                http: reqwest::Client::new(),
                pending: Mutex::new(HashMap::new()),
            },
        })
    }
    #[tokio::test]
    async fn oauth_state_is_browser_bound_provider_bound_and_single_use() {
        let state = state();
        let response = start(
            State(state.clone()),
            Path("github".into()),
            Query(StartQuery {
                return_to: Some("/admin.html?module=weekly".into()),
            }),
        )
        .await
        .unwrap();
        let location =
            reqwest::Url::parse(response.headers()[header::LOCATION].to_str().unwrap()).unwrap();
        let params: HashMap<_, _> = location.query_pairs().into_owned().collect();
        assert_eq!(params["code_challenge_method"], "S256");
        assert_eq!(
            params["redirect_uri"],
            "https://blog.example/api/auth/github/callback"
        );
        assert!(!params.contains_key("client_secret"));
        assert!(!params.contains_key("scope"));
        let csrf = params["state"].clone();
        let mut headers = HeaderMap::new();
        let query = || {
            Query(CallbackQuery {
                state: Some(csrf.clone()),
                code: None,
                error: Some("access_denied".into()),
            })
        };
        let response = callback(
            State(state.clone()),
            Path("github".into()),
            headers.clone(),
            query(),
        )
        .await;
        assert!(
            response.headers()[header::LOCATION]
                .to_str()
                .unwrap()
                .contains("invalid_state")
        );
        assert_eq!(state.oauth.pending.lock().await.len(), 1);
        headers.insert(
            header::COOKIE,
            format!("{FLOW_COOKIE}={csrf}").parse().unwrap(),
        );
        let response = callback(
            State(state.clone()),
            Path("google".into()),
            headers.clone(),
            query(),
        )
        .await;
        assert!(
            response.headers()[header::LOCATION]
                .to_str()
                .unwrap()
                .contains("invalid_state")
        );
        let response = callback(
            State(state.clone()),
            Path("github".into()),
            headers.clone(),
            query(),
        )
        .await;
        assert_eq!(
            response.headers()[header::LOCATION],
            "/admin.html?module=weekly&auth_error=cancelled"
        );
        assert!(state.oauth.pending.lock().await.is_empty());
        let response = callback(
            State(state.clone()),
            Path("github".into()),
            headers,
            query(),
        )
        .await;
        assert!(
            response.headers()[header::LOCATION]
                .to_str()
                .unwrap()
                .contains("invalid_state")
        );
        assert!(state.sessions.read().await.is_empty());
    }
    #[tokio::test]
    async fn google_requests_only_identity_scopes_and_expired_flows_are_rejected() {
        let state = state();
        let response = start(
            State(state.clone()),
            Path("google".into()),
            Query(StartQuery {
                return_to: Some("https://evil.example".into()),
            }),
        )
        .await
        .unwrap();
        let location =
            reqwest::Url::parse(response.headers()[header::LOCATION].to_str().unwrap()).unwrap();
        let params: HashMap<_, _> = location.query_pairs().into_owned().collect();
        assert_eq!(params["scope"], "openid email");
        let csrf = params["state"].clone();
        {
            let mut pending = state.oauth.pending.lock().await;
            let flow = pending.get_mut(&csrf).unwrap();
            assert_eq!(flow.return_to, "/admin.html");
            flow.created = Instant::now() - Duration::from_secs(601);
        }
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            format!("{FLOW_COOKIE}={csrf}").parse().unwrap(),
        );
        let response = callback(
            State(state.clone()),
            Path("google".into()),
            headers,
            Query(CallbackQuery {
                state: Some(csrf),
                code: None,
                error: Some("access_denied".into()),
            }),
        )
        .await;
        assert!(
            response.headers()[header::LOCATION]
                .to_str()
                .unwrap()
                .contains("invalid_state")
        );
        assert!(state.oauth.pending.lock().await.is_empty());
    }
    #[test]
    fn returns_are_restricted_to_admin_pages() {
        for target in [
            "https://evil.test",
            "//evil.test",
            "/\\evil.test",
            "/admin.html?next=https://evil.test",
            "/api/posts",
        ] {
            assert_eq!(safe_return(Some(target)), "/admin.html");
        }
        assert_eq!(
            safe_return(Some("/admin.html?module=weekly")),
            "/admin.html?module=weekly"
        );
    }
    #[test]
    fn google_requires_verified_allowlisted_identity() {
        let settings = GoogleSettings {
            client_id: "a".into(),
            client_secret: "b".into(),
            allowed_email: "owner@gmail.com".into(),
            allowed_sub: Some("123".into()),
        };
        let mut user = GoogleUser {
            sub: "123".into(),
            email: "owner@gmail.com".into(),
            email_verified: true,
        };
        assert!(google_allowed(&user, &settings));
        user.email_verified = false;
        assert!(!google_allowed(&user, &settings));
        user.email_verified = true;
        user.email = "other@gmail.com".into();
        assert!(!google_allowed(&user, &settings));
        user.email = "owner@gmail.com".into();
        user.sub = "456".into();
        assert!(!google_allowed(&user, &settings));
    }
    #[test]
    fn origin_and_credentials_fail_closed() {
        let mut settings = Settings {
            origin: "https://blog.example".into(),
            allow_password_login: false,
            github: Some(GithubSettings {
                client_id: "id".into(),
                client_secret: "secret".into(),
                allowed_user_id: 1,
            }),
            google: None,
        };
        assert!(settings.validate().is_ok());
        for origin in [
            "http://blog.example",
            "https://blog.example/path",
            "https://user:pass@blog.example",
            "https://blog.example/",
        ] {
            settings.origin = origin.into();
            assert!(settings.validate().is_err());
        }
    }
}
