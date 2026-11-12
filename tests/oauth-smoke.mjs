import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

// Deliberately fake client credentials. Tests never exchange a code with a real provider.
const directory = await mkdtemp(path.join(os.tmpdir(), "blog-oauth-test-"));
const config = path.join(directory, "auth-providers.json");
await writeFile(
  config,
  JSON.stringify({
    origin: "https://blog.example",
    github: {
      client_id: "test-github",
      client_secret: "not-a-real-secret",
      allowed_user_id: 1,
    },
    google: {
      client_id: "test-google",
      client_secret: "not-a-real-secret",
      allowed_email: "owner@gmail.com",
    },
  }),
);
const child = spawn(
  path.resolve(
    "target/debug/blog" + (process.platform === "win32" ? ".exe" : ""),
  ),
  {
    env: {
      ...process.env,
      BLOG_BIND: "127.0.0.1:0",
      BLOG_DATA_DIR: directory,
      BLOG_PUBLIC_DIR: path.resolve("public"),
      BLOG_OAUTH_CONFIG: config,
      BLOG_ADMIN_PASSWORD: "test-legacy-disabled",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));
try {
  for (let i = 0; i < 100 && !output.match(/http:\/\/127\.0\.0\.1:\d+/); i++) {
    if (child.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const base = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(base, output);
  const call = (url, options = {}) =>
    fetch(base + url, {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
  assert.deepEqual(await (await call("/api/auth/providers")).json(), {
    github: true,
    google: true,
    password: false,
  });
  assert.equal(
    (
      await call("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "test-legacy-disabled",
        }),
      })
    ).status,
    401,
  );
  assert.equal((await call("/api/auth/session")).status, 401);
  for (const provider of ["github", "google"]) {
    const begin = await call(
      `/api/auth/${provider}/start?return_to=${encodeURIComponent("/admin.html?module=weekly")}`,
    );
    assert.equal(begin.status, 303);
    assert.equal(begin.headers.get("cache-control"), "no-store");
    assert.equal(begin.headers.get("referrer-policy"), "no-referrer");
    const destination = new URL(begin.headers.get("location"));
    assert.equal(
      destination.origin,
      provider === "github"
        ? "https://github.com"
        : "https://accounts.google.com",
    );
    assert.equal(destination.searchParams.get("code_challenge_method"), "S256");
    assert.equal(
      destination.searchParams.get("redirect_uri"),
      `https://blog.example/api/auth/${provider}/callback`,
    );
    const cookie = begin.headers.get("set-cookie");
    for (const flag of ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"])
      assert.ok(cookie.includes(flag));
    const csrf = destination.searchParams.get("state");
    const url = `/api/auth/${provider}/callback?state=${encodeURIComponent(csrf)}&error=access_denied`;
    const wrongBrowser = await call(url);
    assert.match(wrongBrowser.headers.get("location"), /invalid_state/);
    const cancelled = await call(url, {
      headers: { Cookie: cookie.split(";")[0] },
    });
    assert.equal(
      cancelled.headers.get("location"),
      "/admin.html?module=weekly&auth_error=cancelled",
    );
    const replay = await call(url, {
      headers: { Cookie: cookie.split(";")[0] },
    });
    assert.match(replay.headers.get("location"), /invalid_state/);
  }
  const redirect = await call(
    "/api/auth/github/start?return_to=https://evil.example",
  );
  const url = new URL(redirect.headers.get("location"));
  const denied = await call(
    "/api/auth/github/callback?state=" +
      encodeURIComponent(url.searchParams.get("state")) +
      "&error=access_denied",
    { headers: { Cookie: redirect.headers.get("set-cookie").split(";")[0] } },
  );
  assert.equal(
    denied.headers.get("location"),
    "/admin.html?auth_error=cancelled",
  );
  assert.equal((await call("/api/auth/unknown/start")).status, 404);
  for (const route of ["/api/posts", "/api/works", "/api/uploads"])
    assert.equal(
      (await call(route, { method: "POST", body: "invalid" })).status,
      401,
    );
  console.log(
    "PASS: OAuth-only config, provider redirects, PKCE, secure cookies, browser binding, replay rejection, safe returns, password disabled and protected writes",
  );
} finally {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  await rm(directory, { recursive: true, force: true });
}
