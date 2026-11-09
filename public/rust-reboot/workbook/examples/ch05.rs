// 借用与可变性
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch05
fn normalize(text: &mut String) {
    *text = text.trim().to_owned();
}
fn main() {
    let mut title = String::from("  Rust  ");
    let view = &title;
    println!("{}", view.trim()); // view 最后一次使用
    normalize(&mut title);
    let mut values = [1, 2, 3, 4];
    let (left, right) = values.split_at_mut(2);
    left[0] += 10;
    right[0] += 20;
    println!("{title} {values:?}");
}
