// 表达式、函数与控制流
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch03
fn classify(n: i32) -> &'static str {
    match n {
        n if n < 0 => "negative",
        0 => "zero",
        1..=9 => "small",
        _ => "large",
    }
}
fn main() {
    let total: i32 = (1..=4).sum();
    let label = if total > 5 { "high" } else { "low" };
    let mut n = 0;
    let found = loop {
        n += 1;
        if n * n > 20 {
            break n;
        }
    };
    println!("{total} {label} {found} {}", classify(-1));
}
