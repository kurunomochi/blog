(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    D = ReviewData,
    esc = Blog.escapeHtml;
  const today = D.today(),
    params = new URLSearchParams(location.search);
  let selected = D.dateKey(params.get("date")),
    week = D.weekStart(params.get("week")) || D.weekStart(selected || today);
  let month =
    /^\d{4}-\d{2}$/.test(params.get("month")) &&
    D.dateKey(params.get("month") + "-01")
      ? params.get("month")
      : (selected || today).slice(0, 7);
  let posts = [],
    entries = [],
    page = 1,
    loaded = false;
  $("review-search").value = params.get("q") || "";
  function sync() {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({
      month,
      week,
      date: selected,
      q: $("review-search").value.trim(),
    })) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  }
  function renderCalendar() {
    $("review-month").value = month;
    const counts = new Map();
    entries.forEach((p) => {
      const key = D.dateKey(p.date);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    const monthly = entries.filter((p) => D.dateKey(p.date).startsWith(month));
    $("calendar-count").textContent = new Set(
      monthly.map((p) => D.dateKey(p.date)),
    ).size;
    $("calendar-total").textContent = monthly.length;
    $("calendar-days").innerHTML = D.monthCells(month)
      .map(
        (date) =>
          '<button type="button" class="calendar-day' +
          (date.startsWith(month) ? "" : " is-outside") +
          (date === today ? " is-today" : "") +
          (date === selected ? " is-selected" : "") +
          '" data-date="' +
          date +
          '" aria-label="' +
          date +
          "，" +
          (counts.get(date) || 0) +
          ' 篇复盘" aria-pressed="' +
          (date === selected) +
          '"' +
          (date === today ? ' aria-current="date"' : "") +
          "><span>" +
          Number(date.slice(-2)) +
          "</span>" +
          (counts.has(date)
            ? '<span class="calendar-dot" aria-hidden="true"></span>'
            : "") +
          "</button>",
      )
      .join("");
    $("review-date-label").textContent = selected
      ? selected + " 的复盘"
      : month + " 的复盘";
    $("clear-date").hidden = !selected;
  }
  function sourceGroups(groups, empty) {
    return groups.length
      ? groups
          .map(
            (group) =>
              '<div class="weekly-source-group"><a class="weekly-source" href="/article.html?id=' +
              encodeURIComponent(group.id) +
              '">' +
              esc(group.date) +
              " · " +
              esc(group.title) +
              "</a><ul>" +
              group.lines
                .map(
                  (line) =>
                    "<li>" + esc(line.replace(/^[-*]\s+/, "")) + "</li>",
                )
                .join("") +
              "</ul></div>",
          )
          .join("")
      : '<p class="weekly-empty">' + empty + "</p>";
  }
  function renderWeek() {
    const end = D.shift(week, 6),
      data = D.aggregate(entries, week);
    $("week-label").textContent = week + " — " + end;
    $("week-count").textContent =
      "记录 " + data.days + " / 7 天 · " + data.entries.length + " 篇复盘";
    const summaries = posts.filter(
      (p) => p.category === "每周总结" && D.weekStart(p.date) === week,
    );
    const published = summaries[0];
    $("week-kind").textContent = published ? "已发布周总结" : "本周记录汇总";
    $("week-note").textContent = published
      ? "展示已整理发布的周总结；每日复盘更新后，可在后台重新整理。"
      : "按复盘中的标题整理原文。下周计划仅展示明确填写的内容，明日计划保留为参考。";
    $("week-published").innerHTML = summaries
      .map(
        (p) =>
          '<a href="/article.html?id=' +
          encodeURIComponent(p.id) +
          '">' +
          esc(p.title) +
          " ↗</a>",
      )
      .join(" · ");
    const sections = published ? D.sections(published.content) : null;
    for (const [key, title, empty] of [
      ["done", "本周完成", "暂无完成记录，可在每日复盘的「完成情况」中填写。"],
      ["problems", "问题与收获", "暂无问题与收获记录。"],
      ["next", "下周计划", "还没有填写下周计划，整理周总结时可以补充。"],
    ]) {
      const groups = published
        ? sections[key].length
          ? [
              {
                id: published.id,
                date: D.dateKey(published.date),
                title: published.title,
                lines: sections[key],
              },
            ]
          : []
        : data[key];
      $(key === "next" ? "week-plans" : "week-" + key).innerHTML =
        "<h3>" +
        title +
        "</h3>" +
        (published && sections[key].length
          ? "<ul>" +
            sections[key]
              .map(
                (line) => "<li>" + esc(line.replace(/^[-*]\s+/, "")) + "</li>",
              )
              .join("") +
            "</ul>"
          : sourceGroups(groups, empty));
    }
    $("week-plan-notes").innerHTML = sourceGroups(data.plans, "暂无计划线索。");
  }
  function renderList() {
    const query = $("review-search").value.trim().toLocaleLowerCase();
    const matches = Journal.ordered(entries).filter(
      (p) =>
        (selected
          ? D.dateKey(p.date) === selected
          : D.dateKey(p.date).startsWith(month)) &&
        [p.title, p.excerpt, ...p.content]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
    );
    const pages = Math.max(1, Math.ceil(matches.length / 8));
    page = Math.max(1, Math.min(page, pages));
    $("review-status").textContent =
      "找到 " +
      matches.length +
      " 篇复盘" +
      (query ? "（搜索当前日期或月份）" : "");
    $("review-list").innerHTML = matches.length
      ? matches
          .slice((page - 1) * 8, page * 8)
          .map(Journal.card)
          .join("")
      : '<p class="empty-state">这个时间范围还没有符合条件的复盘。</p>';
    $("review-previous").disabled = page <= 1;
    $("review-next").disabled = page >= pages;
    $("review-page").textContent = page + " / " + pages;
  }
  function render() {
    if (!loaded) return;
    renderCalendar();
    renderWeek();
    renderList();
    sync();
  }
  function changeMonth(offset) {
    const date = new Date(month + "-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + offset);
    month = date.toISOString().slice(0, 7);
    selected = "";
    week = D.weekStart(month + "-01");
    page = 1;
    render();
  }
  $("calendar-days").addEventListener("click", (e) => {
    const button = e.target.closest("button[data-date]");
    if (!button) return;
    selected = button.dataset.date;
    month = selected.slice(0, 7);
    week = D.weekStart(selected);
    page = 1;
    render();
    $("calendar-days")
      .querySelector('[data-date="' + selected + '"]')
      ?.focus({ preventScroll: true });
  });
  $("review-month").addEventListener("change", (e) => {
    if (!D.dateKey(e.target.value + "-01")) return;
    month = e.target.value;
    selected = "";
    week = D.weekStart(month + "-01");
    page = 1;
    render();
  });
  $("month-previous").addEventListener("click", () => changeMonth(-1));
  $("month-next").addEventListener("click", () => changeMonth(1));
  $("calendar-today").addEventListener("click", () => {
    selected = today;
    month = today.slice(0, 7);
    week = D.weekStart(today);
    page = 1;
    render();
  });
  $("clear-date").addEventListener("click", () => {
    selected = "";
    page = 1;
    render();
  });
  for (const [id, offset] of [
    ["week-previous", -7],
    ["week-next", 7],
  ])
    $(id).addEventListener("click", () => {
      week = D.shift(week, offset);
      render();
    });
  $("week-current").addEventListener("click", () => {
    week = D.weekStart(today);
    render();
  });
  $("review-search").addEventListener("input", () => {
    page = 1;
    renderList();
    sync();
  });
  $("review-previous").addEventListener("click", () => {
    page--;
    renderList();
  });
  $("review-next").addEventListener("click", () => {
    page++;
    renderList();
  });
  async function load() {
    $("review-content").hidden = true;
    $("review-retry").hidden = true;
    $("review-loading").hidden = false;
    $("review-loading").textContent = "正在加载复盘日历…";
    try {
      posts = await Blog.request("/api/posts");
      entries = posts.filter((p) => p.category === "每日复盘");
      loaded = true;
      $("review-content").hidden = false;
      $("review-loading").hidden = true;
      render();
    } catch (error) {
      $("review-loading").textContent = "加载失败：" + error.message;
      $("review-retry").hidden = false;
    }
  }
  $("review-retry").addEventListener("click", load);
  load();
})();
