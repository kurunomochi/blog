(() => {
  "use strict";
  const list = document.querySelector("#review-list");
  const status = document.querySelector("#review-status");
  const search = document.querySelector("#review-search");
  const month = document.querySelector("#review-month");
  const previous = document.querySelector("#review-previous");
  const next = document.querySelector("#review-next");
  const pageLabel = document.querySelector("#review-page");
  const retry = document.querySelector("#review-retry");
  let entries = [];
  let page = 1;
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = Journal.ordered(entries).filter(
      (entry) =>
        (!month.value || Journal.dateKey(entry.date).startsWith(month.value)) &&
        [entry.title, entry.excerpt, ...entry.content]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
    );
    const pages = Math.max(1, Math.ceil(matches.length / 8));
    page = Math.min(page, pages);
    status.textContent = `共 ${entries.length} 篇复盘，当前找到 ${matches.length} 篇`;
    list.innerHTML = matches.length
      ? matches
          .slice((page - 1) * 8, page * 8)
          .map(Journal.card)
          .join("")
      : `<p class="empty-state">${entries.length ? "没有符合条件的复盘，试试其他关键词或月份。" : "还没有发布复盘。"}</p>`;
    previous.disabled = page <= 1;
    next.disabled = page >= pages;
    pageLabel.textContent = `${page} / ${pages}`;
  }
  async function load() {
    list.setAttribute("aria-busy", "true");
    retry.hidden = true;
    status.textContent = "正在加载复盘…";
    try {
      entries = (await Blog.request("/api/posts")).filter(
        (entry) => entry.category === "每日复盘",
      );
      render();
    } catch (error) {
      status.textContent = `加载失败：${error.message}`;
      retry.hidden = false;
    } finally {
      list.setAttribute("aria-busy", "false");
    }
  }
  search.addEventListener("input", () => {
    page = 1;
    render();
  });
  month.addEventListener("input", () => {
    page = 1;
    render();
  });
  previous.addEventListener("click", () => {
    page--;
    render();
  });
  next.addEventListener("click", () => {
    page++;
    render();
  });
  retry.addEventListener("click", load);
  load();
})();
