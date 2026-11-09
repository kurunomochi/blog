use rust_taskboard::{
    api::{AppState, router},
    jobs::Jobs,
    repository::Repository,
    service::Database,
};
use std::{env, net::SocketAddr, path::PathBuf};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::var_os("TASKBOARD_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|| "taskboard.sqlite".into());
    let address: SocketAddr = env::var("TASKBOARD_BIND")
        .unwrap_or_else(|_| "127.0.0.1:4318".into())
        .parse()?;
    if !address.ip().is_loopback() {
        return Err("学习服务没有认证，只允许绑定回环地址".into());
    }
    let database = Database::new(Repository::open(&path)?);
    let (jobs, worker) = Jobs::start(database.clone());
    let app = router(AppState {
        database,
        jobs: jobs.clone(),
    });
    let listener = tokio::net::TcpListener::bind(address).await?;
    println!("Rust Taskboard: http://{}", listener.local_addr()?);
    println!("SQLite: {}", path.display());
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    // HTTP 已停止接收请求并完成在途请求；丢弃最后一个 sender 后排空 worker。
    drop(jobs);
    worker.await?;
    Ok(())
}
