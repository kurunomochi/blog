//! 学习用、单进程任务库。保存前备份；不提供崩溃原子性或并发写入保证。
use std::collections::HashSet;
use std::error::Error;
use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum TrailError {
    Io(io::Error),
    Invalid(String),
    Missing(u64),
    Exhausted,
}
impl fmt::Display for TrailError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(f, "文件操作失败：{error}"),
            Self::Invalid(message) => write!(f, "无效数据：{message}"),
            Self::Missing(id) => write!(f, "任务 {id} 不存在"),
            Self::Exhausted => write!(f, "任务 ID 已用尽"),
        }
    }
}
impl Error for TrailError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        if let Self::Io(error) = self {
            Some(error)
        } else {
            None
        }
    }
}
impl From<io::Error> for TrailError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}
type Result<T> = std::result::Result<T, TrailError>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Task {
    id: u64,
    title: String,
    done: bool,
}
impl Task {
    pub fn id(&self) -> u64 {
        self.id
    }
    pub fn title(&self) -> &str {
        &self.title
    }
    pub fn is_done(&self) -> bool {
        self.done
    }
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Store {
    next_id: u64,
    tasks: Vec<Task>,
}
impl Default for Store {
    fn default() -> Self {
        Self {
            next_id: 1,
            tasks: Vec::new(),
        }
    }
}

fn invalid(message: impl Into<String>) -> TrailError {
    TrailError::Invalid(message.into())
}
fn escape(text: &str) -> String {
    let mut output = String::new();
    for ch in text.chars() {
        match ch {
            '\\' => output.push_str("\\\\"),
            '\t' => output.push_str("\\t"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            _ => output.push(ch),
        }
    }
    output
}
fn unescape(text: &str) -> Result<String> {
    let mut output = String::new();
    let mut chars = text.chars();
    while let Some(ch) = chars.next() {
        if ch != '\\' {
            output.push(ch);
            continue;
        }
        output.push(match chars.next() {
            Some('\\') => '\\',
            Some('t') => '\t',
            Some('n') => '\n',
            Some('r') => '\r',
            Some(_) => return Err(invalid("未知转义")),
            None => return Err(invalid("不完整转义")),
        });
    }
    Ok(output)
}
pub fn backup_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_os_string();
    name.push(".bak");
    PathBuf::from(name)
}
impl Store {
    pub fn tasks(&self) -> &[Task] {
        &self.tasks
    }
    pub fn add(&mut self, title: &str) -> Result<u64> {
        let title = title.trim();
        if title.is_empty() {
            return Err(invalid("标题不能为空"));
        }
        let next = self.next_id.checked_add(1).ok_or(TrailError::Exhausted)?;
        let id = self.next_id;
        self.tasks.push(Task {
            id,
            title: title.to_owned(),
            done: false,
        });
        self.next_id = next;
        Ok(id)
    }
    /// 返回 true 表示状态改变，false 表示原来已完成。
    pub fn complete(&mut self, id: u64) -> Result<bool> {
        let task = self
            .tasks
            .iter_mut()
            .find(|task| task.id == id)
            .ok_or(TrailError::Missing(id))?;
        let changed = !task.done;
        task.done = true;
        Ok(changed)
    }
    pub fn remove(&mut self, id: u64) -> Result<Task> {
        let index = self
            .tasks
            .iter()
            .position(|task| task.id == id)
            .ok_or(TrailError::Missing(id))?;
        Ok(self.tasks.remove(index))
    }
    pub fn find(&self, query: &str) -> Vec<&Task> {
        let query = query.to_lowercase();
        self.tasks
            .iter()
            .filter(|task| task.title.to_lowercase().contains(&query))
            .collect()
    }
    /// (总数, 完成数)
    pub fn stats(&self) -> (usize, usize) {
        (
            self.tasks.len(),
            self.tasks.iter().filter(|task| task.done).count(),
        )
    }
    pub fn encode(&self) -> String {
        let mut output = format!("RUST-TRAIL\t1\t{}\n", self.next_id);
        for task in &self.tasks {
            output.push_str(&format!(
                "{}\t{}\t{}\n",
                task.id,
                u8::from(task.done),
                escape(&task.title)
            ));
        }
        output
    }
    pub fn decode(text: &str) -> Result<Self> {
        let mut lines = text.lines();
        let header: Vec<_> = lines
            .next()
            .ok_or_else(|| invalid("缺少文件头"))?
            .split('\t')
            .collect();
        if header.len() != 3 || header[0] != "RUST-TRAIL" || header[1] != "1" {
            return Err(invalid("文件头或版本不支持"));
        }
        let next_id: u64 = header[2].parse().map_err(|_| invalid("next_id 非法"))?;
        if next_id == 0 {
            return Err(invalid("next_id 必须大于零"));
        }
        let mut seen = HashSet::new();
        let mut tasks = Vec::new();
        for (index, line) in lines.enumerate() {
            let fields: Vec<_> = line.split('\t').collect();
            if fields.len() != 3 {
                return Err(invalid(format!("第 {} 行字段数错误", index + 2)));
            }
            let id: u64 = fields[0]
                .parse()
                .map_err(|_| invalid(format!("第 {} 行 ID 非法", index + 2)))?;
            if id == 0 || id >= next_id || !seen.insert(id) {
                return Err(invalid("ID 为零、重复或超过 next_id"));
            }
            let done = match fields[1] {
                "0" => false,
                "1" => true,
                _ => return Err(invalid("未知完成状态")),
            };
            let title = unescape(fields[2])?;
            if title.trim().is_empty() {
                return Err(invalid("标题不能为空"));
            }
            tasks.push(Task { id, done, title });
        }
        Ok(Self { next_id, tasks })
    }
    pub fn load(path: &Path) -> Result<Self> {
        match fs::read_to_string(path) {
            Ok(text) => Self::decode(&text),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Self::default()),
            Err(error) => Err(error.into()),
        }
    }
    /// 学习版本：先复制备份，再写原文件。备份失败停止保存。
    /// 不支持并发进程，也不保证崩溃时原子替换；不要存重要数据。
    pub fn save(&self, path: &Path) -> Result<()> {
        match fs::metadata(path) {
            Ok(_) => {
                fs::copy(path, backup_path(path))?;
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        fs::write(path, self.encode())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn add_complete_remove_and_stats() {
        let mut store = Store::default();
        assert!(store.add(" \t").is_err());
        let id = store.add(" Rust ").unwrap();
        assert_eq!(id, 1);
        assert_eq!(store.tasks()[0].title(), "Rust");
        assert!(store.complete(id).unwrap());
        assert!(!store.complete(id).unwrap());
        assert_eq!(store.stats(), (1, 1));
        assert_eq!(store.find("rUsT").len(), 1);
        assert_eq!(store.remove(id).unwrap().id(), id);
        assert!(matches!(store.remove(id), Err(TrailError::Missing(1))));
        assert_eq!(store.add("next").unwrap(), 2);
    }
    #[test]
    fn encoding_round_trip() {
        let mut store = Store::default();
        store.add("你好\tRust\n路径\\new\rline 🦀").unwrap();
        store.complete(1).unwrap();
        assert_eq!(Store::decode(&store.encode()).unwrap(), store);
        assert_eq!(
            Store::decode(&Store::default().encode()).unwrap(),
            Store::default()
        );
    }
    #[test]
    fn reject_corruption() {
        for text in [
            "",
            "junk",
            "RUST-TRAIL\t2\t1\n",
            "RUST-TRAIL\t1\t0\n",
            "RUST-TRAIL\t1\t2\n1\t0\ta\n1\t1\tb\n",
            "RUST-TRAIL\t1\t2\n1\t9\ta\n",
            "RUST-TRAIL\t1\t2\n1\t0\tbad\\q\n",
            "RUST-TRAIL\t1\t1\n1\t0\ta\n",
            "RUST-TRAIL\t1\t2\n1\t0\t\n",
            "RUST-TRAIL\t1\t2\n1\t0\tbad\\\n",
        ] {
            assert!(Store::decode(text).is_err(), "accepted {text:?}");
        }
    }
    #[test]
    fn exhaustion_leaves_store_unchanged() {
        let mut store = Store {
            next_id: u64::MAX,
            tasks: vec![],
        };
        let original = store.clone();
        assert!(matches!(store.add("x"), Err(TrailError::Exhausted)));
        assert_eq!(store, original);
    }
}
