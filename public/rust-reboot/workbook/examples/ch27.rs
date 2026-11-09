// 文件、路径与持久化
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch27
use std::io::{self, BufRead, Cursor};
fn read_numbers(reader: impl BufRead) -> Result<Vec<i32>, Box<dyn std::error::Error>> {
    let mut values = Vec::new();
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        values.push(line.trim().parse()?);
    }
    Ok(values)
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let input = Cursor::new(b"10\n\n20\n");
    println!("{:?}", read_numbers(input)?);
    let _kind = io::ErrorKind::NotFound;
    Ok(())
}
