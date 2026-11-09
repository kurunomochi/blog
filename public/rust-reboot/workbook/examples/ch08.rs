// 枚举、Option 与模式匹配
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch08
enum Job {
    Queued,
    Running(u32),
    Done(String),
}
fn describe(job: &Job) -> String {
    match job {
        Job::Queued => "waiting".to_owned(),
        Job::Running(percent) => format!("{percent}%"),
        Job::Done(path) => format!("saved: {path}"),
    }
}
fn main() {
    for job in [Job::Queued, Job::Running(50), Job::Done("notes.txt".into())] {
        println!("{}", describe(&job));
    }
    let title = Some(String::from("Rust"));
    assert_eq!(title.as_deref(), Some("Rust"));
}
