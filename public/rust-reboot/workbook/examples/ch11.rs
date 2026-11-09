// 迭代器与惰性流水线
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch11
fn main() {
    let values = vec![1, 2, 3, 4, 5];
    let selected: Vec<i32> = values
        .iter()
        .copied()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .collect();
    let total: i32 = selected.iter().sum();
    println!("{selected:?} {total}");
    assert_eq!(values.len(), 5); // 只借用了 values
    let parsed: Result<Vec<i32>, _> = ["10", "20"].into_iter().map(str::parse::<i32>).collect();
    assert_eq!(parsed.unwrap(), vec![10, 20]);
}
