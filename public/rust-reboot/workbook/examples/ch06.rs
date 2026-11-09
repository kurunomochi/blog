// String、str、切片与 Unicode
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch06
fn first_word(text: &str) -> Option<&str> {
    text.split_whitespace().next()
}
fn main() {
    let text = "你好 Rust";
    println!("{} {}", text.len(), text.chars().count());
    println!("{}", first_word(text).unwrap());
    assert!(text.get(0..1).is_none());
    assert_eq!(text.get(0..3), Some("你"));
    let initials: String = text.chars().take(2).collect();
    println!("{initials}");
}
