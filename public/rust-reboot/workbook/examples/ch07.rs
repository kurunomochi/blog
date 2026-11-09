// 结构体、方法与不变量
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch07
#[derive(Debug)]
struct Lesson {
    title: String,
    done: bool,
}
impl Lesson {
    fn new(title: &str) -> Result<Self, &'static str> {
        if title.trim().is_empty() {
            return Err("empty title");
        }
        Ok(Self {
            title: title.trim().to_owned(),
            done: false,
        })
    }
    fn complete(&mut self) {
        self.done = true;
    }
    fn label(&self) -> &str {
        &self.title
    }
}
fn main() {
    let mut lesson = Lesson::new("所有权").unwrap();
    lesson.complete();
    println!("{} {}", lesson.label(), lesson.done);
    assert!(Lesson::new("  ").is_err());
}
