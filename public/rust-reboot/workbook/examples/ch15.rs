// 生命周期与借用 API
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch15
fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
struct Excerpt<'a> {
    text: &'a str,
}
impl Excerpt<'_> {
    fn text(&self) -> &str {
        self.text
    }
}
fn main() {
    let a = String::from("ownership");
    let b = String::from("borrow");
    let excerpt = Excerpt {
        text: longer(&a, &b),
    };
    println!("{}", excerpt.text());
}
