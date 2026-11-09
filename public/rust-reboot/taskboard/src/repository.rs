use crate::{
    domain::*,
    error::{Error, Result},
};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, named_params, params};
use std::{
    path::Path,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

pub struct Repository {
    connection: Connection,
}
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
impl Repository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        Self::initialize(Connection::open(path)?)
    }
    pub fn memory() -> Result<Self> {
        Self::initialize(Connection::open_in_memory()?)
    }
    fn initialize(mut connection: Connection) -> Result<Self> {
        connection.busy_timeout(Duration::from_secs(3))?;
        connection.pragma_update(None, "foreign_keys", "ON")?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        let version: i64 = connection.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version > 1 {
            return Err(Error::Invalid("数据库版本比程序新，拒绝降级写入".into()));
        }
        if version == 0 {
            let tx = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
            tx.execute_batch("CREATE TABLE tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
                description TEXT NOT NULL, priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 3),
                status TEXT NOT NULL CHECK(status IN ('todo','doing','done')),
                due_at INTEGER, version INTEGER NOT NULL CHECK(version > 0),
                created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
                CREATE TABLE task_tags (task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                    tag TEXT NOT NULL, PRIMARY KEY(task_id,tag));
                CREATE INDEX tags_lookup ON task_tags(tag,task_id);
                CREATE INDEX tasks_order ON tasks(priority DESC,id DESC);
                CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL,
                    action TEXT NOT NULL, at INTEGER NOT NULL);
                PRAGMA user_version=1;")?;
            tx.commit()?;
        }
        Ok(Self { connection })
    }
    pub fn create(&mut self, input: NewTask) -> Result<Task> {
        let input = input.validate()?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let task = insert(&tx, &input)?;
        tx.commit()?;
        Ok(task)
    }
    pub fn import(&mut self, inputs: Vec<NewTask>) -> Result<Vec<Task>> {
        if inputs.is_empty() || inputs.len() > 100 {
            return Err(Error::Invalid("导入数量需为 1—100".into()));
        }
        let inputs: Vec<_> = inputs
            .into_iter()
            .map(NewTask::validate)
            .collect::<Result<_>>()?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let mut created = Vec::with_capacity(inputs.len());
        for input in &inputs {
            created.push(insert(&tx, input)?);
        }
        tx.commit()?;
        Ok(created)
    }
    pub fn get(&mut self, id: i64) -> Result<Task> {
        let tx = self.connection.transaction()?;
        let task = get(&tx, id)?;
        tx.commit()?;
        Ok(task)
    }
    pub fn update(&mut self, id: i64, change: UpdateTask) -> Result<Task> {
        let input = change.validated_values()?;
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let old = get(&tx, id)?;
        if old.version != change.expected_version {
            return Err(Error::Conflict);
        }
        if !old.status.allows(change.status) {
            return Err(Error::Invalid("已完成任务必须先重新打开为 todo".into()));
        }
        let version = old
            .version
            .checked_add(1)
            .ok_or_else(|| Error::Invalid("版本号耗尽".into()))?;
        let changed = tx.execute(
            "UPDATE tasks SET title=?1,description=?2,priority=?3,status=?4,due_at=?5,
            version=?6,updated_at=?7 WHERE id=?8 AND version=?9",
            params![
                input.title,
                input.description,
                input.priority,
                change.status.as_str(),
                input.due_at,
                version,
                now(),
                id,
                change.expected_version
            ],
        )?;
        if changed != 1 {
            return Err(Error::Conflict);
        }
        tx.execute("DELETE FROM task_tags WHERE task_id=?1", [id])?;
        write_tags(&tx, id, &input.tags)?;
        event(&tx, id, "updated")?;
        let task = get(&tx, id)?;
        tx.commit()?;
        Ok(task)
    }
    pub fn delete(&mut self, id: i64, version: i64) -> Result<()> {
        if version < 1 {
            return Err(Error::Invalid("expected_version 必须为正数".into()));
        }
        let tx = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let task = get(&tx, id)?;
        if task.version != version {
            return Err(Error::Conflict);
        }
        tx.execute(
            "DELETE FROM tasks WHERE id=?1 AND version=?2",
            params![id, version],
        )?;
        event(&tx, id, "deleted")?;
        tx.commit()?;
        Ok(())
    }
    pub fn list(&mut self, filter: Filter) -> Result<Page<Task>> {
        filter.validate()?;
        let tx = self.connection.transaction()?; // total、任务和标签来自同一个读取快照。
        let status = filter.status.map(Status::as_str);
        let tag = filter.tag.map(|t| t.trim().to_lowercase());
        let predicate=" WHERE (:q IS NULL OR instr(lower(title),lower(:q))>0 OR instr(lower(description),lower(:q))>0)
            AND (:status IS NULL OR status=:status) AND (:priority IS NULL OR priority=:priority)
            AND (:tag IS NULL OR EXISTS(SELECT 1 FROM task_tags WHERE task_id=tasks.id AND tag=:tag))";
        let parameters =
            named_params! {":q":filter.q,":status":status,":priority":filter.priority,":tag":tag};
        let total = tx.query_row(
            &format!("SELECT count(*) FROM tasks{predicate}"),
            parameters,
            |r| r.get(0),
        )?;
        let mut statement=tx.prepare(&format!("SELECT id FROM tasks{predicate} ORDER BY priority DESC,id DESC LIMIT :limit OFFSET :offset"))?;
        let ids=statement.query_map(named_params!{":q":filter.q,":status":status,":priority":filter.priority,":tag":tag,":limit":filter.limit,":offset":filter.offset},|r|r.get::<_,i64>(0))?
            .collect::<std::result::Result<Vec<_>,_>>()?;
        drop(statement);
        let items = ids
            .into_iter()
            .map(|id| get(&tx, id))
            .collect::<Result<_>>()?;
        tx.commit()?;
        Ok(Page {
            items,
            total,
            limit: filter.limit,
            offset: filter.offset,
        })
    }
    pub fn stats(&self) -> Result<Stats> {
        Ok(self.connection.query_row("SELECT count(*),coalesce(sum(status='todo'),0),coalesce(sum(status='doing'),0),coalesce(sum(status='done'),0) FROM tasks",[],|r|Ok(Stats{total:r.get(0)?,todo:r.get(1)?,doing:r.get(2)?,done:r.get(3)?}))?)
    }
    pub fn events(&self) -> Result<Vec<Event>> {
        let mut statement = self
            .connection
            .prepare("SELECT id,task_id,action,at FROM events ORDER BY id DESC LIMIT 100")?;
        Ok(statement
            .query_map([], |r| {
                Ok(Event {
                    id: r.get(0)?,
                    task_id: r.get(1)?,
                    action: r.get(2)?,
                    at: r.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?)
    }
    /// 便携内容导出：故意不保留 ID、版本、状态和历史。导入会创建新的 Todo 任务。
    pub fn export(&mut self) -> Result<Vec<NewTask>> {
        let tx = self.connection.transaction()?;
        let mut statement = tx.prepare("SELECT id FROM tasks ORDER BY id")?;
        let ids = statement
            .query_map([], |r| r.get::<_, i64>(0))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        drop(statement);
        let result = ids
            .into_iter()
            .map(|id| {
                let t = get(&tx, id)?;
                Ok(NewTask {
                    title: t.title,
                    description: t.description,
                    priority: t.priority,
                    tags: t.tags,
                    due_at: t.due_at,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        tx.commit()?;
        Ok(result)
    }
}
fn write_tags(c: &Connection, id: i64, tags: &[String]) -> Result<()> {
    for tag in tags {
        c.execute(
            "INSERT INTO task_tags(task_id,tag) VALUES(?1,?2)",
            params![id, tag],
        )?;
    }
    Ok(())
}
fn event(c: &Connection, id: i64, action: &str) -> Result<()> {
    c.execute(
        "INSERT INTO events(task_id,action,at) VALUES(?1,?2,?3)",
        params![id, action, now()],
    )?;
    Ok(())
}
fn insert(c: &Connection, input: &NewTask) -> Result<Task> {
    let time = now();
    c.execute("INSERT INTO tasks(title,description,priority,status,due_at,version,created_at,updated_at) VALUES(?1,?2,?3,'todo',?4,1,?5,?5)",params![input.title,input.description,input.priority,input.due_at,time])?;
    let id = c.last_insert_rowid();
    write_tags(c, id, &input.tags)?;
    event(c, id, "created")?;
    get(c, id)
}
fn get(c: &Connection, id: i64) -> Result<Task> {
    let raw=c.query_row("SELECT id,title,description,priority,status,due_at,version,created_at,updated_at FROM tasks WHERE id=?1",[id],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,u8>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<i64>>(5)?,r.get::<_,i64>(6)?,r.get::<_,i64>(7)?,r.get::<_,i64>(8)?))).optional()?.ok_or(Error::NotFound(id))?;
    let mut statement = c.prepare("SELECT tag FROM task_tags WHERE task_id=?1 ORDER BY tag")?;
    let tags = statement
        .query_map([id], |r| r.get(0))?
        .collect::<std::result::Result<Vec<String>, _>>()?;
    Ok(Task {
        id: raw.0,
        title: raw.1,
        description: raw.2,
        priority: raw.3,
        status: Status::parse(&raw.4)?,
        due_at: raw.5,
        version: raw.6,
        created_at: raw.7,
        updated_at: raw.8,
        tags,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rollback_on_mid_batch_database_failure() {
        let mut repo = Repository::memory().unwrap();
        repo.connection.execute_batch("CREATE TRIGGER reject_bad BEFORE INSERT ON tasks WHEN NEW.title='reject' BEGIN SELECT RAISE(ABORT,'test failure'); END;").unwrap();
        assert!(
            repo.import(vec![NewTask::simple("first"), NewTask::simple("reject")])
                .is_err()
        );
        assert_eq!(repo.stats().unwrap().total, 0);
        assert!(repo.events().unwrap().is_empty());
    }
}
