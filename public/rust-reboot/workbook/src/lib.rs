//! 默认加载练习；`--features solutions` 加载参考答案。
//!
//! ```compile_fail
//! let owned = String::from("rust");
//! let moved = owned;
//! println!("{owned}");
//! ```
//!
//! ```compile_fail
//! fn dangling<'a>() -> &'a str {
//!     let local = String::from("rust");
//!     &local
//! }
//! ```
#[cfg(not(feature = "solutions"))]
mod starter;
#[cfg(not(feature = "solutions"))]
pub use starter::*;
#[cfg(feature = "solutions")]
mod solutions;
#[cfg(feature = "solutions")]
pub use solutions::*;
