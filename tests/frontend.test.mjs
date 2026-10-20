import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("public/common.js", "utf8");
function setup(fetch) {
  const storage = new Map();
  const context = {
    window: {},
    URL,
    Headers,
    AbortSignal,
    fetch,
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  vm.runInNewContext(source, context);
  return context.window.Blog;
}

test("HTML and image URLs cannot inject active content", () => {
  const blog = setup();
  assert.equal(
    blog.escapeHtml('<img onerror="bad">&'),
    "&lt;img onerror=&quot;bad&quot;&gt;&amp;",
  );
  for (const value of [
    "javascript:alert(1)",
    "/uploads/../data",
    "/uploads/%2e%2e/data",
    "https://",
    "https://user:pass@example.com/a.png",
    "//evil.com/a.png",
  ])
    assert.equal(blog.imageUrl(value), "", value);
  for (const value of [
    "/assets/works/a.png",
    "/uploads/a.webp",
    "https://example.com/a.png",
  ])
    assert.equal(blog.imageUrl(value), value);
});
test("expired admin session is cleared on 401", async () => {
  let signedOut = 0;
  const blog = setup(
    async () => new Response('{"error":"需要管理员登录"}', { status: 401 }),
  );
  const client = blog.adminClient(() => signedOut++);
  client.setToken("expired");
  await assert.rejects(
    client.request("/api/auth/session"),
    (error) => error.status === 401,
  );
  assert.equal(client.hasToken(), false);
  assert.equal(signedOut, 1);
});
test("JSON and binary requests keep appropriate content types", async () => {
  const seen = [];
  const blog = setup(async (_, options) => {
    seen.push(options);
    return new Response(null, { status: 204 });
  });
  const client = blog.adminClient(() => {});
  client.setToken("valid");
  await client.request("/api/posts", { method: "POST", body: "{}" });
  await client.request("/api/uploads", {
    method: "POST",
    body: new Uint8Array([1, 2]),
  });
  assert.equal(seen[0].headers.get("Content-Type"), "application/json");
  assert.equal(seen[1].headers.get("Content-Type"), null);
  assert.equal(seen[1].headers.get("Authorization"), "Bearer valid");
});
