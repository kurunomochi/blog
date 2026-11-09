// 测试、文档测试与调试
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch17
fn clamp(n: i32, min: i32, max: i32) -> i32 {
    n.max(min).min(max)
}
fn main() {
    assert_eq!(clamp(-2, 0, 10), 0);
    assert_eq!(clamp(5, 0, 10), 5);
    assert_eq!(clamp(20, 0, 10), 10);
    println!("3 boundary checks passed");
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn boundaries() {
        assert_eq!(clamp(0, 0, 10), 0);
        assert_eq!(clamp(10, 0, 10), 10);
    }
}
