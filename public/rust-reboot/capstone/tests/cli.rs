use rust_trail::{Store, backup_path};
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::atomic::{AtomicU64, Ordering};
static SERIAL: AtomicU64 = AtomicU64::new(0);
struct Temp(PathBuf);
impl Temp {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "rust-trail-test-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            SERIAL.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn file(&self) -> PathBuf {
        self.0.join("tasks.db")
    }
    fn run(&self, args: &[&str]) -> Output {
        Command::new(env!("CARGO_BIN_EXE_rust-trail"))
            .arg("--file")
            .arg(self.file())
            .args(args)
            .output()
            .unwrap()
    }
}
impl Drop for Temp {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
#[test]
fn cli_restart_backup_and_non_reused_ids() {
    let temp = Temp::new();
    assert!(temp.run(&["add", "复习 Rust"]).status.success());
    let original = fs::read_to_string(temp.file()).unwrap();
    assert!(temp.run(&["done", "1"]).status.success());
    assert_eq!(
        fs::read_to_string(backup_path(&temp.file())).unwrap(),
        original
    );
    let out = temp.run(&["stats"]);
    assert!(out.status.success());
    assert!(String::from_utf8_lossy(&out.stdout).contains("完成 1"));
    assert!(Store::load(&temp.file()).unwrap().tasks()[0].is_done());
    assert!(temp.run(&["remove", "1"]).status.success());
    assert!(temp.run(&["add", "next"]).status.success());
    assert_eq!(Store::load(&temp.file()).unwrap().tasks()[0].id(), 2);
}
#[test]
fn invalid_input_and_corrupt_file_do_not_write() {
    let temp = Temp::new();
    assert!(!temp.run(&["add", " "]).status.success());
    assert!(!temp.file().exists());
    assert!(!temp.run(&["done", "abc"]).status.success());
    assert!(!temp.run(&["unknown"]).status.success());
    fs::write(temp.file(), "corrupt data").unwrap();
    assert!(!temp.run(&["add", "must not overwrite"]).status.success());
    assert_eq!(fs::read_to_string(temp.file()).unwrap(), "corrupt data");
}
#[test]
fn missing_id_and_find() {
    let temp = Temp::new();
    assert!(temp.run(&["add", "Borrow Rust"]).status.success());
    assert!(!temp.run(&["done", "99"]).status.success());
    assert!(String::from_utf8_lossy(&temp.run(&["find", "rUsT"]).stdout).contains("找到 1 项"));
}
