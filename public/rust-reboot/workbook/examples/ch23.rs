// 宏、属性与条件编译
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch23
macro_rules! labels {
    ($($value:expr),* $(,)?) => {
        vec![$($value.to_string()),*]
    };
}
fn main() {
    let topics = labels!["ownership", "borrow", 2024,];
    println!("{}", topics.join(" / "));
    assert!(cfg!(any(
        target_pointer_width = "32",
        target_pointer_width = "64"
    )));
}
