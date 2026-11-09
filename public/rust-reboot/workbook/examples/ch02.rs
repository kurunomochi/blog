// 变量、类型与内存布局
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch02
fn main() {
    let raw = "42";
    let raw: u16 = raw.parse().expect("固定演示输入");
    let mut score = raw;
    score += 1;
    let pair: (u16, bool) = (score, true);
    let xs = [2, 4, 6];
    assert!(u8::try_from(300_u16).is_err());
    println!("{} {} {}", pair.0, pair.1, xs.len());
    println!("{:?}", 255_u8.checked_add(1));
}
