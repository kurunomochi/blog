(() => {
  "use strict";
  const TOKEN_KEY = "blog-admin-token";
  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function imageUrl(value) {
    if (
      typeof value !== "string" ||
      value.length > 2048 ||
      /[\s\x00-\x1f\x7f\\<>"']/.test(value) ||
      value.includes("..")
    )
      return "";
    if (
      /^\/(assets|uploads)\/.+/.test(value) &&
      !value.includes("%") &&
      !value.endsWith("/")
    )
      return value;
    try {
      const url = new URL(value);
      if (
        value.startsWith("https://") &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password
      )
        return value;
    } catch {
      /* Invalid image URLs are omitted. */
    }
    return "";
  }
  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      signal: options.signal || AbortSignal.timeout(60000),
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body.error ||
          (response.status === 413
            ? "图片或内容超过大小限制"
            : "请求失败，请稍后重试"),
      );
      error.status = response.status;
      throw error;
    }
    return body;
  }
  function adminClient(onSignedOut) {
    return {
      hasToken: () => Boolean(sessionStorage.getItem(TOKEN_KEY)),
      setToken: (token) => sessionStorage.setItem(TOKEN_KEY, token),
      clearToken: () => sessionStorage.removeItem(TOKEN_KEY),
      async request(path, options = {}) {
        const headers = new Headers(options.headers);
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (token) headers.set("Authorization", "Bearer " + token);
        if (typeof options.body === "string" && !headers.has("Content-Type"))
          headers.set("Content-Type", "application/json");
        try {
          return await request(path, { ...options, headers });
        } catch (error) {
          if (error.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            onSignedOut();
          }
          throw error;
        }
      },
    };
  }
  window.Blog = Object.freeze({ escapeHtml, imageUrl, request, adminClient });
})();
