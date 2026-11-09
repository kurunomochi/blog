// 所有权、Move、Copy 与 Drop
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch04
fn consume(s: String) -> usize {
    s.len()
}
fn main() {
    let original = String::from("rust");
    let moved = original;
    // println!("{original}"); // E0382：已被移动
    let backup = moved.clone();
    let len = consume(moved);
    let mut slot = Some(backup);
    let taken = slot.take().unwrap();
    assert!(slot.is_none());
    let x = 7;
    let y = x;
    println!("{taken} {len} {}", x + y);
}
