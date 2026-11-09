// Trait、关联类型与动态分派
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch14
trait Summary {
    fn summary(&self) -> String;
}
struct Note(String);
struct Score(u32);
impl Summary for Note {
    fn summary(&self) -> String {
        self.0.clone()
    }
}
impl Summary for Score {
    fn summary(&self) -> String {
        format!("score={}", self.0)
    }
}
fn show(item: &impl Summary) {
    println!("{}", item.summary());
}
fn main() {
    show(&Score(90));
    let items: Vec<Box<dyn Summary>> = vec![Box::new(Note("borrow".into())), Box::new(Score(100))];
    for item in items {
        println!("{}", item.summary());
    }
}
