(() => {
  "use strict";
  const DAY = 86400000;
  function dateKey(value) {
    const match = /^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/.exec(String(value));
    if (!match) return "";
    const [, y, m, d] = match.map(Number);
    if (y < 1000 || y > 9999) return "";
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
      ? date.toISOString().slice(0, 10)
      : "";
  }
  function today() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  function shift(key, days) {
    const valid = dateKey(key);
    return valid
      ? dateKey(
          new Date(Date.parse(valid + "T00:00:00Z") + days * DAY)
            .toISOString()
            .slice(0, 10),
        )
      : "";
  }
  function weekStart(key) {
    const valid = dateKey(key);
    return valid
      ? shift(valid, -((new Date(valid + "T00:00:00Z").getUTCDay() + 6) % 7))
      : "";
  }
  function monthCells(month) {
    const first = dateKey(month + "-01");
    if (!first) return [];
    const start = weekStart(first);
    return Array.from({ length: 42 }, (_, i) => shift(start, i));
  }
  function weekEntries(posts, day) {
    const start = weekStart(day),
      end = shift(start, 6);
    if (!start) return [];
    return posts
      .filter(
        (p) =>
          p.category === "每日复盘" &&
          dateKey(p.date) >= start &&
          dateKey(p.date) <= end,
      )
      .sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
  }
  // Extract named sections, skip fenced code, and preserve the author's words.
  function sections(content) {
    const result = { done: [], problems: [], plans: [], next: [] };
    const names = {
      完成情况: "done",
      本周完成: "done",
      本周完成的事: "done",
      问题与收获: "problems",
      遇到的问题: "problems",
      本周问题: "problems",
      明日计划: "plans",
      下周计划: "next",
    };
    let section = "",
      fence = "";
    for (const line of content.flatMap((part) => String(part).split(/\r?\n/))) {
      const text = line.trim();
      const marker = /^(\x60{3,}|~{3,})/.exec(text);
      if (marker) {
        if (!fence) fence = marker[1][0];
        else if (marker[1][0] === fence) fence = "";
        continue;
      }
      if (fence) continue;
      const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(text);
      const name = (heading ? heading[2] : text).replace(/[：:]$/, "");
      if (Object.hasOwn(names, name)) {
        section = names[name];
        continue;
      }
      if (heading || name === "今日目标") {
        section = "";
        continue;
      }
      if (section && text) result[section].push(text);
    }
    return result;
  }
  function aggregate(posts, day) {
    const entries = weekEntries(posts, day);
    const result = {
      entries,
      days: new Set(entries.map((p) => dateKey(p.date))).size,
      done: [],
      problems: [],
      plans: [],
      next: [],
    };
    for (const entry of entries) {
      for (const [key, lines] of Object.entries(sections(entry.content))) {
        if (lines.length)
          result[key].push({
            id: entry.id,
            date: dateKey(entry.date),
            title: entry.title,
            lines,
          });
      }
    }
    return result;
  }
  function draft(posts, day) {
    const start = weekStart(day),
      end = shift(start, 6),
      data = aggregate(posts, start);
    const group = (items) =>
      items.flatMap((item) => [`${item.date} · ${item.title}`, ...item.lines]);
    return {
      date: start,
      category: "每周总结",
      title: `${start} — ${end} 周总结`,
      image: "",
      excerpt: `这一周记录了 ${data.days} 天、${data.entries.length} 篇复盘，整理完成事项、问题和下周计划。`,
      content: [
        "# 本周完成",
        ...group(data.done),
        "# 问题与收获",
        ...group(data.problems),
        "# 下周计划",
        ...group(data.next),
        "# 本周计划线索（整理时参考）",
        ...group(data.plans),
      ],
    };
  }
  window.ReviewData = {
    dateKey,
    today,
    shift,
    weekStart,
    monthCells,
    weekEntries,
    sections,
    aggregate,
    draft,
  };
})();
