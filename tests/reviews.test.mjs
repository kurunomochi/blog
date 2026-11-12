import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const context = { window: {} };
vm.runInNewContext(await readFile("public/review-data.js", "utf8"), context);
const D = context.window.ReviewData;
const json = (value) => JSON.parse(JSON.stringify(value));
const post = (id, date, content, category = "每日复盘") => ({
  id,
  date,
  content,
  category,
  title: `复盘 ${id}`,
});

test("calendar handles leap years, dotted dates and rejects invalid dates", () => {
  assert.equal(D.dateKey("2024.2.29"), "2024-02-29");
  for (const invalid of [
    "2026-02-29",
    "2026-13-01",
    "bad",
    "",
    null,
    "2026-11-31",
  ])
    assert.equal(D.dateKey(invalid), "");
  const cells = D.monthCells("2024-02");
  assert.equal(cells.length, 42);
  assert.equal(cells[0], "2024-01-29");
  assert.ok(cells.includes("2024-02-29"));
});
test("weeks include Monday through Sunday across month and year boundaries", () => {
  assert.equal(D.weekStart("2027-01-03"), "2026-12-28");
  assert.equal(D.weekStart("2027-01-04"), "2027-01-04");
  const records = [
    post("a", "2026.12.28", []),
    post("b", "2027-01-03", []),
    post("c", "2027-01-04", []),
    post("d", "2026-12-27", []),
    post("e", "invalid", []),
    post("f", "2026-12-29", [], "每周总结"),
  ];
  assert.deepEqual(
    json(D.weekEntries(records, "2027-01-01").map((p) => p.id)),
    ["a", "b"],
  );
});
test("extracts only known sections and never converts tomorrow's plans into next week's", () => {
  const result = D.sections([
    "# 今日目标",
    "不当作完成",
    "# 完成情况",
    "完成 Rust 练习",
    "```rust",
    "# 下周计划",
    "代码里的伪计划",
    "```",
    "# 问题与收获",
    "理解借用",
    "# 明日计划",
    "继续练习",
    "# 无关标题",
    "不要提取",
    "# 下周计划",
    "完成 HTTP 项目",
  ]);
  assert.deepEqual(json(result), {
    done: ["完成 Rust 练习"],
    problems: ["理解借用"],
    plans: ["继续练习"],
    next: ["完成 HTTP 项目"],
  });
});
test("weekly totals count unique days and keep every source; generated summary is editable text", () => {
  const records = [
    post("a", "2026.11.9", ["# 完成情况", "写代码", "# 明日计划", "复习"]),
    post("b", "2026-11-09", ["完成情况：", "修复 bug"]),
    post("c", "2026-11-15", ["# 问题与收获", "测试边界"]),
    post("d", "2026-11-16", ["# 完成情况", "下周的事"]),
  ];
  const data = D.aggregate(records, "2026-11-12");
  assert.equal(data.days, 2);
  assert.equal(data.entries.length, 3);
  assert.equal(data.done.length, 2);
  const draft = D.draft(records, "2026-11-12");
  assert.equal(draft.date, "2026-11-09");
  assert.equal(draft.category, "每周总结");
  assert.ok(draft.content.includes("写代码"));
  assert.ok(!draft.content.includes("下周的事"));
  assert.deepEqual(json(D.sections(draft.content).next), []);
});

test("ordinary text matching object properties remains safe text", () => {
  assert.deepEqual(
    json(
      D.sections([
        "constructor",
        "# 完成情况",
        "toString",
        "__proto__",
        "今日目标",
        "不应计入完成",
      ]).done,
    ),
    ["toString", "__proto__"],
  );
});
