// 模块、crate、package 与可见性
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch16
mod domain {
    #[derive(Debug)]
    pub struct Topic {
        name: String,
    }
    impl Topic {
        pub fn new(name: &str) -> Self {
            Self { name: name.into() }
        }
        pub fn name(&self) -> &str {
            &self.name
        }
    }
}
use domain::Topic;
fn main() {
    let topic = Topic::new("modules");
    println!("{}", topic.name());
    // topic.name 不可从这里直接读取：字段私有。
}
