# Rust Reboot · 测试驱动练习

环境：支持 edition 2024 的 Rust；示例在 Rust 1.97.1 验证。零第三方依赖，独立 workspace。

```powershell
cd workbook
cargo run --offline --example ch01
cargo test --offline ex01
cargo test --offline --features solutions
cargo test --offline --all-targets --features solutions
cargo test --offline --doc --features solutions
```

默认测试加载 `src/starter.rs`，其中保留待完成的 todo，所以初次测试失败是预期行为。
按 ex01—ex12 完成函数，按测试名过滤。不要修改测试迎合错误实现。
`--features solutions` 加载 `src/solutions.rs`，只检验参考答案，**不会测试你的 starter**。
examples/ch01.rs 至 ch30.rs 与 HTML 的主要示例来自同一数据源。

约束：ex05 不去标点或做 Unicode 正规化；ex06 总和可放入 i64；ex07 不溢出；
ex09 按字节长度比较；ex10 求和可放入 i64；ex12 只编码反斜线、制表符、换行。
HTML 没有内嵌 Rust 编译器，代码需要在本地 Cargo 运行。
