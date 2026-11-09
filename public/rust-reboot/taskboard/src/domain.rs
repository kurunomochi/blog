use crate::error::{Error, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Todo,
    Doing,
    Done,
}
impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Todo => "todo",
            Self::Doing => "doing",
            Self::Done => "done",
        }
    }
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "todo" => Ok(Self::Todo),
            "doing" => Ok(Self::Doing),
            "done" => Ok(Self::Done),
            _ => Err(Error::Invalid("status 只能是 todo/doing/done".into())),
        }
    }
    pub fn allows(self, next: Self) -> bool {
        // 完成后如需再次进行，必须明确先重新打开为 Todo。
        self == next || !matches!((self, next), (Self::Done, Self::Doing))
    }
}
fn normal_priority() -> u8 {
    2
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NewTask {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "normal_priority")]
    pub priority: u8,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub due_at: Option<i64>,
}
impl NewTask {
    pub fn simple(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            description: String::new(),
            priority: 2,
            tags: vec![],
            due_at: None,
        }
    }
    pub fn validate(mut self) -> Result<Self> {
        self.title = self.title.trim().to_owned();
        if self.title.is_empty()
            || self.title.chars().count() > 120
            || self.title.chars().any(char::is_control)
        {
            return Err(Error::Invalid(
                "title 需为 1—120 个 Unicode 标量值，不含控制字符".into(),
            ));
        }
        if self.description.chars().count() > 4000 {
            return Err(Error::Invalid("description 最多 4000 个标量值".into()));
        }
        if !(1..=3).contains(&self.priority) {
            return Err(Error::Invalid("priority 必须为 1、2、3".into()));
        }
        if self.due_at.is_some_and(|t| t < 0) {
            return Err(Error::Invalid("due_at 必须为非负 Unix 秒数或 null".into()));
        }
        if self.tags.len() > 8 {
            return Err(Error::Invalid("最多 8 个标签".into()));
        }
        for tag in &mut self.tags {
            *tag = tag.trim().to_lowercase();
            if tag.is_empty() || tag.chars().count() > 24 || tag.chars().any(char::is_control) {
                return Err(Error::Invalid("标签长度应为 1—24 且不含控制字符".into()));
            }
        }
        self.tags.sort();
        self.tags.dedup();
        Ok(self)
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateTask {
    pub expected_version: i64,
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub priority: u8,
    #[serde(default)]
    pub tags: Vec<String>,
    pub status: Status,
    pub due_at: Option<i64>,
}
impl UpdateTask {
    pub fn from_task(task: &Task) -> Self {
        Self {
            expected_version: task.version,
            title: task.title.clone(),
            description: task.description.clone(),
            priority: task.priority,
            tags: task.tags.clone(),
            status: task.status,
            due_at: task.due_at,
        }
    }
    pub fn validated_values(&self) -> Result<NewTask> {
        if self.expected_version < 1 {
            return Err(Error::Invalid("expected_version 必须为正数".into()));
        }
        NewTask {
            title: self.title.clone(),
            description: self.description.clone(),
            priority: self.priority,
            tags: self.tags.clone(),
            due_at: self.due_at,
        }
        .validate()
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub priority: u8,
    pub status: Status,
    pub tags: Vec<String>,
    pub due_at: Option<i64>,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}
fn default_limit() -> i64 {
    20
}
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Filter {
    pub q: Option<String>,
    pub status: Option<Status>,
    pub priority: Option<u8>,
    pub tag: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}
impl Default for Filter {
    fn default() -> Self {
        Self {
            q: None,
            status: None,
            priority: None,
            tag: None,
            limit: 20,
            offset: 0,
        }
    }
}
impl Filter {
    pub fn validate(&self) -> Result<()> {
        if !(1..=100).contains(&self.limit) || !(0..=1_000_000).contains(&self.offset) {
            return Err(Error::Invalid(
                "limit 需为 1—100，offset 需为 0—1000000".into(),
            ));
        }
        if self.priority.is_some_and(|p| !(1..=3).contains(&p)) {
            return Err(Error::Invalid("priority 必须为 1—3".into()));
        }
        if self.q.as_ref().is_some_and(|q| q.len() > 512)
            || self.tag.as_ref().is_some_and(|t| t.len() > 128)
        {
            return Err(Error::Invalid("筛选文本过长".into()));
        }
        Ok(())
    }
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Stats {
    pub total: i64,
    pub todo: i64,
    pub doing: i64,
    pub done: i64,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
    pub id: i64,
    pub task_id: i64,
    pub action: String,
    pub at: i64,
}
