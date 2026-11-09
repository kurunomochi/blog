# Rust Taskboard：SQLite + HTTP + CLI + 后台任务

这是第二级综合项目。先完成 `../capstone/` 的标准库 CLI，再用本项目复习跨模块工程。
HTML 的「综合实战项目」包含 8 节分步导读与完整源码查看器。

## 运行

需要 Rust 1.97.1 或更新稳定版，以及 C 编译工具链：Windows 使用 MSVC Build Tools；Linux 使用 GCC/Clang。
SQLite 使用 rusqlite 的 bundled 特性从依赖源码构建，不需要单独启动数据库服务。
首次下载 crates 需要网络；Cargo.lock 固定本次验证依赖，缓存齐全后可以加 `--offline`。

```powershell
cd taskboard
cargo test --locked
cargo run --locked --bin taskboard-server
```

默认 `127.0.0.1:4318`，SQLite 文件在当前目录 `taskboard.sqlite`。
可用 `TASKBOARD_BIND` 和 `TASKBOARD_DB` 改地址与路径。程序拒绝非回环监听，因为本学习版没有账户认证。
Ctrl+C 进入优雅停止：结束 HTTP 在途请求、关闭队列发送端、等待已排队工作完成。

另开 PowerShell，实际发一个请求：

```powershell
$base = 'http://127.0.0.1:4318'
Invoke-RestMethod "$base/health"
$body = @{ title='复习所有权'; description='运行 ch04'; priority=3; tags=@('rust','study'); due_at=$null } | ConvertTo-Json
$task = Invoke-RestMethod -Method Post -Uri "$base/tasks" -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
Invoke-RestMethod "$base/tasks?priority=3&tag=rust&limit=10&offset=0"
$update = @{ expected_version=$task.version; title=$task.title; description=$task.description; priority=$task.priority; tags=$task.tags; status='done'; due_at=$null } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/tasks/$($task.id)" -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($update))
# 再发相同 expected_version：预期 HTTP 409，说明陈旧写入被拒绝。
Invoke-RestMethod "$base/stats"
```

CLI 使用同一个库，可打开同一个 SQLite 文件：

```powershell
cargo run --locked --bin taskboard-cli -- --db demo.sqlite add '复习事务' 3
cargo run --locked --bin taskboard-cli -- --db demo.sqlite list
cargo run --locked --bin taskboard-cli -- --db demo.sqlite done 1 1
cargo run --locked --bin taskboard-cli -- --db demo.sqlite stats
cargo run --locked --bin taskboard-cli -- --db demo.sqlite export tasks-template.json
# 导出文件必须不存在；不静默覆盖已有文件。
cargo run --locked --bin taskboard-cli -- --db another.sqlite import tasks-template.json
```

## 模块顺序

| 文件 | 职责 | 复习重点 |
| --- | --- | --- |
| src/domain.rs | 输入校验、枚举、任务与分页模型 | 拥有权、构造约束、泛型、Serde |
| src/error.rs | 领域错误与底层错误来源 | Result、Display、Error、From |
| src/repository.rs | SQLite 迁移、事务、参数查询、审计 | RAII、借用、事务回滚 |
| src/service.rs | 阻塞池与并发上限 | Send、static、Arc、Mutex、Semaphore |
| src/jobs.rs | 有界批量导入队列 | mpsc、状态机、背压、关闭协议 |
| src/api.rs | 请求提取与 HTTP 错误映射 | async、路由、JSON 与边界验证 |
| src/bin/ | HTTP 服务和命令行入口 | 模块复用、配置、退出码 |
| tests/ | Repository 与 HTTP 集成测试 | 临时目录、并发写入、边界与失败 |

## 数据与 API 契约

优先级为 1—3，数值越高越优先。标题 trim 后 1—120 个 Unicode 标量值，不含控制字符。
描述最长 4000 个标量值；最多 8 个标签，标签 trim、转小写、长度 1—24、排序去重。
due_at 为非负 Unix 秒或 null。状态为 todo / doing / done；done → doing 必须先显式重开为 todo。

| 方法 | 路径 | 成功结果 |
| --- | --- | --- |
| GET | /health | 200，检查存储可查询 |
| POST | /tasks | 201，Task 与 Location |
| GET | /tasks?q=&status=&priority=&tag=&limit=20&offset=0 | 200，Page<Task> |
| GET | /tasks/{id} | 200，Task |
| PUT | /tasks/{id} | 200，完整替换，需 expected_version |
| DELETE | /tasks/{id}?expected_version=1 | 204 |
| GET | /stats | 200，total/todo/doing/done |
| GET | /events | 200，最近 100 条审计事件 |
| GET | /export | 200，可供导入的新任务模板数组 |
| POST | /jobs/import | 202，异步导入 1—100 个任务 |
| GET | /jobs/{id} | 200，queued/running/succeeded/failed |

PUT 是完整替换：省略 description/tags 清空对应内容；due_at 缺省或 null 表示清除。
同状态 PUT 仍增加版本并写审计。它不实现自动幂等重试。
领域错误返回 `{ "error": { "code": "...", "message": "..." } }`；非法 JSON、提取失败和超大请求由 Axum 返回对应拒绝响应。
业务输入非法为 422，不存在为 404，陈旧版本为 409，并发槽或队列满为 503，内部错误为 500。
JSON 请求体限 256 KiB；limit 为 1—100，offset 为 0—1000000。
列表排序固定为 priority DESC、id DESC；total、任务及标签在一个读取事务快照内读取。
搜索使用 SQLite lower + instr，ASCII 不区分大小写，不承诺完整 Unicode 大小写折叠。

## 后台导入与边界

队列最多 8 个批次，单 worker；最多保留 256 条内存状态，优先淘汰最旧终态。
202 表示排队成功，必须继续查 job。worker 批量操作在一笔 SQLite 事务中提交。
进程正常退出会排空已有任务；崩溃后内存队列与 job 状态不恢复，SQLite 已提交记录仍保留。
没有幂等键，重试提交可能重复创建任务；不宣称可靠消息或 exactly-once。

`/export` 和 CLI export 是**内容模板导出，不是完整备份**：不包含 ID、状态、版本、审计，导入会创建新 Todo。
单批导入最多 100 条；导出可以超过 100 条，较大导出需自行分批导入。
SQLite 使用 WAL，运行时备份不能简单只复制主数据库文件；应增加在线备份 API 或采用停机一致性备份。
数据库连接通过互斥锁串行使用，最多允许 32 个阻塞工作；这是可理解的学习架构，不是高吞吐数据库服务。

## 练习路线

1. 给 Filter 增加 sort 白名单，测试排序与分页。
2. 添加 schema version 2，迁移 estimate_minutes 并验证旧数据库升级。
3. 对任务状态变化增加原因字段，让审计可以解释业务行为。
4. 增加幂等键，重试批次不重复创建；为崩溃恢复写测试。
5. 将 job 入队与持久化事件组合为可靠 outbox；明确交付语义。
6. 增加账户与数据隔离，再讨论远程部署。

官方资料：
- https://docs.rs/axum/0.8.9/axum/
- https://docs.rs/rusqlite/0.41.1/rusqlite/
- https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
