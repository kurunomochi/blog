use std::{env, net::SocketAddr, path::PathBuf};

pub struct Config {
    pub bind: SocketAddr,
    pub data_dir: PathBuf,
    pub public_dir: PathBuf,
    pub username: String,
    pub password: String,
    pub oauth: crate::oauth::OAuth,
}
impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir: PathBuf = env::var("BLOG_DATA_DIR")
            .unwrap_or_else(|_| "data".into())
            .into();
        let oauth_path = env::var_os("BLOG_OAUTH_CONFIG")
            .map(PathBuf::from)
            .unwrap_or_else(|| data_dir.join("auth-providers.json"));
        let oauth = crate::oauth::OAuth::load(&oauth_path)?;
        let password = env::var("BLOG_ADMIN_PASSWORD").unwrap_or_default();
        let username = env::var("BLOG_ADMIN_USERNAME").unwrap_or_else(|_| "admin".into());
        if oauth.password_enabled() && (password.trim().is_empty() || username.trim().is_empty()) {
            return Err(
                "密码登录启用时，请设置非空 BLOG_ADMIN_USERNAME / BLOG_ADMIN_PASSWORD".into(),
            );
        }
        Ok(Self {
            bind: env::var("BLOG_BIND")
                .unwrap_or_else(|_| "127.0.0.1:3000".into())
                .parse()?,
            data_dir,
            public_dir: env::var("BLOG_PUBLIC_DIR")
                .unwrap_or_else(|_| "public".into())
                .into(),
            username,
            password,
            oauth,
        })
    }
}
