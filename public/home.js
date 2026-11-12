(() => {
  if (location.hash === "#articles") {
    location.replace("/blog/");
    return;
  }
  const { esc, ordered, card } = Journal;
  async function posts() {
    const el = document.querySelector("#recent-posts");
    const reviews = document.querySelector("#recent-reviews");
    try {
      const all = ordered(await Blog.request("/api/posts"));
      const isReview = (post) =>
        ["每日复盘", "每周总结"].includes(post.category);
      const items = all.filter((post) => !isReview(post));
      const reviewItems = all.filter(isReview);
      document.querySelector("#post-count").textContent =
        `${items.length} 篇文章`;
      document.querySelector("#review-count").textContent =
        `${reviewItems.length} 篇复盘与周总结`;
      el.innerHTML = items.length
        ? items.slice(0, 3).map(card).join("")
        : '<p class="empty-state">第一篇记录还在路上。</p>';
      reviews.innerHTML = reviewItems.length
        ? reviewItems.slice(0, 3).map(card).join("")
        : '<p class="empty-state">还没有发布复盘，记录会从这里开始。</p>';
    } catch {
      el.innerHTML =
        '<p>文章暂时加载失败。<a class="text-link" href="/blog/">前往文章页重试 →</a></p>';
      reviews.innerHTML =
        '<p>复盘暂时加载失败。<a class="text-link" href="/reviews.html">前往复盘页重试 →</a></p>';
      document.querySelector("#post-count").textContent = "文章暂时不可用";
      document.querySelector("#review-count").textContent = "复盘暂时不可用";
    }
  }
  async function works() {
    const el = document.querySelector("#recent-works");
    try {
      const items = await Blog.request("/api/works");
      document.querySelector("#work-count").textContent =
        `${items.length} 件作品`;
      el.innerHTML = items.length
        ? items
            .slice(0, 3)
            .map(
              (w) =>
                `<a class="home-work" href="/work.html?id=${esc(encodeURIComponent(w.id))}">${Blog.imageUrl(w.cover) ? Blog.mediaPreview(w.cover, w.title) : '<div class="work-placeholder">BLENDER</div>'}<div><span>${esc(w.category)}</span><h3>${esc(w.title)} ↗</h3></div></a>`,
            )
            .join("")
        : '<p class="empty-state">新作品正在制作中。</p>';
    } catch {
      el.innerHTML =
        '<p>作品暂时加载失败。<a class="text-link" href="/portfolio.html">前往作品集重试 →</a></p>';
    }
  }
  const avatar = document.querySelector("#avatar-image");
  const mark = () =>
    avatar
      .closest(".avatar-slot")
      .classList.toggle("has-image", avatar.naturalWidth > 0);
  avatar.addEventListener("load", mark);
  avatar.addEventListener("error", mark);
  mark();
  posts();
  works();
})();
