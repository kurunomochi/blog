const $ = (s) => document.querySelector(s);
const esc = Blog.escapeHtml;
const client = Blog.adminClient(signedOut);
const api = (path, options) => client.request(path, options);
let works = [],
  editing = null,
  images = [],
  cover = "",
  uploading = false;
const editor = $("#editor");
function message(id, text) {
  $(id).textContent = text;
}
function signedOut() {
  client.clearToken();
  $("#dashboard").hidden = true;
  $("#login-panel").hidden = false;
}
async function load() {
  works = await api("/api/works");
  $("#work-list").innerHTML = works.length
    ? works
        .map(
          (w) =>
            `<article class="studio-row"><img src="${esc(Blog.imageUrl(w.cover))}" alt=""><div class="row-copy"><h3>${esc(w.title)} ${w.featured ? "· 精选" : ""}</h3><p>${esc(w.category)} · ${esc(w.date)}</p></div><div class="studio-actions"><a class="btn secondary" href="/work.html?id=${encodeURIComponent(w.id)}" target="_blank" rel="noopener">查看</a><button class="btn secondary" type="button" data-edit="${esc(w.id)}">编辑</button><button class="btn secondary" type="button" data-delete="${esc(w.id)}">删除</button></div></article>`,
        )
        .join("")
    : '<p class="empty">还没有作品，上传你的第一张渲染图吧。</p>';
  document
    .querySelectorAll("[data-edit]")
    .forEach(
      (b) =>
        (b.onclick = () => edit(works.find((w) => w.id === b.dataset.edit))),
    );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (uploading) {
          message("#dashboard-message", "请等待图片上传完成");
          return;
        }
        if (!confirm("确定删除这件作品？原始上传图片将保留。")) return;
        b.disabled = true;
        try {
          await api("/api/works/" + encodeURIComponent(b.dataset.delete), {
            method: "DELETE",
          });
          if (editing === b.dataset.delete) editor.hidden = true;
          await load();
          message("#dashboard-message", "作品已删除");
        } catch (e) {
          message("#dashboard-message", e.message);
          b.disabled = false;
        }
      }),
  );
}
async function dashboard() {
  await api("/api/auth/session");
  $("#login-panel").hidden = true;
  $("#dashboard").hidden = false;
  await load();
}
function renderImages() {
  $("#image-list").innerHTML = images
    .map(
      (url, i) =>
        `<div class="image-item"><img src="${esc(Blog.imageUrl(url))}" alt="作品图片 ${i + 1}"><button type="button" class="${url === cover ? "selected" : ""}" data-cover="${i}">${url === cover ? "✓ 当前封面" : "设为封面"}</button><button type="button" data-remove="${i}">移除</button></div>`,
    )
    .join("");
  $("#image-list")
    .querySelectorAll("[data-cover]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          cover = images[+b.dataset.cover];
          renderImages();
        }),
    );
  $("#image-list")
    .querySelectorAll("[data-remove]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const removed = images.splice(+b.dataset.remove, 1)[0];
          if (removed === cover) cover = images[0] || "";
          renderImages();
        }),
    );
}
function edit(work) {
  if (uploading) {
    message("#editor-message", "请等待图片上传完成");
    return;
  }
  editing = work?.id || null;
  editor.reset();
  images = work ? [...new Set([work.cover, ...work.images])] : [];
  cover = work?.cover || "";
  for (const name of ["title", "category", "date", "software", "description"])
    editor.elements[name].value =
      work?.[name] ||
      (name === "software"
        ? "Blender"
        : name === "date"
          ? new Date().toLocaleDateString("sv-SE")
          : "");
  editor.elements.featured.checked = work?.featured || false;
  $("#editor-title").textContent = work ? "编辑作品" : "新建作品";
  message("#editor-message", "");
  editor.hidden = false;
  renderImages();
  editor.scrollIntoView({ behavior: "smooth" });
}
$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button");
  button.disabled = true;
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
    });
    client.setToken(data.token);
    e.target.reset();
    message("#login-message", "");
    await dashboard();
  } catch (error) {
    message("#login-message", error.message);
  } finally {
    button.disabled = false;
  }
};
$("#logout").onclick = async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    signedOut();
  } catch (e) {
    message("#dashboard-message", e.message);
  }
};
$("#new-work").onclick = () => edit();
$("#cancel").onclick = () => {
  editor.hidden = true;
};
$("#add-url").onclick = () => {
  const url = $("#image-url").value.trim();
  if (!url.startsWith("https://") || !Blog.imageUrl(url)) {
    message("#editor-message", "请使用 HTTPS 图片地址");
    return;
  }
  if (images.length >= 30) {
    message("#editor-message", "最多添加 30 张图片");
    return;
  }
  if (!images.includes(url)) images.push(url);
  cover = cover || url;
  $("#image-url").value = "";
  renderImages();
};
$("#files").onchange = async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  if (images.length + files.length > 30) {
    message("#editor-message", "每件作品最多 30 张图片");
    return;
  }
  uploading = true;
  $("#save").disabled = true;
  $("#new-work").disabled = true;
  $("#cancel").disabled = true;
  $("#files").disabled = true;
  try {
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 20 * 1024 * 1024)
        throw new Error(files[i].name + " 超过 20 MB");
      message("#editor-message", `正在上传 ${i + 1} / ${files.length}…`);
      const result = await api("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: files[i],
      });
      images.push(result.url);
      cover = cover || result.url;
      renderImages();
    }
    message("#editor-message", "图片已上传，保存作品后发布。");
  } catch (error) {
    message("#editor-message", error.message);
  } finally {
    uploading = false;
    $("#save").disabled = false;
    $("#new-work").disabled = false;
    $("#cancel").disabled = false;
    $("#files").disabled = false;
    e.target.value = "";
  }
};
editor.onsubmit = async (e) => {
  e.preventDefault();
  if (uploading) return;
  if (!cover) {
    message("#editor-message", "请至少添加一张作品图片");
    return;
  }
  $("#save").disabled = true;
  const data = Object.fromEntries(new FormData(editor));
  data.featured = editor.elements.featured.checked;
  data.cover = cover;
  data.images = images.filter((url) => url !== cover);
  try {
    await api(
      editing ? "/api/works/" + encodeURIComponent(editing) : "/api/works",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    editor.hidden = true;
    await load();
    message("#dashboard-message", "作品已保存并发布。");
  } catch (error) {
    message("#editor-message", error.message);
  } finally {
    $("#save").disabled = false;
  }
};
if (client.hasToken())
  dashboard().catch((e) => {
    signedOut();
    message("#login-message", e.message);
  });
