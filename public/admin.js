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
let allPosts = [];
const moduleName = new URLSearchParams(location.search).get("module");
const weeklyMode = moduleName === "weekly";
const reviewMode = moduleName === "reviews" || weeklyMode;
const reviewCategory = weeklyMode ? "每周总结" : "每日复盘";
const itemName = weeklyMode ? "周总结" : reviewMode ? "复盘" : "文章";
if (reviewMode) {
  document.title = `${reviewCategory}管理 · kurumochi`;
  document.querySelector(".admin-header h1").textContent =
    `${reviewCategory}管理`;
  document.querySelector(".dashboard-toolbar h2").textContent =
    `${itemName}列表`;
  document.querySelector("#new-post").textContent = weeklyMode
    ? "写本周总结"
    : "写今日复盘";
  postForm.querySelector('button[type="submit"]').textContent =
    `保存并发布${itemName}`;
  postForm.elements.date.type = "date";
  postForm.elements.category.closest("label").hidden = true;
  postForm.elements.image.closest("label").hidden = true;
  postForm.elements.image.required = false;
}
if (weeklyMode) {
  document.querySelector("#weekly-tools").hidden = false;
  document.querySelector("#weekly-editor-tools").hidden = false;
  document.querySelector("#weekly-date").value = ReviewData.today();
  showWeekRange();
}
function showWeekRange() {
  const start = ReviewData.weekStart(
    document.querySelector("#weekly-date").value,
  );
  document.querySelector("#weekly-range").textContent = start
    ? `${start} — ${ReviewData.shift(start, 6)}（周一至周日）`
    : "请选择有效日期";
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
    allPosts = all;
    posts = reviewMode
      ? all
          .filter((post) => post.category === reviewCategory)
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
  postForm.elements.image.required = !["每日复盘", "每周总结"].includes(
    post.category,
  );
  editorTitle.textContent = `编辑${itemName}`;
  for (const [name, value] of Object.entries({
    ...post,
    date: reviewMode ? ReviewData.dateKey(post.date) : post.date,
    content: post.content.join("\n"),
  })) {
    if (postForm.elements[name]) postForm.elements[name].value = value;
  }
  postForm.hidden = false;
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startCreate() {
  if (uploading || saving) return;
  if (weeklyMode) {
    document.querySelector("#weekly-date").value = ReviewData.today();
    showWeekRange();
    openWeekly();
    return;
  }
  editingId = null;
  editorTitle.textContent = `新建${itemName}`;
  postForm.reset();
  postForm.elements.image.required = !reviewMode;
  postForm.elements.image.value = "assets/cover-featured.svg";
  if (reviewMode) {
    const date = ReviewData.today();
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

async function openWeekly() {
  if (uploading || saving) return;
  const day = ReviewData.weekStart(
    document.querySelector("#weekly-date").value,
  );
  if (!day) {
    setMessage(dashboardMessage, "请选择有效日期");
    return;
  }
  if (
    !postForm.hidden &&
    !confirm("打开所选周会丢弃当前未保存的编辑，继续吗？")
  )
    return;
  saving = true;
  try {
    allPosts = await request("/api/posts");
    posts = allPosts.filter((p) => p.category === reviewCategory);
    const existing = posts.find((p) => ReviewData.weekStart(p.date) === day);
    saving = false;
    if (existing) {
      startEdit(existing.id);
      return;
    }
    editingId = null;
    postForm.reset();
    const draft = ReviewData.draft(allPosts, day);
    for (const [name, value] of Object.entries(draft))
      postForm.elements[name].value =
        name === "content" ? value.join("\n") : value;
    postForm.elements.image.required = false;
    editorTitle.textContent = "整理周总结";
    postForm.hidden = false;
    postForm.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessage(
      dashboardMessage,
      "已提取本周复盘，请整理内容、补充下周计划后保存发布。",
    );
  } catch (error) {
    setMessage(dashboardMessage, error.message);
  } finally {
    saving = false;
  }
}

document
  .querySelector("#weekly-date")
  .addEventListener("change", showWeekRange);
document
  .querySelector("#weekly-generate")
  .addEventListener("click", openWeekly);
document
  .querySelector("#weekly-refresh")
  .addEventListener("click", async () => {
    if (!weeklyMode || uploading || saving) return;
    const day = ReviewData.weekStart(postForm.elements.date.value);
    if (!day) {
      setMessage(dashboardMessage, "请选择有效日期");
      return;
    }
    if (!confirm("将替换当前正文，包括手写的下周计划。确定重新提取吗？"))
      return;
    saving = true;
    try {
      allPosts = await request("/api/posts");
      postForm.elements.content.value = ReviewData.draft(
        allPosts,
        day,
      ).content.join("\n");
      setMessage(
        dashboardMessage,
        "已重新提取，尚未保存，请检查并补充下周计划。",
      );
    } catch (error) {
      setMessage(dashboardMessage, error.message);
    } finally {
      saving = false;
    }
  });

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
    data.category = reviewCategory;
    if (weeklyMode) data.date = ReviewData.weekStart(data.date);
    data.date = data.date.replaceAll("-", ".");
  }
  data.content = data.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  saving = true;
  try {
    if (weeklyMode) {
      if (!ReviewData.dateKey(data.date)) throw new Error("请选择有效日期");
      const latest = await request("/api/posts");
      const duplicate = latest.find(
        (p) =>
          p.category === "每周总结" &&
          ReviewData.weekStart(p.date) === ReviewData.weekStart(data.date) &&
          p.id !== editingId,
      );
      if (duplicate)
        throw new Error("这一周已有总结，请从列表编辑已有记录，避免重复发布。");
    }
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

AdminLogin.init(client, showDashboard);

async function insertUploads(event, kind) {
  const files = [...event.target.files];
  if (!files.length || uploading || saving) return;
  const images = kind === "image";
  const label = images ? "图片" : "视频";
  const output = document.querySelector(
    images ? "#image-message" : "#video-message",
  );
  const allowed = images ? /\.(png|jpe?g|webp)$/i : /\.mp4$/i;
  const limit = (images ? 20 : 100) * 1024 * 1024;
  const invalid = files.find(
    (file) => !allowed.test(file.name) || !file.size || file.size > limit,
  );
  if (invalid) {
    setMessage(
      output,
      `${invalid.name}：${images ? "请选择 PNG、JPG、WebP，每张不超过 20 MB" : "请选择 MP4，最大 100 MB"}，文件不能为空。`,
    );
    event.target.value = "";
    return;
  }
  const content = postForm.elements.content;
  let start = content.selectionStart,
    end = content.selectionEnd;
  const controls = [...dashboard.querySelectorAll("button, input, textarea")];
  const previous = controls.map((control) => control.disabled);
  uploading = true;
  controls.forEach((control) => (control.disabled = true));
  let inserted = 0;
  try {
    for (const file of files) {
      setMessage(
        output,
        `正在上传 ${inserted + 1}/${files.length}：${file.name}，请勿关闭页面…`,
      );
      const result = await Blog.uploadMedia(client, file);
      if (
        !Blog.imageUrl(result.url) ||
        (images ? Blog.isVideo(result.url) : !Blog.isVideo(result.url))
      )
        throw new Error("文件内容与所选媒体类型不符，请检查文件格式。");
      const caption =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[\[\]\\\r\n]/g, " ")
          .trim() || "图片";
      const block = images
        ? `![${caption}](${result.url})`
        : `[video](${result.url})`;
      content.setRangeText(`\n${block}\n`, start, end, "end");
      start = end = content.selectionEnd;
      inserted++;
    }
    setMessage(
      output,
      `${inserted} 个${label}已插入正文，保存发布后显示。可以移动对应行调整位置。`,
    );
  } catch (error) {
    setMessage(
      output,
      `${error.message}${inserted ? ` 已插入 ${inserted} 个${label}，仍需保存发布；其余文件可重新选择上传。` : ""}`,
    );
  } finally {
    uploading = false;
    controls.forEach((control, i) => (control.disabled = previous[i]));
    event.target.value = "";
  }
}
document
  .querySelector("#post-video")
  .addEventListener("change", (event) => insertUploads(event, "video"));
document
  .querySelector("#post-images")
  .addEventListener("change", (event) => insertUploads(event, "image"));
