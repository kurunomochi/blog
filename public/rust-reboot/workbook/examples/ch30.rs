// 生态地图与结业复盘
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch30
fn main() {
    let checklist = ["ownership", "errors", "tests", "concurrency", "delivery"];
    for (index, item) in checklist.iter().enumerate() {
        println!("{}. {item}", index + 1);
    }
}
