// 闭包与 Fn 家族
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch12
fn once<F: FnOnce() -> String>(f: F) -> String {
    f()
}
fn main() {
    let label = String::from("Rust");
    let read = move || label.len();
    println!("{} {}", read(), read()); // move 闭包仍可重复调用
    let mut count = 0;
    {
        let mut bump = || {
            count += 1;
            count
        };
        assert_eq!(bump(), 1);
        assert_eq!(bump(), 2);
    }
    let value = String::from("owned");
    println!("{} {count}", once(|| value));
}
