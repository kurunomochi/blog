use rust_trail::{Store, Task};
use std::env;
use std::error::Error;
use std::path::PathBuf;
use std::process::ExitCode;

const HELP: &str = "Rust Trail · Rust 复习任务管理器
用法：rust-trail [--file 路径] <命令> [参数]
  add <标题...>      添加任务
  list               列出任务
  done <ID>          标记完成
  remove <ID>        删除任务
  find <关键词...>   不区分大小写搜索
  stats              显示统计
  help               显示帮助
默认数据文件：当前目录 rust-trail.db
仅供单进程学习使用；保存前备份到原路径加 .bak。";
fn print_task(task: &Task) {
    let title: String = task
        .title()
        .chars()
        .map(|ch| {
            if ch.is_control() {
                ch.escape_default().to_string()
            } else {
                ch.to_string()
            }
        })
        .collect();
    println!(
        "{:>4} [{}] {title}",
        task.id(),
        if task.is_done() { "x" } else { " " }
    );
}
fn run() -> Result<(), Box<dyn Error>> {
    let mut raw: Vec<_> = env::args_os().skip(1).collect();
    let path = if raw.first().is_some_and(|arg| arg == "--file") {
        if raw.len() < 2 {
            return Err("--file 后需要路径".into());
        }
        let path = PathBuf::from(raw.remove(1));
        raw.remove(0);
        path
    } else {
        PathBuf::from("rust-trail.db")
    };
    let args: Vec<String> = raw
        .into_iter()
        .map(|arg| arg.into_string().map_err(|_| "命令及文本参数必须为 UTF-8"))
        .collect::<Result<_, _>>()?;
    let command = args.first().map(String::as_str).unwrap_or("help");
    let rest = &args[usize::from(!args.is_empty())..];
    if matches!(command, "help" | "--help" | "-h") {
        println!("{HELP}");
        return Ok(());
    }
    // 先验证命令形状，再读取或写入数据库。
    match command {
        "list" | "stats" if rest.is_empty() => {}
        "add" | "find" if !rest.is_empty() => {}
        "done" | "remove" if rest.len() == 1 => {}
        _ => return Err(format!("未知命令或参数数量错误：{command}；使用 help 查看用法").into()),
    }
    let mut store = Store::load(&path)?;
    match command {
        "add" => {
            let id = store.add(&rest.join(" "))?;
            store.save(&path)?;
            println!("已添加 #{id}");
        }
        "list" => {
            if store.tasks().is_empty() {
                println!("暂无任务");
            }
            for task in store.tasks() {
                print_task(task);
            }
        }
        "done" => {
            let id = rest[0].parse()?;
            if store.complete(id)? {
                store.save(&path)?;
                println!("已完成 #{id}");
            } else {
                println!("#{id} 已经完成");
            }
        }
        "remove" => {
            let id = rest[0].parse()?;
            store.remove(id)?;
            store.save(&path)?;
            println!("已删除 #{id}");
        }
        "find" => {
            let found = store.find(&rest.join(" "));
            println!("找到 {} 项", found.len());
            for task in found {
                print_task(task);
            }
        }
        "stats" => {
            let (total, done) = store.stats();
            println!("总数 {total} · 完成 {done} · 待办 {}", total - done);
        }
        _ => unreachable!("命令已验证"),
    }
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("错误：{error}");
            ExitCode::FAILURE
        }
    }
}
