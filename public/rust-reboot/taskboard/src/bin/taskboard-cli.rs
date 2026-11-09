use rust_taskboard::{
    domain::{Filter, NewTask, Status, UpdateTask},
    repository::Repository,
};
use std::{env, error::Error, fs, path::PathBuf, process::ExitCode};

fn run() -> Result<(), Box<dyn Error>> {
    let mut raw: Vec<_> = env::args_os().skip(1).collect();
    let path = if raw.first().is_some_and(|x| x == "--db") {
        if raw.len() < 2 {
            return Err("--db 需要路径".into());
        }
        let path = PathBuf::from(raw.remove(1));
        raw.remove(0);
        path
    } else {
        env::var_os("TASKBOARD_DB")
            .map(PathBuf::from)
            .unwrap_or_else(|| "taskboard.sqlite".into())
    };
    let args: Vec<String> = raw
        .into_iter()
        .map(|s| s.into_string().map_err(|_| "命令参数需为 UTF-8"))
        .collect::<Result<_, _>>()?;
    let command = args.first().map(String::as_str).unwrap_or("help");
    if matches!(command, "help" | "--help") {
        println!(
            "taskboard-cli [--db PATH] COMMAND\n  add TITLE [PRIORITY]\n  list [QUERY]\n  done ID EXPECTED_VERSION\n  stats\n  export FILE\n  import FILE\n导出是便携内容快照：不保留 ID、完成状态和历史；导入每批最多 100 项。"
        );
        return Ok(());
    }
    let rest = &args[1..];
    match command {
        "add" if (1..=2).contains(&rest.len()) => {}
        "list" if rest.len() <= 1 => {}
        "done" if rest.len() == 2 => {}
        "stats" if rest.is_empty() => {}
        "export" | "import" if rest.len() == 1 => {}
        _ => return Err("命令或参数数量不正确；请使用 help".into()),
    }
    let mut repo = Repository::open(path)?;
    match command {
        "add" => {
            let mut input = NewTask::simple(&rest[0]);
            if let Some(p) = rest.get(1) {
                input.priority = p.parse()?;
            }
            println!("{}", serde_json::to_string_pretty(&repo.create(input)?)?);
        }
        "list" => println!(
            "{}",
            serde_json::to_string_pretty(&repo.list(Filter {
                q: rest.first().cloned(),
                ..Default::default()
            })?)?
        ),
        "done" => {
            let id = rest[0].parse()?;
            let mut change = UpdateTask::from_task(&repo.get(id)?);
            change.expected_version = rest[1].parse()?;
            change.status = Status::Done;
            println!(
                "{}",
                serde_json::to_string_pretty(&repo.update(id, change)?)?
            );
        }
        "stats" => println!("{}", serde_json::to_string_pretty(&repo.stats()?)?),
        "export" => {
            let bytes = serde_json::to_vec_pretty(&repo.export()?)?;
            let mut file = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&rest[0])?;
            std::io::Write::write_all(&mut file, &bytes)?;
            println!("已导出；不会覆盖已有文件");
        }
        "import" => {
            let metadata = fs::metadata(&rest[0])?;
            if metadata.len() > 256 * 1024 {
                return Err("导入文件不可超过 256 KiB".into());
            }
            let inputs: Vec<NewTask> = serde_json::from_slice(&fs::read(&rest[0])?)?;
            println!("导入 {} 条任务", repo.import(inputs)?.len());
        }
        _ => unreachable!("命令已验证"),
    }
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("错误：{e}");
            ExitCode::FAILURE
        }
    }
}
