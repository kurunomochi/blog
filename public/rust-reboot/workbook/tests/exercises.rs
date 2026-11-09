use rust_reboot_workbook::*;
use std::borrow::Cow;
#[test]
fn ex01_boundaries() {
    assert_eq!(checked_byte(0), Some(0));
    assert_eq!(checked_byte(255), Some(255));
    assert_eq!(checked_byte(256), None);
    assert_eq!(checked_byte(u16::MAX), None);
}
#[test]
fn ex02_in_place() {
    let mut xs = [-3, 0, 9, i32::MIN];
    clamp_negatives(&mut xs);
    assert_eq!(xs, [0, 0, 9, 0]);
    clamp_negatives(&mut []);
}
#[test]
fn ex03_unicode_and_empty() {
    for text in ["", " \t\n"] {
        assert_eq!(first_word(text), None);
    }
    assert_eq!(first_word("  你好 Rust"), Some("你好"));
    assert_eq!(first_word("\nrust\nlang"), Some("rust"));
    assert_eq!(first_word("\u{3000}rust"), Some("rust"));
}
#[test]
fn ex04_strict_parse() {
    assert_eq!(parse_numbers(" 1,-2, 0").unwrap(), [1, -2, 0]);
    for text in ["", "1,no", "1,", "2147483648"] {
        assert!(parse_numbers(text).is_err(), "{text}");
    }
}
#[test]
fn ex05_word_counts() {
    let counts = word_counts("Rust rust RUST 你好 你好");
    assert_eq!(counts.get("rust"), Some(&3));
    assert_eq!(counts.get("你好"), Some(&2));
    assert!(word_counts("").is_empty());
}
#[test]
fn ex06_widen_before_multiply() {
    assert_eq!(even_square_sum(&[-2, 1, 4]), 20);
    assert_eq!(even_square_sum(&[100_000]), 10_000_000_000);
    assert_eq!(even_square_sum(&[]), 0);
}
#[test]
fn ex07_stateful_closure() {
    let mut a = counter(4);
    let mut b = counter(-1);
    assert_eq!(a(), 5);
    assert_eq!(a(), 6);
    assert_eq!(b(), 0);
}
#[test]
fn ex08_no_clone_required() {
    #[derive(PartialEq, Eq, PartialOrd, Ord, Debug)]
    struct NoClone(i32);
    let xs = [NoClone(1), NoClone(9), NoClone(3)];
    assert_eq!(generic_max(&xs), Some(&xs[1]));
    assert_eq!(generic_max::<i32>(&[]), None);
}
#[test]
fn ex09_borrow_and_tie() {
    let a = String::from("ab");
    let b = String::from("cd");
    assert!(std::ptr::eq(longer(&a, &b), a.as_str()));
    assert_eq!(longer("你", "ab"), "你");
    assert_eq!(longer("", ""), "");
}
#[test]
fn ex10_parallel_empty_and_wide() {
    assert_eq!(parallel_sum(&[]), 0);
    assert_eq!(parallel_sum(&[1, -2, 8]), 7);
    assert_eq!(parallel_sum(&[i32::MAX, i32::MAX]), 4_294_967_294);
}
#[test]
fn ex11_borrow_when_unchanged() {
    assert!(matches!(normalize("rust"), Cow::Borrowed("rust")));
    assert!(matches!(normalize("rust_notes"), Cow::Owned(_)));
    assert_eq!(normalize("__你好_"), "--你好-");
}
#[test]
fn ex12_round_trip_and_invalid() {
    for text in ["", "你好", "a\tb\nc\\d", "\\n", "emoji 🦀"] {
        assert_eq!(unescape(&escape(text)).unwrap(), text);
    }
    assert_eq!(escape("\t\n\\"), "\\t\\n\\\\");
    assert!(unescape("\\q").is_err());
    assert!(unescape("tail\\").is_err());
}
