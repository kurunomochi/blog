// Box、Rc、Weak 与内部可变性
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch18
use std::cell::RefCell;
use std::rc::Rc;
fn main() {
    let data = Rc::new(RefCell::new(vec!["ownership"]));
    let other = Rc::clone(&data);
    other.borrow_mut().push("borrowing");
    println!("{} {}", data.borrow().len(), Rc::strong_count(&data));
    let weak = Rc::downgrade(&data);
    drop(other);
    drop(data);
    assert!(weak.upgrade().is_none());
    println!("released");
}
