// 综合项目：从 CLI 到 Taskboard
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch29
#[derive(Debug)]
struct Task {
    id: u64,
    title: String,
    done: bool,
}
fn main() {
    let mut tasks = vec![Task {
        id: 1,
        title: "复习借用".into(),
        done: false,
    }];
    tasks[0].done = true;
    let completed = tasks.iter().filter(|task| task.done).count();
    for task in &tasks {
        println!("{} {} {}", task.id, task.done, task.title);
    }
    println!("completed={completed}");
    // 完整实现位于 capstone/src/，包含存储、CLI 与错误处理。
}
