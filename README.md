# kurumochi · Blog & Blender Portfolio

[![Checks](https://github.com/kurunomochi/blog/actions/workflows/ci.yml/badge.svg)](https://github.com/kurunomochi/blog/actions/workflows/ci.yml)

个人博客和 Blender 作品集，使用 **Rust + Axum** 后端与原生 HTML / CSS / JavaScript。无需前端构建，也无需数据库服务；文章和作品写入本地 JSON，上传图片保存在磁盘。

**在线网站：[nenumochi.top](https://nenumochi.top/)** · **作品集：[portfolio.html](https://nenumochi.top/portfolio.html)**

![Blender 作品示例](public/assets/works/blue-hour.png)

## 功能

- 首页：个人介绍、最新文章、Blender 作品预览，数量来自实际内容。
- 独立文章页 `/blog/`：全文搜索、分类筛选、日期排序、每页 8 篇、收藏筛选；筛选条件和页码保存在 URL 中。
- 文章阅读：自动目录、阅读进度、预计阅读时间、字号选择、复制链接、代码复制、相邻文章和同分类推荐。
- 归档 `/archive.html` 与关于 `/about.html`：按年浏览记录，了解作者和联系方式。
- 作品集：精选作品、分类和搜索、多图详情、点击放大。
- 管理后台：文章与作品增删改、图片上传、封面和精选设置。
- 公共页面：循环静音视频背景、可暂停播放、半透明阅读面板、移动端布局。
- 后端：上传前鉴权、限流登录、会话撤销、内容校验、原子文件替换和优雅停止。

后台入口不显示在公共导航中；管理员直接访问 `/admin.html` 或 `/studio.html`。

### 文章阅读与收藏

文章继续使用原来的 `content: string[]` 数据格式，不需要迁移。正文支持 `#` / `##` / `###` 标题、列表、引用、围栏代码块、行内代码、加粗和 HTTP(S) 裸链接；不执行原始 HTML，也不是完整 Markdown 引擎。旧文章中的简短独立小标题会自动进入目录。后台输入标题时推荐显式使用 `#`，以保证目录准确。

收藏与字号仅保存在当前浏览器的 localStorage，不会跨设备同步；存储不可用时仍能正常阅读。首页旧的 `#articles` 链接会跳转到 `/blog/`。文章 URL 保持 `/article.html?id=...`，已有分享链接继续可用。

列表搜索目前由浏览器对 `/api/posts` 返回的文章执行，适用于个人博客规模。文章数量明显增长后，应改为后端分页和全文索引，避免每次传输所有正文。

## 快速开始

准备 Rust stable（支持 edition 2024）和 Git。Node.js 22+ 仅用于测试，不是运行网站的必要依赖。

```bash
git clone https://github.com/kurunomochi/blog.git
cd blog
```

Linux / macOS（Bash）：

```bash
export BLOG_ADMIN_USERNAME=admin
read -rsp '后台密码: ' BLOG_ADMIN_PASSWORD; echo
export BLOG_ADMIN_PASSWORD
cargo run --locked
```

Windows（PowerShell）：

```powershell
$env:BLOG_ADMIN_USERNAME = 'admin'
$credential = Get-Credential -UserName admin -Message '设置本次启动的后台密码'
$env:BLOG_ADMIN_PASSWORD = $credential.GetNetworkCredential().Password
cargo run --locked
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)，再进入 `/admin.html` 或 `/studio.html` 添加内容。首次运行是空站，不会自动写入示例文章。账号密码来自环境变量，没有默认密码。

本仓库不包含生产文章、生产作品清单或上传目录。已有网站升级时，保留自己的 `data/`。

### 环境变量

| 变量                  | 默认值           | 用途                                   |
| --------------------- | ---------------- | -------------------------------------- |
| `BLOG_ADMIN_USERNAME` | `admin`          | 管理员账号，不能为空                   |
| `BLOG_ADMIN_PASSWORD` | 无，必填         | 非空密码，建议使用至少 12 位的随机密码 |
| `BLOG_BIND`           | `127.0.0.1:3000` | 监听 IP 和端口                         |
| `BLOG_DATA_DIR`       | `data`           | 可写的数据目录                         |
| `BLOG_PUBLIC_DIR`     | `public`         | 静态资源目录，须包含 `index.html`      |

相对路径以进程工作目录为基准。`cargo run` 不会自动读取 `.env`；Docker Compose 和示例 systemd 服务会读取它。配置错误或 JSON 损坏时，服务启动失败并保留原文件，不用空数据覆盖。

## 项目结构

```text
src/
  main.rs          路由组装、安全响应头、优雅停止
  config.rs        环境配置及启动校验
  auth.rs          登录、会话、鉴权中间件
  error.rs         统一业务错误响应
  storage.rs       JSON 读写、刷盘和原子替换
  posts.rs         文章接口及校验
  works.rs         作品接口、图片上传及校验
public/
  common.js        请求、登录状态、文本转义、图片 URL 校验
  index.html       博客首页
  article.html     文章详情
  portfolio.html   作品集
  work.html        作品详情
  admin.html       文章管理
  studio.html      作品管理
  season-theme.*   公共视频主题和透明度变量
  assets/          头像及作品示例图
  media/           视频背景
tests/             API 集成测试、前端公共逻辑测试
deploy/            systemd、Nginx、Apache 配置示例
.github/workflows/ Windows / Linux 自动检查
```

前端脚本按页面加载，共用 `common.js`。博客页面仍使用 Google Fonts 和 Lucide CDN；字体不可用时回退到系统字体，图标加载失败不影响文章和后台接口。

## 修改外观与内容

文章在 `/admin.html` 编辑；目前按行保存为正文段落，纯文本输出，不执行 HTML。`image` 字段为兼容旧数据而保留，公共文章列表和详情不显示封面。

作品在 `/studio.html` 编辑；上传图片或填写 HTTPS 图片地址，设置封面后保存。站内图片可使用 `/assets/…`、`/uploads/…`。

将背景视频替换为 `public/media/blog-background.mp4`，推荐压缩后的 H.264 MP4。页面默认静音循环播放，切到后台标签页会暂停，返回后继续；用户手动暂停后不会自动恢复。浏览器禁止自动播放时可点击右下角按钮。

透明度集中在 `public/season-theme.css` 顶部：

```css
--surface: rgba(250, 252, 248, 0.72); /* 普通面板 */
--surface-reading: rgba(250, 252, 248, 0.76); /* 文章列表和介绍 */
--surface-detail: rgba(250, 252, 248, 0.86); /* 详情正文 */
--surface-nav: rgba(250, 252, 248, 0.84); /* 导航 */
--surface-menu: rgba(250, 252, 248, 0.96); /* 手机菜单 */
```

最后一个数值越大越不透明。更新静态文件后，修改 HTML 引用中的 `?v=` 版本值；若用了 CDN，再刷新对应资源缓存。

## 数据、认证与限制

- `data/posts.json`：文章数组；`data/works.json`：作品数组；`data/uploads/`：上传图片。文件不存在视为空集合，首次保存时创建。
- 写入在集合锁内进行：先写同目录临时文件、`sync_all`，再重命名替换；写入失败不会修改内存中的内容。**同一数据目录只支持一个进程**，不支持多副本共享 JSON。
- 备份整个数据目录。需要一致快照时暂停后台写入或停止服务；上传目录和两个 JSON 文件一起恢复。原子替换不能替代备份。
- 登录令牌存放在浏览器 `sessionStorage`，最长 12 小时，最多 20 个会话；退出后撤销，服务重启后全部失效。生产通过 HTTPS 访问。
- 登录全站共享每分钟 10 次的尝试额度，超限返回 `429` 和 `Retry-After: 60`，适合单人管理站点。
- PNG / JPEG / WebP 按文件头识别，单张最多 **20 MiB**，每件作品最多 **30 张不同图片（含封面）**。不做图片转码或完整解码；上传前自行压缩。
- 删除作品或移除图片引用不会删除原始文件，避免破坏共享引用；未使用图片可在备份后人工清理。
- JSON 请求默认上限 2 MiB。文章标题、摘要、正文分别最多 300 / 4000 / 1,000,000 UTF-8 字节，正文最多 2000 段；作品标题最多 200 字节、描述最多 30000 字节。
- API 响应使用 `no-store`；静态文件使用 `no-cache`，允许客户端重新验证。内部存储错误只写服务器日志。

## API

管理请求使用 `Authorization: Bearer <token>`。正常读请求返回 `200`，创建返回 `201`，删除和会话检查返回 `204`。

| 方法               | 路径                | 登录     | 说明                                       |
| ------------------ | ------------------- | -------- | ------------------------------------------ |
| GET                | `/api/health`       | 否       | 健康检查                                   |
| POST               | `/api/auth/login`   | 否       | JSON `{username,password}`，返回 `{token}` |
| GET                | `/api/auth/session` | 是       | 检查当前会话                               |
| POST               | `/api/auth/logout`  | 是       | 撤销当前令牌                               |
| GET / POST         | `/api/posts`        | 写入需要 | 文章列表 / 创建                            |
| GET / PUT / DELETE | `/api/posts/{id}`   | 写入需要 | 文章详情 / 更新 / 删除                     |
| GET / POST         | `/api/works`        | 写入需要 | 作品列表 / 创建                            |
| GET / PUT / DELETE | `/api/works/{id}`   | 写入需要 | 作品详情 / 更新 / 删除                     |
| POST               | `/api/uploads`      | 是       | 原始图片字节，返回 `{url}`；不是 multipart |

文章字段：`title, date, category, excerpt, image, content: string[]`。作品字段：`title, date, category, description, cover, images: string[], software, featured`。创建时由服务器生成 `id`，更新使用完整对象。

业务错误返回 `{ "error": "说明" }`。非法 JSON、错误 Content-Type、请求超大等框架级错误可能是纯文本；客户端应先检查状态码。

## Linux 部署

两种方式二选一，均通过反向代理提供 HTTPS。已有站点先备份数据和代理配置，发布代码时保留 `data/` 和 `.env`。

### Docker Compose

在仓库目录执行：

```bash
cp .env.example .env
chmod 600 .env
# 编辑 .env，填写自己的 BLOG_ADMIN_PASSWORD
mkdir -p data
sudo chown -R 10001:10001 data
docker compose up -d --build
curl -f http://127.0.0.1:3001/api/health
```

容器使用 UID/GID `10001`，只读根文件系统，数据目录单独挂载。端口仅暴露到服务器回环地址 `127.0.0.1:3001`。查看日志：`docker compose logs -f --tail=100`。

### 原生二进制 + systemd

以下示例使用 `/opt/blog` 和专用 `blog` 用户。目录或用户名不同，需同步调整服务文件。由部署账号在 Linux 上构建：

```bash
cargo build --locked --release
sudo useradd --system --no-create-home --shell /usr/sbin/nologin blog
sudo mkdir -p /opt/blog
sudo install -d /opt/blog/target/release
sudo install -m 755 target/release/blog /opt/blog/target/release/blog
sudo cp -a public /opt/blog/
sudo install -m 600 .env.example /opt/blog/.env
# 编辑 /opt/blog/.env，填写后台密码
sudo install -d -o blog -g blog -m 700 /opt/blog/data
sudo cp deploy/portfolio.service /etc/systemd/system/blog.service
sudo systemctl daemon-reload
sudo systemctl enable --now blog
curl -f http://127.0.0.1:3001/api/health
```

仅在首次安装时复制 `.env.example`。更新时只替换二进制和 `public/`，保留数据与配置，然后 `sudo systemctl restart blog`。查看日志：`journalctl -u blog -n 100 --no-pager`。

### HTTPS 反向代理

Nginx：将 `deploy/nginx-locations.conf` 中的内容放入已有 HTTPS `server`，检查 `sudo nginx -t` 后再 reload。

Apache：启用 `proxy` / `proxy_http`，将 `deploy/apache-proxy.conf` 放入已有 HTTPS `VirtualHost`，执行 `sudo apachectl configtest` 后再 reload。

示例代理整个站点到端口 3001，博客、作品集与 API 共用后端；不要和旧的 `/api/` 路由同时生效。证书和域名由服务器现有配置管理。代理或 CDN 的上传限制也需要允许 20 MiB 请求。

### 升级与回滚

1. 备份 `data/`、`.env`、当前二进制、`public/` 和反向代理配置。
2. 在新目录构建并跑测试，再替换应用文件；保留生产数据路径。
3. 重启后检查健康接口、文章、作品、登录和图片上传。
4. 若需回滚，恢复上一版二进制和静态文件，保留最新数据；只有确实需要数据恢复时才使用备份，并先暂停写入。

这次整理保留旧 JSON 字段和 `/api/` 路径，不需要数据库迁移。

## 开发检查

如果你正在学习 Rust 异步，可以先阅读 **[项目配套异步教程（HTML）](docs/rust-async/README.html)**，或查看 [练习说明](docs/rust-async/README.md)。教程从本项目讲解 TCP、Tokio、Axum、共享状态与持久化，并附带可运行的 TCP 示例。

前端格式工具固定在 `package-lock.json` 中，仅用于开发。先运行 `npm ci --ignore-scripts`，使用 `npm run format` 统一 HTML / CSS / JavaScript 格式。

```bash
npm run format:check
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo build --locked
node --test tests/frontend.test.mjs
node tests/api-smoke.mjs
```

依赖已缓存时，可给 Cargo 命令添加 `--offline`。集成测试使用系统临时目录和操作系统分配的端口，不读写真实 `data/`；覆盖鉴权顺序、上传限制、增删改、并发写入、磁盘失败回滚、重启持久化、限流和损坏数据保护。GitHub Actions 在 Linux 和 Windows 上执行相同检查。

## 仓库内容

提交网站源码、构建配置和公共媒体；`.gitignore` 排除密码文件、运行数据、编译输出、Blender 工程和本机部署记录。仓库暂未指定开源许可证；作品图片、视频与个人文案的使用请联系作者。
