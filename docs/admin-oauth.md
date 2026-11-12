# 管理后台：GitHub / Google 授权登录

文章、每日复盘、周总结与作品工作室共用管理员会话。授权不等于管理员权限：GitHub 必须匹配配置中的固定数字用户 ID，Google 必须返回已验证的指定邮箱，可额外固定 Google `sub`。

## 为本站创建授权应用

### GitHub

1. 使用 `kurunomochi` 登录，打开 <https://github.com/settings/applications/new>。
2. Application name：`kurumochi Blog Admin`。
3. Homepage URL：`https://nenumochi.top`。
4. Authorization callback URL：`https://nenumochi.top/api/auth/github/callback`。
5. 创建应用，记录 Client ID，生成 Client Secret。不要把 Secret 发到聊天、截图或提交到 Git。

当前账号的数字 ID 为 `247356419`。程序校验该 ID，不依赖可修改的用户名。登录不申请仓库读写权限，只通过用户接口确认身份。

### Google

1. 登录 <https://console.cloud.google.com/>，创建或选择项目。
2. 在 Google Auth Platform 配置 Branding（应用名称、支持邮箱、开发者联系邮箱）。
3. 个人账号在 Audience 选择 External；处于 Testing 时，将 `jiezi124168@gmail.com` 加为测试用户。
4. 在 Clients 创建 Web application 客户端。
5. 添加授权重定向 URI：`https://nenumochi.top/api/auth/google/callback`。本项目使用服务器端流程，不需要 JavaScript 授权来源。
6. 保存 Client ID 和 Client Secret。本项目只请求 `openid email`，不读取 Gmail 邮件、云盘或联系人。

Google 的测试用户设置与博客管理员白名单是两层限制，都需要满足。不要为解决登录失败扩大管理员白名单。

## 在服务器输入凭据

先确认两个授权应用都已创建，然后在自己的终端运行：

```bash
ssh nenumochi@ssh.nenumochi.top
cd /home/nenumochi/wangzhan
python3 scripts/configure-auth.py --restart
```

脚本依次询问两个 Client ID 和 Client Secret；Secret 输入不回显。配置写入 `data/auth-providers.json`，权限为 `0600`，不会存入公开目录或 Git。已有配置会在 `data/` 内保留私有备份。`--restart` 仅适用于本站当前用户拥有、`Restart=always` 的 `blog.service`，会验证 PID 与可执行文件路径后重启。

配置完成后打开 <https://nenumochi.top/admin.html>，用 GitHub、Google 分别登录验证。此时密码登录自动关闭。授权回调会返回原先的文章、每日复盘、周总结或作品管理页面。

如果浏览器授权失败，先检查回调地址是否逐字一致、Client ID 与 Secret 是否来自同一个客户端，以及 Google 测试用户。取消授权、会话过期、非管理员账号和服务端交换失败均有明确提示，但不会把令牌或提供方响应显示到页面。

## 通用部署配置

默认从 `BLOG_DATA_DIR/auth-providers.json` 读取；`BLOG_OAUTH_CONFIG` 可指定另一份非公开文件。配置不存在时使用原来的密码登录，密码仍须通过环境变量提供。配置存在但错误时启动失败，不会悄悄回退为开放访问。正确配置后默认关闭密码登录；确需临时回退时显式设 `allow_password_login: true`，并保留管理员密码环境变量。

```json
{
  "origin": "https://nenumochi.top",
  "allow_password_login": false,
  "github": {
    "client_id": "填写 GitHub Client ID",
    "client_secret": "仅存服务器",
    "allowed_user_id": 247356419
  },
  "google": {
    "client_id": "填写 Google Client ID",
    "client_secret": "仅存服务器",
    "allowed_email": "jiezi124168@gmail.com"
  }
}
```

只启用一家时，省略另一家的字段。Google 的可选 `allowed_sub` 可以在已验证身份后进一步固定账号。`origin` 必须是 HTTPS origin，不含末尾斜杠、路径或查询；回调由配置生成，不信任请求的 Host / Forwarded 头。公共访问域名应与配置一致。

若配置错误导致不能登录，使用 SSH 恢复配置备份；首次配置也可把 `data/auth-providers.json` 改名保存，再重启服务，恢复原密码登录（前提是密码环境变量仍在）。不要删除文章、上传文件或整个 `data/`。

## 会话与验证

- OAuth2 授权码与 S256 PKCE；一次性 state 绑定浏览器 Cookie 和提供方，10 分钟过期。
- 服务端用授权码换取访问令牌，再请求官方用户信息接口；不接受浏览器提交的身份声明或访问令牌，不把未验证的 ID Token 当作身份证明。
- 令牌只在本次服务端请求中使用，不持久化、不进入 URL 或浏览器存储。授权 HTTP 客户端禁用重定向且有超时。
- 会话 Cookie 使用 `Secure; HttpOnly; SameSite=Lax` 和 `__Host-` 前缀，最长 12 小时；退出立即撤销，服务重启后需重新登录。
- Cookie 认证的写操作在解析上传文件前检查精确 Origin 和会话 CSRF Token；密码兼容模式继续支持旧 Bearer API。
- 这是单进程个人站实现；会话和待完成授权存在内存里，不适用于无共享会话存储的多副本部署。

测试包括浏览器绑定、提供方绑定、过期、重放、白名单、CSRF、退出撤销及原有 API 回归。真实提供方的首次授权仍需站主在完成客户端配置后验证。

参考：[GitHub OAuth web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)、[Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)、[Rust oauth2](https://docs.rs/oauth2/5.0.0/oauth2/)。
