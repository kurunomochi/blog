use crate::{
    domain::NewTask,
    error::{Error, Result},
    service::Database,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
};
use tokio::{sync::mpsc, task::JoinHandle};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: u64,
    pub status: JobStatus,
    pub created_ids: Vec<i64>,
    pub error: Option<String>,
}
struct Request {
    id: u64,
    tasks: Vec<NewTask>,
}
#[derive(Clone)]
pub struct Jobs {
    sender: mpsc::Sender<Request>,
    records: Arc<Mutex<BTreeMap<u64, Job>>>,
    sequence: Arc<AtomicU64>,
}
impl Jobs {
    /// 队列最多 8 个待处理批次，单 worker；最多保留 256 条记录。
    /// 记录只在内存中，重启后清空；SQLite 已提交的任务会保留。
    pub fn start(database: Database) -> (Self, JoinHandle<()>) {
        let (sender, mut receiver) = mpsc::channel::<Request>(8);
        let records = Arc::new(Mutex::new(BTreeMap::<u64, Job>::new()));
        let worker_records = records.clone();
        let worker = tokio::spawn(async move {
            while let Some(request) = receiver.recv().await {
                if let Ok(mut records) = worker_records.lock() {
                    if let Some(job) = records.get_mut(&request.id) {
                        job.status = JobStatus::Running;
                    }
                }
                let result = database.call(move |repo| repo.import(request.tasks)).await;
                if let Ok(mut records) = worker_records.lock() {
                    if let Some(job) = records.get_mut(&request.id) {
                        match result {
                            Ok(tasks) => {
                                job.status = JobStatus::Succeeded;
                                job.created_ids = tasks.into_iter().map(|t| t.id).collect();
                            }
                            Err(error) => {
                                job.status = JobStatus::Failed;
                                job.error = Some(match error {
                                    Error::Database(_) | Error::Internal(_) => {
                                        "后台存储失败，请查看服务日志并核对数据库".into()
                                    }
                                    other => other.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        });
        (
            Self {
                sender,
                records,
                sequence: Arc::new(AtomicU64::new(1)),
            },
            worker,
        )
    }
    pub fn submit(&self, tasks: Vec<NewTask>) -> Result<Job> {
        if tasks.is_empty() || tasks.len() > 100 {
            return Err(Error::Invalid("任务数需为 1—100".into()));
        }
        let tasks = tasks
            .into_iter()
            .map(NewTask::validate)
            .collect::<Result<Vec<_>>>()?;
        let id = self
            .sequence
            .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |n| n.checked_add(1))
            .map_err(|_| Error::Internal("job ID 耗尽".into()))?;
        let job = Job {
            id,
            status: JobStatus::Queued,
            created_ids: vec![],
            error: None,
        };
        let mut records = self
            .records
            .lock()
            .map_err(|_| Error::Internal("job 锁已中毒".into()))?;
        if records.len() >= 256 {
            let old = records
                .iter()
                .find(|(_, j)| matches!(j.status, JobStatus::Succeeded | JobStatus::Failed))
                .map(|(id, _)| *id);
            if let Some(old) = old {
                records.remove(&old);
            } else {
                return Err(Error::Busy);
            }
        }
        records.insert(id, job.clone());
        if self.sender.try_send(Request { id, tasks }).is_err() {
            records.remove(&id);
            return Err(Error::Busy);
        }
        Ok(job)
    }
    pub fn get(&self, id: u64) -> Result<Job> {
        self.records
            .lock()
            .map_err(|_| Error::Internal("job 锁已中毒".into()))?
            .get(&id)
            .cloned()
            .ok_or(Error::NotFound(i64::try_from(id).unwrap_or(i64::MAX)))
    }
}
