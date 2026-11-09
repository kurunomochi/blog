// Result、错误传播与错误类型
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch09
use std::num::ParseIntError;
fn sum_csv(line: &str) -> Result<i32, ParseIntError> {
    let mut total = 0;
    for part in line.split(',') {
        total += part.trim().parse::<i32>()?;
    }
    Ok(total)
}
fn main() {
    println!("{:?}", sum_csv("2, 3, 4"));
    assert!(sum_csv("2, nope").is_err());
    // 教学范围：小整数；任意输入还需处理求和溢出。
}
