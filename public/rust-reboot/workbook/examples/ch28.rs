// 性能、调试与常见编译错误
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch28
use std::hint::black_box;
use std::time::Instant;
fn main() {
    let values: Vec<u64> = (0..10_000).collect();
    let start = Instant::now();
    let total: u64 = black_box(&values).iter().sum();
    let elapsed = start.elapsed();
    assert_eq!(total, 49_995_000);
    println!("sum={total}; elapsed={elapsed:?}");
    // 单次时长只作工具演示，不构成可信性能结论。
}
