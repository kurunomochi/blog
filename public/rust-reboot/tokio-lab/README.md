# Tokio 异步实验

与标准库练习不同，本包使用第三方 Tokio。首次无缓存时需要网络；Cargo.lock 记录本次验证版本。

```powershell
cd tokio-lab
cargo run --locked
cargo test --locked
```

有缓存后可添加 --offline。实验包含 join! 并发轮询、spawn 任务句柄、有界通道、关闭协议、timeout。
计时测试使用暂停的 Tokio 时间，避免依赖机器调度速度。
作业：给生产者添加取消协议；为每个消息添加 ID；解释 retry 为什么可能重复副作用。
官方教程：https://tokio.rs/tokio/tutorial
