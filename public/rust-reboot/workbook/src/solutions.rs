use std::borrow::Cow;
use std::collections::BTreeMap;
use std::num::ParseIntError;
use std::thread;
pub fn checked_byte(value: u16) -> Option<u8> {
    u8::try_from(value).ok()
}
pub fn clamp_negatives(values: &mut [i32]) {
    for value in values {
        *value = (*value).max(0);
    }
}
pub fn first_word(text: &str) -> Option<&str> {
    text.split_whitespace().next()
}
pub fn parse_numbers(text: &str) -> Result<Vec<i32>, ParseIntError> {
    text.split(',').map(|part| part.trim().parse()).collect()
}
pub fn word_counts(text: &str) -> BTreeMap<String, usize> {
    let mut counts = BTreeMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}
// 前提：结果可由 i64 表示。
pub fn even_square_sum(values: &[i32]) -> i64 {
    values
        .iter()
        .copied()
        .filter(|n| n % 2 == 0)
        .map(|n| {
            let n = i64::from(n);
            n * n
        })
        .sum()
}
// 前提：调用过程不会超过 i32::MAX。
pub fn counter(start: i32) -> impl FnMut() -> i32 {
    let mut n = start;
    move || {
        n += 1;
        n
    }
}
pub fn generic_max<T: Ord>(values: &[T]) -> Option<&T> {
    values.iter().max()
}
pub fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
pub fn parallel_sum(values: &[i32]) -> i64 {
    let (left, right) = values.split_at(values.len() / 2);
    thread::scope(|scope| {
        let a = scope.spawn(|| left.iter().map(|&n| i64::from(n)).sum::<i64>());
        let b = scope.spawn(|| right.iter().map(|&n| i64::from(n)).sum::<i64>());
        a.join().expect("求和线程异常") + b.join().expect("求和线程异常")
    })
}
pub fn normalize(text: &str) -> Cow<'_, str> {
    if text.contains('_') {
        Cow::Owned(text.replace('_', "-"))
    } else {
        Cow::Borrowed(text)
    }
}
pub fn escape(text: &str) -> String {
    let mut output = String::new();
    for ch in text.chars() {
        match ch {
            '\\' => output.push_str("\\\\"),
            '\t' => output.push_str("\\t"),
            '\n' => output.push_str("\\n"),
            _ => output.push(ch),
        }
    }
    output
}
pub fn unescape(text: &str) -> Result<String, &'static str> {
    let mut output = String::new();
    let mut chars = text.chars();
    while let Some(ch) = chars.next() {
        if ch != '\\' {
            output.push(ch);
            continue;
        }
        output.push(match chars.next() {
            Some('\\') => '\\',
            Some('t') => '\t',
            Some('n') => '\n',
            Some(_) => return Err("unknown escape"),
            None => return Err("unfinished escape"),
        });
    }
    Ok(output)
}
