// Mutex、Channel 与原子操作
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch20
use std::sync::mpsc;
use std::thread;
fn main() {
    let (tx, rx) = mpsc::channel();
    let handle = thread::spawn(move || {
        for n in [2, 4, 6] {
            tx.send(n).unwrap();
        }
    });
    let total: i32 = rx.into_iter().sum();
    handle.join().unwrap();
    println!("{total}");
}
