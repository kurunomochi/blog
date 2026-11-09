# Rust Reboot · 中文 Rust 完整核心复习项目

双击 index.html 即可阅读，不需要启动服务或联网。HTML 内嵌样式、脚本和课程数据。
HTML 内嵌了配套 Rust 源码压缩包，页面下载按钮不需要联网或旁边另有 ZIP 文件。
页面下载的 rust-code.zip 是配套工程；完整分发包 rust-reboot.zip 额外包含本 HTML。

## 内容

- 30 章：基础、所有权、借用、文本、数据建模、错误、集合、迭代器、闭包、泛型、trait、生命周期、模块、测试。
- 智能指针、线程、同步、Future、Pin、异步工程、宏、unsafe、FFI、API、Cargo、edition、I/O、性能。
- 30 个完整示例及预期行为，60 道带解析的自测，12 个测试驱动练习；每章额外补充执行过程、错误修复和验收清单。
- Rust Trail 入门 CLI；Rust Taskboard 进阶系统（SQLite、HTTP、CLI、后台队列）；8 节工程导读和源码阅读器。
- Tokio 异步实验；14 天核心复习路线、进阶扩展任务与速查表。

## 使用

workbook 是练习、答案、测试与示例；capstone 是入门项目；taskboard 是进阶项目；tokio-lab 是独立异步实验。

```powershell
cd workbook
cargo run --offline --example ch04
cargo test --offline ex01
# 默认 starter 保留 todo，初次失败是预期；自己完成后即可通过。
cargo test --offline --features solutions
```

各目录含 README。HTML 不在浏览器中编译 Rust；终端命令从相应子目录执行。
示例验证环境：Rust 1.97.1，edition 2024。更旧工具链可能缺少所用标准库 API，建议使用 1.97.1 或更新稳定版。

## 学习记录

完成标记、答案、笔记、项目清单保存在当前浏览器 localStorage。
不同浏览器、访问地址或文件路径可能使用不同存储空间。用“笔记与学习记录”导出/导入 JSON 迁移。
隐私模式或存储禁用时仍可阅读，记录可能不持久保存。无需登录，不会自动发送笔记到网络。

## 范围

覆盖核心语言与常见工程链路，并非所有生态库或平台规范的百科全书。
各章链接官方进一步阅读；核心规则、edition 2024 与 async 资料于 2026-11-09 联网核对。
Rust Trail 是单进程学习工具，写前备份但不保证崩溃原子性。Taskboard 使用 SQLite 事务，仍没有用户认证和可靠持久队列；具体边界见其 README。
