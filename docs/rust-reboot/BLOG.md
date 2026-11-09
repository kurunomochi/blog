# Rust 久不用怎么重新捡起来：从所有权复习到 SQLite 与异步任务系统

很久没有写 Rust 时，我最容易忘记的不是关键字，而是做设计时要问的问题：这段数据应该由谁拥有？函数只是读取，还是要把它存起来？错误应该在哪一层处理？一个请求超时后，后台工作究竟停没停？

这次我把复习整理成一套可以直接打开的 HTML 学习工作台，并配了真正能运行的练习和两个递进式项目。

在线手册：https://nenumochi.top/rust-reboot/

完整代码：https://github.com/kurunomochi/cpp_learning/tree/main/public/rust-reboot

## 这份复习资料怎么用

正文有 30 章，覆盖类型与控制流、所有权与借用、文本、结构体和枚举、错误处理、集合、迭代器、闭包、泛型、trait、生命周期、模块、测试、智能指针、线程、异步、Pin、宏、unsafe、API、Cargo、I/O 与性能。

每章不只列概念，还补了示例的执行过程、容易写错的版本、修复方向和具体的验收标准。配套 30 个可运行示例、60 道带解析的自测、12 个测试驱动练习，以及 8 节进阶项目导读。

我的建议顺序是：先预测示例输出，再运行；故意改坏一处，读编译器报错；最后合上答案重写。对久未使用 Rust 的人，这比一直往下翻文档更容易恢复手感。

HTML 已内嵌课程、样式、脚本与源码压缩包，可以离线阅读和下载代码。笔记、完成标记与测验答案保存在当前浏览器，支持导出 JSON 备份。网页不会直接编译 Rust，练习仍然在本地 Cargo 中执行。

## 第一级：用标准库完成 Rust Trail

入门项目是一个本地任务 CLI，支持增加、列出、完成、删除、搜索与统计。它只有标准库依赖，适合先复习所有权、借用、Result、模块和文件 I/O。

这个版本故意把格式编解码与文件操作分开：纯函数负责严格解析，边界函数负责读取和保存。文件损坏不会被当成空数据覆盖，删除任务也不会让 ID 被重复使用。

它在保存前备份旧文件，但不提供崩溃原子性或多进程并发保证。这个限制也是课程内容：备份、原子替换、数据库事务不是同一层的概念。

## 第二级：把项目升级为 Rust Taskboard

进阶项目增加 SQLite、HTTP API、CLI、标签、优先级、状态流转、筛选分页、版本号、审计记录，以及有界后台批量导入。

项目按职责拆成六个核心模块：domain 定义合法数据，error 定义错误，repository 管理 SQLite，service 处理同步与异步边界，jobs 管理后台队列，api 处理 HTTP。server 与 cli 两个二进制复用同一个库。

```text
HTTP / CLI
    ↓
领域校验与 Result
    ↓
阻塞线程池 + 并发上限
    ↓
SQLite 事务：tasks + task_tags + events
```

## 一次创建请求是怎么完成的

POST /tasks 的 JSON 先被解码为 NewTask。标题去首尾空白后必须非空，优先级只能为 1—3，标签统一格式并去重。

Database::call 获取并发许可，把同步 SQLite 操作交给 spawn_blocking。数据库互斥锁只在阻塞工作线程里持有，不在异步线程中持锁等待。

Repository 开启事务，依次写入任务、标签和审计事件，最后提交。任一步失败都返回错误，未提交事务会回滚；HTTP 成功时返回 201 和新任务。

这里有个容易忽略的细节：并发许可也要跟着真实的阻塞工作走。请求取消并不一定能中断已经开始的 spawn_blocking，如果许可提前释放，限制就会失真。

## 用版本号避免静默覆盖

假设两个人都读到 version=1。第一个请求修改成功后版本变成 2；第二个请求如果仍带 expected_version=1，会收到 409 version_conflict。

这与 Mutex 解决的不是同一个问题。Mutex 组织进程内访问，版本号检查处理跨请求的陈旧数据。客户端遇到冲突应重新读取并合并意图，而不是偷偷换成最新版本号再覆盖一次。

删除同样需要 expected_version。查询的总数、任务和标签放在一个读取事务快照中，避免另一个进程写入时分页结果混用不同时间点的数据。

## 后台任务为什么要有界

POST /jobs/import 接收 1—100 条任务，排队成功返回 202。202 只表示已接收，客户端还要查询 job 状态，观察 queued、running、succeeded 或 failed。

队列最多容纳 8 个待处理批次，由一个 worker 执行；满载时明确返回 503。历史状态最多保留 256 条，避免长时间运行无限积累内存。

正常关闭会先完成在途请求，再关闭发送端并排空队列。不过队列和状态只在内存中，崩溃后不会恢复；已经提交的 SQLite 任务仍然存在。重试也可能重复创建，因此幂等键、持久队列和 outbox 是后续扩展题，不能把当前版本称为 exactly-once。

## 本次具体验证了什么

全部 30 个章节示例在本地实际运行，并核对预期输出。练习参考答案、文档中的编译失败示例、入门 CLI、Tokio 实验和进阶项目合计 38 个 Rust 测试通过。

进阶测试覆盖输入校验、筛选分页、SQL 参数注入、读取重启、陈旧更新、并发更新、删除冲突、超大请求、后台导入和队列满载。事务测试还故意让第二次 SQL 写入失败，确认第一条记录和审计也没有残留。

另外实际启动 HTTP 进程，验证中文创建、更新、409 冲突、后台导入和重启恢复，并让 CLI 读取同一个数据库、拒绝旧版本修改。格式检查与浏览器交互也一并验证。

验证环境是 Windows 上的 Rust 1.97.1、edition 2024；依赖版本由各工程的 Cargo.lock 固定。它们是本次复现环境，不是对“最新版本”的承诺。

## 先运行，再做一次自己的修改

```powershell
cd public/rust-reboot/workbook
cargo run --offline --example ch04
cargo test --offline ex01
```

默认练习文件保留 todo，第一次测试失败是预期行为。完成函数后让测试变绿；添加 --features solutions 检查的是参考答案，不是你写的 starter。

```powershell
cd ../taskboard
cargo test --locked
cargo run --locked --bin taskboard-server
```

Taskboard 首次构建需要下载依赖，并且需要 C 工具链编译随包提供的 SQLite。服务默认只监听 127.0.0.1:4318，没有账户认证；不应直接把学习服务暴露为公共业务系统。

下一步可以从一个具体需求开始：添加排序选项、增加一次数据库迁移、实现幂等提交，或者把后台队列持久化。先定义正确行为与失败情况，再改实现和测试。

复习的终点不是“看完所有章节”，而是能从空文件开始，把一个新需求放进已有系统，并解释清楚它如何保持原来的约束。

## 进一步阅读

Rust Book：https://doc.rust-lang.org/book/

Rust 2024 Edition Guide：https://doc.rust-lang.org/edition-guide/rust-2024/index.html

Axum：https://docs.rs/axum/0.8.9/axum/

rusqlite：https://docs.rs/rusqlite/0.41.1/rusqlite/

Tokio 阻塞任务边界：https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
