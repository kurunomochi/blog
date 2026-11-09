// async、await 与 Future
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch21
use std::future::Future;
use std::task::{Context, Poll, Waker};
async fn double(n: i32) -> i32 {
    n * 2
}
fn main() {
    let mut future = Box::pin(async { double(21).await });
    let mut context = Context::from_waker(Waker::noop());
    match future.as_mut().poll(&mut context) {
        Poll::Ready(value) => println!("{value}"),
        Poll::Pending => panic!("本例不包含真正挂起的操作"),
    }
}
