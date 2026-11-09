// 线程、Send、Sync 与作用域线程
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch19
use std::thread;
fn main() {
    let values = [1_i32, 2, 3, 4];
    let total = thread::scope(|scope| {
        let left = scope.spawn(|| values[..2].iter().sum::<i32>());
        let right = scope.spawn(|| values[2..].iter().sum::<i32>());
        left.join().unwrap() + right.join().unwrap()
    });
    println!("{total}");
}
