const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboardMessage = document.querySelector("#dashboard-message");
const postList = document.querySelector("#post-list");
const postForm = document.querySelector("#post-form");
const editorTitle = document.querySelector("#editor-title");
const client = Blog.adminClient(signedOut);
const request = (path, options) => client.request(path, options);
let editingId = null;
let posts = [];
let uploading = false;
let saving = false;
const reviewMode =
  new URLSearchParams(location.search).get("module") === "reviews";
const itemName = reviewMode ? "复盘" : "文章";
if (reviewMode) {
  document.title = "每日复盘管理 · kurumochi";
  document.querySelector(".admin-header h1").textContent = "每日复盘管理";
  document.querySelector(".dashboard-toolbar h2").textContent = "复盘列表";
  document.querySelector("#new-post").textContent = "写今日复盘";
  postForm.querySelector('button[type="submit"]').textContent =
    "保存并发布复盘";
  postForm.elements.date.type = "date";
  postForm.elements.category.closest("label").hidden = true;
  postForm.elements.image.closest("label").hidden = true;
  postForm.elements.image.required = false;
}

function setMessage(element, message) {
  element.textContent = message;
}

function signedOut() {
  client.clearToken();
  dashboard.hidden = true;
  loginPanel.hidden = false;
  setMessage(loginMessage, "请重新登录");
}
async function showDashboard() {
  await request("/api/auth/session");
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadPosts();
}

function renderPosts() {
  postList.innerHTML = posts
    .map(
      (post) => `
    <article class="post-row">
      <div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.date)} · ${escapeHtml(post.category)} · ${escapeHtml(post.id)}</p></div>
      <div class="row-actions"><button type="button" data-edit="${escapeHtml(post.id)}">编辑</button><button class="secondary" type="button" data-delete="${escapeHtml(post.id)}">删除</button></div>
    </article>
  `,
    )
    .join("");
  postList
    .querySelectorAll("[data-edit]")
    .forEach((button) =>
      button.addEventListener("click", () => startEdit(button.dataset.edit)),
    );
  postList
    .querySelectorAll("[data-delete]")
    .forEach((button) =>
      button.addEventListener("click", () => removePost(button.dataset.delete)),
    );
}

const escapeHtml = Blog.escapeHtml;

async function loadPosts() {
  try {
    const all = await request("/api/posts");
    posts = reviewMode
      ? all
          .filter((post) => post.category === "每日复盘")
          .sort((a, b) =>
            b.date
              .replaceAll(".", "-")
              .localeCompare(a.date.replaceAll(".", "-")),
          )
      : all;
    renderPosts();
  } catch (error) {
    setMessage(dashboardMessage, error.message);
  }
}

function startEdit(id) {
  if (uploading || saving) return;
  const post = posts.find((item) => item.id === id);
  if (!post) return;
  editingId = id;
  postForm.elements.image.required = post.category !== "每日复盘";
  editorTitle.textContent = `编辑${itemName}`;
  for (const [name, value] of Object.entries({
    ...post,
    date: reviewMode ? post.date.replaceAll(".", "-") : post.date,
    content: post.content.join("\n"),
  })) {
    if (postForm.elements[name]) postForm.elements[name].value = value;
  }
  postForm.hidden = false;
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startCreate() {
  if (uploading || saving) return;
  editingId = null;
  editorTitle.textContent = `新建${itemName}`;
  postForm.reset();
  postForm.elements.image.required = !reviewMode;
  postForm.elements.image.value = "assets/cover-featured.svg";
  if (reviewMode) {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    postForm.elements.date.value = date;
    postForm.elements.title.value = `${date} 每日复盘`;
    postForm.elements.category.value = "每日复盘";
    postForm.elements.image.value = "";
    postForm.elements.image.required = false;
    postForm.elements.content.value =
      "# 今日目标\n\n# 完成情况\n\n# 问题与收获\n\n# 明日计划\n";
  }
  postForm.hidden = false;
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removePost(id) {
  if (uploading || saving) return;
  if (!confirm(`确定删除这篇${itemName}吗？`)) return;
  try {
    await request(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
    setMessage(dashboardMessage, `${itemName}已删除`);
    await loadPosts();
  } catch (error) {
    setMessage(dashboardMessage, error.message);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  const data = Object.fromEntries(new FormData(loginForm));
  try {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    client.setToken(result.token);
    loginForm.reset();
    setMessage(loginMessage, "");
    await showDashboard();
  } catch (error) {
    setMessage(loginMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (uploading || saving) return;
  const button = postForm.querySelector("button[type=submit]");
  button.disabled = true;
  const data = Object.fromEntries(new FormData(postForm));
  if (reviewMode) {
    data.category = "每日复盘";
    data.date = data.date.replaceAll("-", ".");
  }
  data.content = data.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  saving = true;
  try {
    const path = editingId
      ? `/api/posts/${encodeURIComponent(editingId)}`
      : "/api/posts";
    await request(path, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    postForm.hidden = true;
    setMessage(
      dashboardMessage,
      editingId ? `${itemName}已更新` : `${itemName}已发布`,
    );
    await loadPosts();
  } catch (error) {
    setMessage(dashboardMessage, error.message);
  } finally {
    saving = false;
    button.disabled = false;
  }
});

document.querySelector("#new-post").addEventListener("click", startCreate);
document.querySelector("#cancel-edit").addEventListener("click", () => {
  if (uploading || saving) return;
  postForm.hidden = true;
});
document.querySelector("#logout").addEventListener("click", async () => {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } catch (error) {
    setMessage(dashboardMessage, error.message);
    return;
  }
  signedOut();
  setMessage(loginMessage, "");
});

if (client.hasToken())
  showDashboard().catch((error) => {
    signedOut();
    setMessage(loginMessage, error.message);
  });

document
  .querySelector("#post-video")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file || uploading) return;
    const output = document.querySelector("#video-message");
    if (!/\.mp4$/i.test(file.name)) {
      setMessage(output, "请选择 MP4 视频");
      event.target.value = "";
      return;
    }
    const content = postForm.elements.content;
    const start = content.selectionStart,
      end = content.selectionEnd;
    const controls = [...dashboard.querySelectorAll("button, input, textarea")];
    const previous = controls.map((control) => control.disabled);
    uploading = true;
    controls.forEach((control) => (control.disabled = true));
    setMessage(output, `正在上传 ${file.name}，请勿关闭页面…`);
    try {
      const result = await Blog.uploadMedia(client, file);
      content.setRangeText(`\n[video](${result.url})\n`, start, end, "end");
      setMessage(
        output,
        "视频已插入正文，保存文章后发布。可以移动这一行调整视频位置。",
      );
    } catch (error) {
      setMessage(output, error.message);
    } finally {
      uploading = false;
      controls.forEach((control, i) => (control.disabled = previous[i]));
      event.target.value = "";
    }
  });
