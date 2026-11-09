# Rust Trail 综合项目

独立 workspace，零第三方依赖。此目录是**完整参考实现**，建议先阅读需求，自己另建实现再对照。

```powershell
cd capstone
cargo test --offline
cargo run --offline -- --file demo.db add "复习所有权"
cargo run --offline -- --file demo.db add "写生命周期测试"
cargo run --offline -- --file demo.db list
cargo run --offline -- --file demo.db done 1
cargo run --offline -- --file demo.db find 生命周期
cargo run --offline -- --file demo.db stats
cargo run --offline -- --file demo.db remove 2
```

M1 数据模型：私有字段、合法标题、唯一 ID。M2 业务：增加、完成、删除、查询、统计。
M3 编码：版本化文件头、转义、重复 ID 检查。M4 I/O：不存在可初始化，损坏拒绝加载，保存前备份。
M5 CLI：帮助、参数检查、可指定路径、错误非零退出码。M6 测试：单元、文件往返、跨进程重启与坏文件保护。

核心设计：Store 拥有 Vec<Task>；查询借用，修改独占借用；返回 TrailError；encode/decode 与磁盘分离。
next_id 写进头部，删掉最高 ID 后也不复用；checked_add 防溢出；幂等完成不重复保存。
标题在终端转义显示，避免控制字符破坏输出；存储内容保留原始 Unicode。

## 验收

- 空标题拒绝且不创建数据库；不存在 ID 返回错误。
- 同一个任务完成两次不报错，不产生多余修改。
- 含中文、tab、换行、反斜线的标题序列化往返一致。
- 重启读取，统计一致；删除后 ID 不复用。
- 损坏文件拒绝加载，不覆盖原数据。
- 已有文件写入前备份到追加 .bak 的路径；备份失败即终止。

## 明确限制

单进程串行学习工具，不能多个实例并发写同一文件。
备份后直接写原文件，不提供崩溃原子性；失败可能需要从 .bak 手动恢复。
没有数据库事务、文件锁或权限管理，不用于重要生产数据。
进阶作业：跨平台可靠替换、恢复流程、文件锁、SQLite、serde、clap、持久化格式迁移。
