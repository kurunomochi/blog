// 泛型、约束与 const generics
// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch13
fn largest<T: Ord>(items: &[T]) -> Option<&T> {
    items.iter().max()
}
fn sum_array<const N: usize>(values: [i32; N]) -> i32 {
    values.into_iter().sum()
}
fn main() {
    let names = [String::from("apple"), String::from("pear")];
    println!("{}", largest(&names).unwrap());
    assert_eq!(largest::<i32>(&[]), None);
    println!("{}", sum_array([1, 2, 3]));
}
