use std::{error::Error as StdError, fmt};

#[derive(Debug)]
pub enum Error {
    Invalid(String),
    NotFound(i64),
    Conflict,
    Busy,
    Database(rusqlite::Error),
    Internal(String),
}
pub type Result<T> = std::result::Result<T, Error>;
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Invalid(s) => write!(f, "输入不合法：{s}"),
            Self::NotFound(id) => write!(f, "任务 {id} 不存在"),
            Self::Conflict => write!(f, "版本已变化，请重新读取后再修改"),
            Self::Busy => write!(f, "服务繁忙，请稍后重试"),
            Self::Database(e) => write!(f, "数据库错误：{e}"),
            Self::Internal(s) => write!(f, "内部错误：{s}"),
        }
    }
}
impl StdError for Error {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        if let Self::Database(e) = self {
            Some(e)
        } else {
            None
        }
    }
}
impl From<rusqlite::Error> for Error {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e)
    }
}
