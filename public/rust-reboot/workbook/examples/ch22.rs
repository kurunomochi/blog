// Pin、Unpin 与异步工程
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch22
use std::pin::Pin;
fn main() {
    let mut pinned = Box::pin(String::from("Rust"));
    // String: Unpin，因此这里可以获得普通 &mut String。
    let text: &mut String = Pin::as_mut(&mut pinned).get_mut();
    text.push_str(" async");
    let moved_handle = pinned; // 移动 Box 句柄，不搬动它指向的分配
    println!("{moved_handle}");
}
