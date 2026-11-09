// Cargo、依赖、features 与 edition
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch26
fn main() {
    println!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
    println!("debug_assertions={}", cfg!(debug_assertions));
}
