//! 只替换函数体，保持接口；测试位于 tests/exercises.rs。
#![allow(unused_variables)]
use std::borrow::Cow;
use std::collections::BTreeMap;
use std::num::ParseIntError;
pub fn checked_byte(value: u16) -> Option<u8> {
    todo!("ex01: TryFrom")
}
pub fn clamp_negatives(values: &mut [i32]) {
    todo!("ex02: 原地归零负数")
}
pub fn first_word(text: &str) -> Option<&str> {
    todo!("ex03: 首个非空白单词")
}
pub fn parse_numbers(text: &str) -> Result<Vec<i32>, ParseIntError> {
    todo!("ex04: 严格解析")
}
pub fn word_counts(text: &str) -> BTreeMap<String, usize> {
    todo!("ex05: 转小写词频")
}
pub fn even_square_sum(values: &[i32]) -> i64 {
    todo!("ex06: 偶数平方和")
}
pub fn counter(start: i32) -> impl FnMut() -> i32 {
    move || {
        let _ = start;
        todo!("ex07: 修改捕获的计数器")
    }
}
pub fn generic_max<T: Ord>(values: &[T]) -> Option<&T> {
    todo!("ex08: 不要求 Clone")
}
pub fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {
    todo!("ex09: 相等取第一个")
}
pub fn parallel_sum(values: &[i32]) -> i64 {
    todo!("ex10: 两个作用域线程")
}
pub fn normalize(text: &str) -> Cow<'_, str> {
    todo!("ex11: 无下划线时借用")
}
pub fn escape(text: &str) -> String {
    todo!("ex12: 转义反斜线、tab、换行")
}
pub fn unescape(text: &str) -> Result<String, &'static str> {
    todo!("ex12: 严格反转义")
}
