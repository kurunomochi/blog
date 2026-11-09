// unsafe、裸指针与 FFI
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch24
fn first(values: &[i32]) -> Option<i32> {
    if values.is_empty() {
        return None;
    }
    let ptr = values.as_ptr();
    // SAFETY: 非空切片的首元素已初始化、对齐且在此调用期间存活；
    // 只读取 Copy 值，不创建可变别名。
    Some(unsafe { *ptr })
}
fn main() {
    assert_eq!(first(&[]), None);
    println!("{:?}", first(&[7, 8]));
    // 实际业务直接 values.first().copied() 更合适。
}
