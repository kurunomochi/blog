(() => {
  "use strict";
  async function init(client, ready) {
    const form = document.querySelector("#login-form");
    const status = document.querySelector("#login-message");
    const area = document.querySelector("#oauth-login");
    const retry = document.querySelector("#login-retry");
    const url = new URL(location.href);
    const errors = {
      denied: "这个账号没有后台管理权限，请使用站主账号。",
      cancelled: "已取消授权，可以重新登录。",
      invalid_state: "登录请求已过期或不属于当前浏览器，请重新登录。",
      failed: "授权登录暂时失败，请重试；若持续失败，请检查授权应用配置。",
    };
    const reason = url.searchParams.get("auth_error");
    url.searchParams.delete("auth_error");
    history.replaceState(null, "", url);
    retry.onclick = () => init(client, ready);
    form.hidden = true;
    retry.hidden = true;
    status.textContent = "正在检查登录状态…";
    try {
      const config = await Blog.request("/api/auth/providers");
      if (!config.password) client.clearToken();
      form.hidden = !config.password;
      const destination =
        location.pathname === "/studio.html"
          ? "/studio.html"
          : "/admin.html" +
            (["reviews", "weekly"].includes(url.searchParams.get("module"))
              ? "?module=" + url.searchParams.get("module")
              : "");
      area.replaceChildren();
      for (const [provider, label] of [
        ["github", "GitHub"],
        ["google", "Google"],
      ]) {
        if (!config[provider]) continue;
        const link = document.createElement("a");
        link.className = "oauth-button oauth-" + provider;
        link.href =
          "/api/auth/" +
          provider +
          "/start?return_to=" +
          encodeURIComponent(destination);
        link.textContent = "使用 " + label + " 登录";
        area.append(link);
      }
      document.querySelector("#oauth-note").textContent =
        config.github || config.google
          ? "仅站主授权的账号可进入管理后台。"
          : "第三方登录尚未配置，请暂时使用原管理员账号。";
      try {
        await ready();
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      status.textContent = errors[reason] || "";
    } catch (error) {
      status.textContent = "无法检查登录状态：" + error.message;
      retry.hidden = false;
    }
  }
  window.AdminLogin = { init };
})();
