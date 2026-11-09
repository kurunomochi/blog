use rust_taskboard::{domain::*, error::Error, repository::Repository};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
static NEXT: AtomicU64 = AtomicU64::new(0);
struct Temporary(PathBuf);
impl Temporary {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!(
            "rust-taskboard-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&p).unwrap();
        Self(p)
    }
}
impl Drop for Temporary {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
#[test]
fn validates_and_normalizes() {
    let mut r = Repository::memory().unwrap();
    let mut input = NewTask::simple("  学习 Rust  ");
    input.tags = vec![" Rust ".into(), "rust".into(), "数据库".into()];
    let t = r.create(input).unwrap();
    assert_eq!(t.title, "学习 Rust");
    assert_eq!(t.tags, vec!["rust", "数据库"]);
    assert_eq!(t.version, 1);
    for name in [" ", "\n", "bad\tname"] {
        assert!(r.create(NewTask::simple(name)).is_err());
    }
    let mut bad = NewTask::simple("bad");
    bad.priority = 4;
    assert!(r.create(bad).is_err());
    assert_eq!(r.stats().unwrap().total, 1);
}
#[test]
fn full_update_has_optimistic_version() {
    let mut r = Repository::memory().unwrap();
    let t = r.create(NewTask::simple("draft")).unwrap();
    let mut edit = UpdateTask::from_task(&t);
    edit.title = "new".into();
    edit.tags = vec!["a".into()];
    edit.due_at = Some(100);
    let updated = r.update(t.id, edit.clone()).unwrap();
    assert_eq!(updated.version, 2);
    assert_eq!(updated.due_at, Some(100));
    assert!(matches!(r.update(t.id, edit), Err(Error::Conflict)));
    assert_eq!(r.get(t.id).unwrap().title, "new");
    let mut clear = UpdateTask::from_task(&updated);
    clear.due_at = None;
    clear.tags.clear();
    assert!(r.update(t.id, clear).unwrap().tags.is_empty());
}
#[test]
fn status_transition_and_delete_conflict() {
    let mut r = Repository::memory().unwrap();
    let t = r.create(NewTask::simple("task")).unwrap();
    let mut c = UpdateTask::from_task(&t);
    c.status = Status::Done;
    let done = r.update(t.id, c).unwrap();
    let mut c = UpdateTask::from_task(&done);
    c.status = Status::Doing;
    assert!(matches!(r.update(t.id, c), Err(Error::Invalid(_))));
    assert!(matches!(r.delete(t.id, 1), Err(Error::Conflict)));
    r.delete(t.id, done.version).unwrap();
    assert!(matches!(r.get(t.id), Err(Error::NotFound(_))));
    assert_eq!(r.events().unwrap()[0].action, "deleted");
    assert!(r.create(NewTask::simple("next")).unwrap().id > t.id);
}
#[test]
fn filter_pagination_and_sql_injection_are_data() {
    let mut r = Repository::memory().unwrap();
    for (title, priority) in [("Rust low", 1), ("Rust high", 3), ("Other", 2)] {
        let mut t = NewTask::simple(title);
        t.priority = priority;
        t.tags = vec!["study".into()];
        r.create(t).unwrap();
    }
    let page = r
        .list(Filter {
            q: Some("rust".into()),
            tag: Some("STUDY".into()),
            limit: 1,
            ..Default::default()
        })
        .unwrap();
    assert_eq!(page.total, 2);
    assert_eq!(page.items[0].title, "Rust high");
    assert_eq!(
        r.list(Filter {
            q: Some("' OR 1=1 --".into()),
            ..Default::default()
        })
        .unwrap()
        .total,
        0
    );
    assert!(
        r.list(Filter {
            limit: 0,
            ..Default::default()
        })
        .is_err()
    );
    assert!(
        r.list(Filter {
            offset: -1,
            ..Default::default()
        })
        .is_err()
    );
    assert!(
        r.list(Filter {
            offset: 100,
            ..Default::default()
        })
        .unwrap()
        .items
        .is_empty()
    );
}
#[test]
fn invalid_batch_is_all_or_nothing() {
    let mut r = Repository::memory().unwrap();
    assert!(
        r.import(vec![NewTask::simple("good"), NewTask::simple(" ")])
            .is_err()
    );
    assert_eq!(r.stats().unwrap().total, 0);
    assert!(r.events().unwrap().is_empty());
}
#[test]
fn persistence_across_connections_and_stale_writer() {
    let tmp = Temporary::new();
    let path = tmp.0.join("db.sqlite");
    let task;
    {
        let mut first = Repository::open(&path).unwrap();
        task = first.create(NewTask::simple("persisted")).unwrap();
    }
    {
        let mut a = Repository::open(&path).unwrap();
        let mut b = Repository::open(&path).unwrap();
        let old = b.get(task.id).unwrap();
        let mut edit = UpdateTask::from_task(&old);
        edit.title = "writer a".into();
        a.update(task.id, edit).unwrap();
        assert!(matches!(
            b.update(task.id, UpdateTask::from_task(&old)),
            Err(Error::Conflict)
        ));
        assert_eq!(b.get(task.id).unwrap().title, "writer a");
    }
}
#[test]
fn content_export_creates_fresh_todo_tasks() {
    let mut source = Repository::memory().unwrap();
    let task = source.create(NewTask::simple("exported")).unwrap();
    let mut update = UpdateTask::from_task(&task);
    update.status = Status::Done;
    source.update(task.id, update).unwrap();
    let json = serde_json::to_string(&source.export().unwrap()).unwrap();
    let mut destination = Repository::memory().unwrap();
    let imported = destination
        .import(serde_json::from_str(&json).unwrap())
        .unwrap();
    assert_eq!(imported[0].status, Status::Todo);
    assert_eq!(imported[0].version, 1);
    assert_eq!(imported[0].title, "exported");
}
