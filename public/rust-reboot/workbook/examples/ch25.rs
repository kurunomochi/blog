// API 设计与常用 trait
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch25
use std::borrow::Cow;
use std::fmt;
struct UserId(u64);
impl fmt::Display for UserId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "user-{}", self.0)
    }
}
fn normalize(text: &str) -> Cow<'_, str> {
    if text.contains('_') {
        Cow::Owned(text.replace('_', "-"))
    } else {
        Cow::Borrowed(text)
    }
}
fn main() {
    println!("{} {}", UserId(7), normalize("rust_notes"));
    assert!(matches!(normalize("rust"), Cow::Borrowed(_)));
}
