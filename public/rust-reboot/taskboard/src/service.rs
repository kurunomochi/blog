use crate::{
    error::{Error, Result},
    repository::Repository,
};
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;

/// rusqlite 是同步接口。锁只存在于阻塞工作线程中，不在 async 线程持锁等待。
#[derive(Clone)]
pub struct Database {
    inner: Arc<Mutex<Repository>>,
    slots: Arc<Semaphore>,
}
impl Database {
    pub fn new(repository: Repository) -> Self {
        Self {
            inner: Arc::new(Mutex::new(repository)),
            slots: Arc::new(Semaphore::new(32)),
        }
    }
    pub async fn call<F, T>(&self, operation: F) -> Result<T>
    where
        F: FnOnce(&mut Repository) -> Result<T> + Send + 'static,
        T: Send + 'static,
    {
        let permit = self
            .slots
            .clone()
            .try_acquire_owned()
            .map_err(|_| Error::Busy)?;
        let inner = self.inner.clone();
        tokio::task::spawn_blocking(move || {
            let _permit = permit; // 真实阻塞工作结束时才释放并发名额。
            let mut repository = inner
                .lock()
                .map_err(|_| Error::Internal("数据库锁已中毒".into()))?;
            operation(&mut repository)
        })
        .await
        .map_err(|e| Error::Internal(format!("数据库工作线程失败：{e}")))?
    }
}
