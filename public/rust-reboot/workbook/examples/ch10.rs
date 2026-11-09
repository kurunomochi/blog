// Vec、HashMap 与集合选型
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch10
use std::collections::BTreeMap;
fn main() {
    let mut counts = BTreeMap::new();
    for word in "rust borrow rust".split_whitespace() {
        *counts.entry(word).or_insert(0_u32) += 1;
    }
    println!("{counts:?}");
    let mut values = Vec::with_capacity(8);
    assert!(values.is_empty());
    values.extend([10, 20, 30]);
    assert_eq!(values.get(9), None);
    println!("{}", values.remove(1));
}
