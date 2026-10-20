import { spawn } from "node:child_process";
import { mkdtemp, readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "blog-test-"));
const password = randomBytes(24).toString("hex");
let child, base;
async function start() {
  child = spawn(
    path.resolve(
      "target/debug/blog" + (process.platform === "win32" ? ".exe" : ""),
    ),
    {
      env: {
        ...process.env,
        BLOG_BIND: "127.0.0.1:0",
        BLOG_DATA_DIR: dataDir,
        BLOG_PUBLIC_DIR: path.resolve("public"),
        BLOG_ADMIN_USERNAME: "admin",
        BLOG_ADMIN_PASSWORD: password,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let errors = "",
    output = "",
    spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  child.stderr.on("data", (data) => {
    errors += data;
  });
  child.stdout.on("data", (data) => {
    output += data;
  });
  for (let i = 0; i < 150; i++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error("Server exited: " + errors);
    const address = output.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (address) {
      base = address[0];
      if ((await call("/api/health")).ok) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not start: " + errors);
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  const timer = setTimeout(() => child.kill("SIGKILL"), 8000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}
const call = (url, options = {}) =>
  fetch(base + url, { ...options, signal: AbortSignal.timeout(15000) });
const auth = (token) => ({ Authorization: "Bearer " + token });
const json = (data, token, method = "POST") => ({
  method,
  headers: {
    "Content-Type": "application/json",
    ...(token ? auth(token) : {}),
  },
  body: JSON.stringify(data),
});
async function login() {
  const response = await call(
    "/api/auth/login",
    json({ username: "admin", password }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return (await response.json()).token;
}

try {
  await start();
  for (const page of [
    "/",
    "/article.html",
    "/portfolio.html",
    "/work.html",
    "/admin.html",
    "/studio.html",
    "/common.js",
  ])
    assert.equal((await call(page)).status, 200, page);
  assert.deepEqual(await (await call("/api/posts")).json(), []);
  assert.equal((await call("/api/does-not-exist")).status, 404);
  assert.equal(
    (
      await call(
        "/api/auth/login",
        json({ username: "admin", password: "wrong" }),
      )
    ).status,
    401,
  );
  const token = await login();
  const input = {
    title: "持久化测试",
    category: "环境场景",
    date: "2026-10-19",
    description: "中文描述\n第二行",
    cover: "/assets/works/blue-hour.png",
    images: [],
    software: "Blender",
    featured: true,
  };
  // Auth must precede content-type checks and body parsing.
  for (const route of ["/api/posts", "/api/works", "/api/uploads"])
    assert.equal(
      (await call(route, { method: "POST", body: "invalid body" })).status,
      401,
      route,
    );
  assert.equal(
    (
      await call(
        "/api/works",
        json({ ...input, cover: "javascript:alert(1)" }, token),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/works",
        json(
          {
            ...input,
            images: Array.from({ length: 30 }, (_, i) => `/assets/${i}.png`),
          },
          token,
        ),
      )
    ).status,
    400,
  );
  let response = await call("/api/works", json(input, token));
  assert.equal(response.status, 201);
  const work = await response.json();
  assert.equal(
    (
      await call(
        "/api/works/" + work.id,
        json({ ...input, title: "更新后的作品" }, token, "PUT"),
      )
    ).status,
    200,
  );
  const png = await readFile("public/assets/works/blue-hour.png");
  assert.equal(
    (
      await call("/api/uploads", {
        method: "POST",
        headers: auth(token),
        body: "<svg></svg>",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/api/uploads", {
        method: "POST",
        headers: auth(token),
        body: Buffer.alloc(20 * 1024 * 1024 + 1),
      })
    ).status,
    413,
  );
  response = await call("/api/uploads", {
    method: "POST",
    headers: auth(token),
    body: png,
  });
  assert.equal(response.status, 201);
  const upload = await response.json();
  assert.match(upload.url, /^\/uploads\/[a-f0-9-]+\.png$/);
  response = await call(upload.url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
  const post = {
    title: "兼容测试",
    excerpt: "摘要",
    category: "STUDY",
    date: "2026.10.19",
    image: "assets/cover-featured.svg",
    content: ["正文"],
  };
  assert.equal(
    (await call("/api/posts", json({ ...post, content: ["  "] }, token)))
      .status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/posts",
        json({ ...post, image: "javascript:alert(1)" }, token),
      )
    ).status,
    400,
  );
  response = await call("/api/posts", json(post, token));
  assert.equal(response.status, 201);
  const savedPost = await response.json();
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      call("/api/posts", json({ ...post, title: `并发 ${i}` }, token)),
    ),
  );
  assert.ok(concurrent.every((response) => response.status === 201));
  assert.equal((await (await call("/api/posts")).json()).length, 9);
  // A failed disk write must leave both memory and the saved collection unchanged.
  await mkdir(path.join(dataDir, "posts.json.tmp"));
  response = await call(
    "/api/posts",
    json({ ...post, title: "不应保存" }, token),
  );
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "保存失败，请检查服务器日志",
  });
  assert.equal((await (await call("/api/posts")).json()).length, 9);
  await rm(path.join(dataDir, "posts.json.tmp"), { recursive: true });
  await stop();
  await start();
  assert.equal(
    (await (await call("/api/works/" + work.id)).json()).title,
    "更新后的作品",
  );
  assert.equal((await call(upload.url)).status, 200);
  assert.equal((await (await call("/api/posts")).json()).length, 9);
  assert.equal(
    (await call("/api/auth/session", { headers: auth(token) })).status,
    401,
  );
  const fresh = await login();
  assert.equal(
    (
      await call(
        "/api/posts/" + savedPost.id,
        json({ ...post, title: "更新文章" }, fresh, "PUT"),
      )
    ).status,
    200,
  );
  assert.equal(
    (await (await call("/api/posts/" + savedPost.id)).json()).title,
    "更新文章",
  );
  assert.equal(
    (
      await call("/api/posts/" + savedPost.id, {
        method: "DELETE",
        headers: auth(fresh),
      })
    ).status,
    204,
  );
  assert.equal((await call("/api/posts/" + savedPost.id)).status, 404);
  assert.equal(
    (
      await call("/api/works/" + work.id, {
        method: "DELETE",
        headers: auth(fresh),
      })
    ).status,
    204,
  );
  assert.equal((await call("/api/works/" + work.id)).status, 404);
  assert.equal(
    (await call("/api/auth/logout", { method: "POST", headers: auth(fresh) }))
      .status,
    204,
  );
  assert.equal(
    (await call("/api/auth/session", { headers: auth(fresh) })).status,
    401,
  );
  for (let i = 0; i < 9; i++)
    assert.equal(
      (
        await call(
          "/api/auth/login",
          json({ username: "admin", password: "wrong" }),
        )
      ).status,
      401,
    );
  response = await call(
    "/api/auth/login",
    json({ username: "admin", password }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  await stop();
  await writeFile(path.join(dataDir, "works.json"), "broken JSON");
  await assert.rejects(start, /Server exited/);
  assert.equal(
    await readFile(path.join(dataDir, "works.json"), "utf8"),
    "broken JSON",
  );
  console.log(
    "PASS: auth before parsing, validation, CRUD, upload limits, concurrent writes, failed-write rollback, restart persistence, rate limits, corrupt-data preservation",
  );
} finally {
  await stop();
  await rm(dataDir, { recursive: true, force: true });
}
