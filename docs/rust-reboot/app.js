'use strict';
const { lessons, phases, exercises, plan } = COURSE;
const packageUrl = COURSE.codeArchive ? 'data:application/zip;base64,' + COURSE.codeArchive : 'rust-code.zip';
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'rust-reboot-v1';
const lessonById = Object.fromEntries(lessons.map(l => [l.id, l]));
const questions = lessons.flatMap(l => l.quiz.map((q, i) => ({id:`${l.id}-${i}`,lesson:l.id,phase:l.phase,q})));
const questionById = Object.fromEntries(questions.map(q => [q.id,q]));
const initialState = () => ({version:1,completed:[],notes:{},answers:{},milestones:[],last:'01',theme:'light'});
function sanitize(input) {
  if (!input || input.version !== 1) throw new Error('不是兼容的 Rust Reboot 学习记录');
  const s = initialState();
  s.completed = [...new Set((Array.isArray(input.completed) ? input.completed : []).filter(id=>Object.hasOwn(lessonById,id)))];
  for (const l of lessons) {
    if (typeof input.notes?.[l.id] === 'string') s.notes[l.id] = input.notes[l.id].slice(0,20000);
  }
  for (const q of questions) {
    const choice = input.answers?.[q.id];
    if (Number.isInteger(choice) && choice>=0 && choice<q.q[1].length) s.answers[q.id]=choice;
  }
  s.milestones = [...new Set((Array.isArray(input.milestones)?input.milestones:[]).filter(v=>Number.isInteger(v)&&v>=0&&v<6))];
  s.last = Object.hasOwn(lessonById,input.last) ? input.last : '01';
  s.theme = input.theme==='dark' ? 'dark':'light';
  return s;
}
let state=initialState(), storageAvailable=true, toastTimer, quizPage=0, quizFilter='all', quizPhase='all';
try { const raw=localStorage.getItem(KEY); if(raw) state=sanitize(JSON.parse(raw)); } catch { storageAvailable=false; }
document.body.classList.toggle('dark',state.theme==='dark');
function notify(message) { $('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',4000); }
function save() {
  try { localStorage.setItem(KEY,JSON.stringify(state)); storageAvailable=true; }
  catch { if(storageAvailable) notify('浏览器存储不可用或空间不足，请导出记录保存。'); storageAvailable=false; }
}
function completed(id){return state.completed.includes(id)}
function quizStats(){const answered=Object.keys(state.answers).length;const correct=questions.filter(q=>state.answers[q.id]===q.q[2]).length;return {answered,correct,wrong:answered-correct};}
function updateProgress(){
  const count=state.completed.length, percent=Math.round(count/lessons.length*100);
  $('#side-count').textContent=count;$('#side-percent').textContent=percent+'%';$('#side-bar').style.width=percent+'%';
  document.querySelectorAll('[data-quiz-count]').forEach(el=>el.textContent=quizStats().answered);
  document.querySelectorAll('[data-quiz-correct]').forEach(el=>el.textContent=quizStats().correct);
}
const action=(name,label,cls='',extra='')=>`<button class="btn ${cls}" data-action="${name}" ${extra}>${label}</button>`;
const link=(route,label,cls='')=>`<a class="btn ${cls}" href="#${route}">${label}</a>`;
const footer=()=>`<footer class="footer"><span>RUST REBOOT / 从重新理解，到独立构建。</span><span>官方资料核对：2026-11-09 · 代码验证环境：Rust 1.97.1</span></footer>`;
function heading(kicker,title,sub,aside=''){return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${sub}</p></div>${aside}</div>`;}
function syntax(code){
  return code.replace(/\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b(?:fn|let|mut|pub|use|impl|struct|enum|trait|match|if|else|for|in|while|loop|break|return|async|await|move|unsafe|mod|const|where|type|self|Self|dyn|true|false)\b|\b\d+(?:_\d+)*\b|[&<>"']/g,token=>{
    let cls=token.startsWith('//')?'comment':token.startsWith('"')&&token.length>1?'string':/^\d/.test(token)?'number':/^\w/.test(token)?'key':'';
    return cls?`<span class="tok-${cls}">${esc(token)}</span>`:esc(token);
  });
}
function codeBlock(code,label='terminal',rust=false){return `<div class="code-panel"><div class="code-bar"><span>${esc(label)}</span><button type="button" data-action="copy" aria-label="复制 ${esc(label)}">复制代码</button></div><pre><code>${rust?syntax(code):esc(code)}</code></pre></div>`;}
function lessonCard(l){return `<a class="lesson-card" href="#lesson/${l.id}"><span class="number">CHAPTER ${l.id}</span>${completed(l.id)?'<span class="complete-dot">✓ 已掌握</span>':''}<h3>${esc(l.title)}</h3><p>${esc(l.subtitle)}</p><div class="card-foot"><span>${esc(phases[l.phase][0])}</span><span>讲解 · 示例 · 练习 <span class="arrow">↗</span></span></div></a>`;}
function home(){
 const next=lessons.find(l=>!completed(l.id))||lessons[0];const q=quizStats();
 return heading('YOUR RUST, RELOADED','重新出发，继续构建。','为久未使用 Rust 的你，准备的一次系统回归。','<span class="tag">学习手册 / VOL. 01</span>')+
 `<section class="hero"><div class="hero-content"><div class="eyebrow">从「好像记得」到「真正会写」</div><h2>把 Rust 重新写进<br><em>你的肌肉记忆。</em></h2><p>从所有权的第一条规则，到一个可以交付的命令行项目。理解原理，亲手验证，再把知识连接起来。</p><div class="actions">${link('lesson/'+(state.completed.length?state.last:'01'),state.completed.length?'继续上次阅读 ↗':'开始复习之旅 ↗','primary')}${link('plan','查看学习路线','subtle')}</div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="rust-seal">R</div><span class="art-label one">let curiosity = true;</span><span class="art-label two">✓ borrow checked</span><span class="art-caption">OWNERSHIP · CONFIDENCE · BUILD</span></div></section>
 <div class="stats"><div class="stat"><div class="stat-label">系统知识 <span>▤</span></div><div class="stat-number">30<small>章节</small></div><div class="stat-foot">基础 → 核心 → 进阶 → 工程</div></div><div class="stat"><div class="stat-label">动手巩固 <span>⌘</span></div><div class="stat-number">12<small>测试驱动练习</small></div><div class="stat-foot">题目、提示、参考答案与测试</div></div><div class="stat"><div class="stat-label">知识自测 <span>◇</span></div><div class="stat-number">60<small>道题</small></div><div class="stat-foot">已答 ${q.answered} 题 · 答对 ${q.correct} 题</div></div><div class="stat"><div class="stat-label">综合交付 <span>↗</span></div><div class="stat-number">01<small>完整 CLI 项目</small></div><div class="stat-foot">另附 Tokio 异步实战实验</div></div></div>
 <div class="home-grid"><section><div class="section-title"><div><h2>沿着这条路线，找回手感</h2><p>六个阶段，串起 Rust 的完整核心知识链路。</p></div><a href="#course">查看全部章节 ↗</a></div><div class="phase-list">${phases.map((p,i)=>{const group=lessons.filter(l=>l.phase===i);return `<a class="phase-row" href="#course/${i}"><span class="phase-number">0${i+1}</span><div><h3>${p[0]}</h3><p>${p[2]}</p></div><div class="tail">CH. ${p[1]}<br>${group.filter(l=>completed(l.id)).length} / ${group.length} 已掌握</div><span class="arrow">›</span></a>`;}).join('')}</div></section><aside class="stack"><div class="section-title"><h2>学完，做点真正的东西</h2></div><div class="feature-card dark"><div class="eyebrow">CAPSTONE PROJECT</div><h3>Rust Trail<br>你的学习任务管理器</h3><p>用所有权组织数据，用 Result 处理错误，用测试守住每一次修改。</p><div class="terminal-mini">$ cargo run -- add "复习借用"<br>✓ 已添加 #1<br>$ cargo run -- stats<br>总数 1 · 完成 0 · 待办 1</div>${link('project','进入综合项目 →')}</div><div class="feature-card"><span class="tag orange">建议下一步</span><h3 style="font-size:16px">${next.id} · ${esc(next.title)}</h3><p>先预测代码行为，再运行验证。最后不看答案重写一次。</p><a class="small-link" href="#lesson/${next.id}">开始这一章 ↗</a></div></aside></div>
 <div class="notice"><strong>一份可以离线使用的复习工作台</strong>课程、测验与笔记都在这个 HTML 中。Rust 代码需在本地 Cargo 执行；下载完整包可获得 30 个示例、练习模板、测试、参考实现和异步实验。学习记录保存在当前浏览器，可导出备份。</div>`+footer();
}
function course(phase){
 const selected=Number.isInteger(Number(phase))&&phase!==undefined&&Number(phase)>=0&&Number(phase)<6?Number(phase):null;
 const list=selected===null?lessons:lessons.filter(l=>l.phase===selected);
 return heading('THE COMPLETE FIELD GUIDE','完整复习手册','每章包含原理讲解、可运行示例、常见误区、动手任务与两道自测。',link('practice','配套练习 ↗'))+
 `<div class="filters"><a href="#course" class="filter ${selected===null?'active':''}">全部 30 章</a>${phases.map((p,i)=>`<a class="filter ${selected===i?'active':''}" href="#course/${i}">${p[0]}</a>`).join('')}</div><div class="lesson-grid">${list.map(lessonCard).join('')}</div>`+footer();
}
function quizCard(question){
 const {id,q,lesson}=question;const choice=state.answers[id];const answered=Number.isInteger(choice);const right=choice===q[2];
 return `<form class="quiz-card" data-quiz="${id}"><div class="quiz-meta"><a href="#lesson/${lesson}">CH. ${lesson} · ${esc(lessonById[lesson].title)}</a><span>单选题</span></div><fieldset><legend>${esc(q[0])}</legend>${q[1].map((option,i)=>`<label class="option"><input type="radio" name="answer-${id}" value="${i}" ${choice===i?'checked':''} required><span>${String.fromCharCode(65+i)}. ${esc(option)}</span></label>`).join('')}</fieldset><button class="btn small" type="submit">${answered?'重新检查':'检查答案'}</button><div class="answer-feedback" aria-live="polite">${answered?feedback(q,right):''}</div></form>`;
}
function feedback(q,right){return `<div class="feedback ${right?'':'incorrect'}"><strong>${right?'✓ 回答正确':'再想一想 · 正确答案为 '+String.fromCharCode(65+q[2])}</strong>${esc(q[3])}</div>`;}
function lesson(id){
 const l=lessonById[id];if(!l)return course();state.last=id;save();const n=lessons.indexOf(l);
 return `<div class="lesson-layout"><article class="article"><header class="article-head"><div class="eyebrow">CHAPTER ${id} / ${phases[l.phase][0]}</div><h1>${esc(l.title)}</h1><p>${esc(l.subtitle)}</p><div class="actions">${action('complete',completed(id)?'✓ 已掌握 · 点击撤销':'标记为已掌握','primary',`data-id="${id}"`)}${action('print','打印本章')}${link('course','返回目录')}</div></header>
 ${l.sections.map((s,i)=>`<section id="section-${i}"><h2><span class="muted tiny">0${i+1} / </span>${esc(s[0])}</h2><p>${esc(s[1])}</p></section>`).join('')}
 <section id="sample"><h2>读代码，再验证你的判断</h2><p class="muted">这是完整示例。先写下预期行为，再在下载包的 workbook 目录执行：</p>${codeBlock(`cargo run --offline --example ch${id}`)}${codeBlock(l.code,`examples/ch${id}.rs`,true)}<div class="output"><small>EXPECTED OUTPUT / 预期行为</small><pre>${esc(l.output)}</pre></div></section>
 <div class="notice warn"><strong>容易记混的地方</strong>${esc(l.pitfall)}</div>
 <section id="exercise" class="exercise-box"><div class="eyebrow">LEARN BY BUILDING</div><h3>合上答案，动手试试</h3><p>${esc(l.task)}</p><details><summary>卡住了？看一条提示</summary><p>${esc(l.hint)}</p></details><details><summary>查看参考思路与答案</summary><p>${esc(l.answer)}</p></details></section>
 <section id="selfcheck"><h2>用两道题检验理解</h2>${questions.filter(q=>q.lesson===id).map(quizCard).join('')}</section>
 <section id="notes"><h2>把理解写成自己的话</h2><label class="notes-label" for="lesson-note">本章笔记</label><textarea id="lesson-note" data-note="${id}" maxlength="20000" placeholder="今天修正了什么误解？哪段代码还不能独立写出来？">${esc(state.notes[id]||'')}</textarea><div class="save-status" id="note-status">${storageAvailable?'自动保存在当前浏览器；可在「笔记与学习记录」导出。':'浏览器存储不可用；请导出记录避免丢失。'}</div></section>
 <p><a class="source" href="${esc(l.source)}" target="_blank" rel="noopener noreferrer">官方原文与进一步阅读 ↗</a></p>
 <div class="prev-next">${n>0?`<a href="#lesson/${lessons[n-1].id}"><span>← 上一章</span>${esc(lessons[n-1].title)}</a>`:'<span></span>'}${n<29?`<a href="#lesson/${lessons[n+1].id}"><span>下一章 →</span>${esc(lessons[n+1].title)}</a>`:`<a href="#project"><span>下一步 →</span>完成综合项目</a>`}</div></article>
 <aside class="reading-toc"><b>本章导航</b>${l.sections.map((s,i)=>`<a href="#section-${i}" data-scroll="section-${i}">${esc(s[0])}</a>`).join('')}<a href="#sample" data-scroll="sample">代码与输出</a><a href="#exercise" data-scroll="exercise">动手练习</a><a href="#selfcheck" data-scroll="selfcheck">知识自测</a><a href="#notes" data-scroll="notes">我的笔记</a><a class="btn small" href="rust-reboot.zip" download>下载完整学习包 ↓</a><p class="tiny muted">建议顺序：<br>预测 → 运行 → 改写 → 解释</p></aside></div>`+footer();
}
function practice(){return heading('LESS READING, MORE BUILDING','动手练习','12 个测试驱动练习。每道题都有接口、边界条件和可执行测试。',`<a class="btn primary" href="${packageUrl}" download="rust-code.zip">下载完整学习包 ↓</a>`)+
 `<div class="notice"><strong>默认测试失败是练习的起点</strong>修改 workbook/src/starter.rs 中的 todo!。默认测试检查你的实现；添加 --features solutions 后，检查的是参考答案。网页不编译 Rust，请在本地终端运行。</div>`+
 codeBlock('cd workbook\ncargo test --offline ex01\n# 完成后检查自己的全部实现\ncargo test --offline\n# 只验证参考答案\ncargo test --offline --features solutions')+
 `<div class="table-wrap"><table><thead><tr><th>练习</th><th>能力与要求</th><th>入口</th></tr></thead><tbody>${exercises.map(e=>`<tr><td>${e[0]}<br><code class="inline">${esc(e[1])}</code></td><td><strong>${e[3]}</strong><br><span class="muted">${esc(e[4])}</span></td><td><a class="small-link" href="#lesson/${e[2]}">第 ${e[2]} 章 ↗</a><br><code class="inline">cargo test ${e[0]}</code></td></tr>`).join('')}</tbody></table></div>
 <div class="resource-grid"><div class="resource"><h3>怎样算真正完成一道题？</h3><p>通过现有测试；补充至少一个边界案例；不看答案重写；解释每个参数为什么按值或按引用传递。</p><p>约束不是可选项：ex08 不要求 Clone，ex11 的无修改路径不分配，ex12 必须拒绝非法转义。</p></div><div class="resource"><h3>30 个独立示例</h3><p>workbook/examples/ch01.rs 至 ch30.rs 与网页示例同步生成。每个示例都有 main，可单独运行并观察输出。</p><code class="inline">cargo run --offline --example ch05</code></div></div>
 <div class="section-title"><h2>额外实验：真正运行的 Tokio</h2></div><p class="muted">tokio-lab 包含 join!、spawn、有界通道、超时和异步测试。首次缺少缓存时需联网下载依赖。</p>${codeBlock('cd tokio-lab\ncargo run --locked\ncargo test --locked')}<p><a class="source" target="_blank" rel="noopener noreferrer" href="https://tokio.rs/tokio/tutorial">Tokio 官方教程 ↗</a></p>`+footer();}
function quiz(){
 const stats=quizStats();let list=questions.filter(q=>quizPhase==='all'||q.phase===Number(quizPhase));
 if(quizFilter==='wrong')list=list.filter(q=>Number.isInteger(state.answers[q.id])&&state.answers[q.id]!==q.q[2]);
 if(quizFilter==='unanswered')list=list.filter(q=>!Number.isInteger(state.answers[q.id]));
 const pages=Math.max(1,Math.ceil(list.length/10));quizPage=Math.min(quizPage,pages-1);const batch=list.slice(quizPage*10,quizPage*10+10);
 return heading('RECALL BEFORE REVIEW','知识自测','每次作答会保存最后一次结果。答错后回到原章，再用自己的话解释规则。')+
 `<div class="stats"><div class="stat"><div class="stat-label">题库总量</div><div class="stat-number">60</div></div><div class="stat"><div class="stat-label">已经作答</div><div class="stat-number" data-quiz-count>${stats.answered}</div></div><div class="stat"><div class="stat-label">当前答对</div><div class="stat-number" data-quiz-correct>${stats.correct}</div></div><div class="stat"><div class="stat-label">建议方式</div><div style="font-size:15px;margin-top:12px">先判断 · 再看解析</div></div></div>
 <div class="filters">${[['all','全部题目'],['wrong','重做错题'],['unanswered','尚未作答']].map(([key,name])=>`<button class="filter ${quizFilter===key?'active':''}" data-action="quiz-filter" data-filter="${key}">${name}</button>`).join('')}<select id="quiz-phase" aria-label="按阶段筛选题目" class="filter"><option value="all">所有阶段</option>${phases.map((p,i)=>`<option value="${i}" ${quizPhase===String(i)?'selected':''}>${p[0]}</option>`).join('')}</select></div>
 <p class="tiny muted">筛选结果 ${list.length} 题 · 第 ${quizPage+1} / ${pages} 页</p>${batch.length?batch.map(quizCard).join(''):'<div class="empty">这个分类暂时没有题目。可以选择全部题目继续练习。</div>'}
 <div class="actions">${action('quiz-prev','← 上一页','',quizPage===0?'disabled':'')}${action('quiz-next','下一页 →','',quizPage>=pages-1?'disabled':'')}</div>`+footer();
}
const milestones=[
 ['M1','建立领域模型','Task 拥有 id、title、done；Store 拥有 Vec<Task> 与 next_id。','空标题拒绝；外部不能绕过构造规则直接写私有字段。','第 04、07、08 章'],
 ['M2','先完成内存业务','实现 add、complete、remove、find、stats；让借用表达读写权限。','不存在 ID 返回错误；重复完成幂等；删除后 ID 不复用。','第 05、09、10、11 章'],
 ['M3','定义严格数据格式','文件头记录格式版本与 next_id；转义标题，严格解码。','中文与控制字符往返一致；重复 ID、未知状态、坏转义拒绝。','第 06、09、27 章'],
 ['M4','接上持久化边界','load 区分文件不存在与损坏；save 写前备份。','重启数据一致；损坏时不覆盖；备份失败停止保存。','第 16、17、27 章'],
 ['M5','构建命令行体验','把参数、提示、输出和退出码放在 main；通过 --file 选择数据库。','help 可读；错误参数非零退出；路径与文本参数分别处理。','第 03、16、25 章'],
 ['M6','完成可重复验收','执行单元测试、CLI 集成测试；真实运行一次完整用户流程。','增删改查与统计正确；格式检查通过；记录已知限制。','第 17、26、28 章'],
];
function project(){return heading('ONE PROJECT, CONNECT EVERYTHING','综合实战 · Rust Trail','把复习过的知识，装进一个真正可用的命令行任务管理器。',`<a class="btn primary" href="${packageUrl}" download="rust-code.zip">下载完整工程 ↓</a>`)+
 `<div class="diagram" aria-label="架构：命令行参数进入业务模型，模型经过编解码与文件存储交互"><span>main.rs / 参数与输出</span><b>→</b><span>Store / 业务规则</span><b>→</b><span>encode · decode</span><b>⇄</b><span>文件 / .bak 备份</span></div>
 <div class="resource-grid"><div class="resource"><h3>你将交付什么</h3><p>支持添加、列出、完成、删除、搜索与统计；重启后保留数据；错误输入得到明确反馈。核心代码只使用标准库，离线可编译。</p><span class="tag green">所有权</span> <span class="tag green">错误建模</span> <span class="tag green">文件 I/O</span> <span class="tag green">测试</span></div><div class="resource"><h3>推荐实践顺序</h3><p>先看需求和测试，自己新建工程；遇到问题回到对应章节。完成后再对照 capstone/src/ 的完整参考实现，比较设计取舍。</p><a class="small-link" href="#lesson/29">阅读综合项目设计说明 ↗</a></div></div>
 ${codeBlock('cd capstone\ncargo test --offline\ncargo run --offline -- --file demo.db add "复习所有权"\ncargo run --offline -- --file demo.db list\ncargo run --offline -- --file demo.db done 1\ncargo run --offline -- --file demo.db stats')}
 <div class="section-title"><h2>六个里程碑，一步步完成</h2><span class="tag">${state.milestones.length} / 6 已验收</span></div>
 ${milestones.map((m,i)=>`<section class="step-card"><div class="eyebrow">${m[0]} / ${m[4]}</div><h3>${m[1]}</h3><p>${m[2]}</p><div class="notice"><strong>验收标准</strong>${m[3]}</div><label class="checklist"><span><input type="checkbox" data-milestone="${i}" ${state.milestones.includes(i)?'checked':''}> 我已独立实现并验证这个里程碑</span></label></section>`).join('')}
 <div class="notice warn"><strong>学习版的明确边界</strong>只支持单进程串行写入；写前保存 .bak 备份，但不提供崩溃原子性。没有数据库事务和多进程锁。可以把跨平台可靠替换、恢复、文件锁或 SQLite 迁移作为后续项目。</div>
 <div class="section-title"><h2>完成后，选一个扩展任务</h2></div><div class="lesson-grid"><div class="resource"><h3>数据进阶</h3><p>增加标签、截止时间和格式版本迁移，为旧数据保留兼容路径。</p></div><div class="resource"><h3>抽象进阶</h3><p>定义 Storage trait，增加内存存储实现，让业务测试不依赖真实文件。</p></div><div class="resource"><h3>并发进阶</h3><p>用有界通道引入后台任务，设计关闭、取消和重复执行语义。</p></div></div>`+footer();}
function roadmap(){return heading('A REALISTIC RESTART','14 天复习路线','建议每天 60—120 分钟，可按自己的节奏拆成 4 周。用验收结果调整进度。')+
 `<div class="notice"><strong>每日节奏：回想 10 分钟 → 阅读 25 分钟 → 编码 40 分钟 → 自测与记录 15 分钟</strong>第二天先从空文件复现昨天的一个重点，再开始新内容。难点可以多花一天，不需要为完成日期跳过实践。</div>
 <div class="table-wrap"><table><thead><tr><th>时间</th><th>阅读范围</th><th>当日任务</th></tr></thead><tbody>${plan.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td></tr>`).join('')}</tbody></table></div>
 <div class="resource-grid"><div class="resource"><h3>只想快速找回手感？</h3><p>优先读 04—06、09、11—15、17。随后完成 12 题和综合项目。把编译错误当成回查章节的索引，而不是跳过理解的理由。</p></div><div class="resource"><h3>想复习得更扎实？</h3><p>每个例子做一次故意破坏：移动后使用、重叠借用、错误生命周期、忘记关闭通道。记录错误位置与修复原因。</p></div></div>`+footer();}
function notes(){const entries=lessons.filter(l=>(state.notes[l.id]||'').trim());
 return heading('YOUR LEARNING LOG','笔记与学习记录','记录仅保存在当前浏览器。更换浏览器、清理缓存前，请导出备份。')+
 `<div class="actions">${action('export','导出记录 JSON','primary')}${action('import','导入记录')}${action('reset','清除记录','danger')}<a class="btn" href="${esc(location.href.split('#')[0])}" download="Rust-Reboot.html">下载单文件 HTML ↓</a></div>
 <p class="word-note">导入会合并完成状态与项目清单；同一章的笔记和同一道题的答案，以导入文件为准。未包含的条目保留。</p>
 <div class="stats"><div class="stat"><div class="stat-label">已掌握章节</div><div class="stat-number">${state.completed.length}<small>/ 30</small></div></div><div class="stat"><div class="stat-label">笔记章节</div><div class="stat-number">${entries.length}</div></div><div class="stat"><div class="stat-label">答对题数</div><div class="stat-number">${quizStats().correct}<small>/ 60</small></div></div><div class="stat"><div class="stat-label">项目里程碑</div><div class="stat-number">${state.milestones.length}<small>/ 6</small></div></div></div>
 ${entries.length?entries.map(l=>`<section class="step-card"><span class="eyebrow">CHAPTER ${l.id}</span><h3><a href="#lesson/${l.id}">${esc(l.title)} ↗</a></h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(state.notes[l.id])}</p></section>`).join(''):'<div class="empty">还没有笔记。每章末尾都留了一个写下自己理解的地方。<br><a class="small-link" href="#lesson/01">开始第一章 →</a></div>'}`+footer();
}
const resources=[['The Rust Book','核心语言与综合项目的系统教材。','https://doc.rust-lang.org/book/'],['Rust 标准库','查类型、方法、trait、稳定性与示例。','https://doc.rust-lang.org/std/'],['Cargo Book','包、依赖、workspace、features 与构建配置。','https://doc.rust-lang.org/cargo/'],['Edition Guide','edition 2024 的迁移规则与兼容变化。','https://doc.rust-lang.org/edition-guide/rust-2024/index.html'],['Rust Reference','需要精确规则时阅读语言参考。','https://doc.rust-lang.org/reference/'],['Tokio Tutorial','异步运行时、任务、通道、I/O 与取消。','https://tokio.rs/tokio/tutorial'],['Rust by Example','以小例子复习语言特性。','https://doc.rust-lang.org/rust-by-example/'],['Rust 错误码索引','按错误码定位解释与修复方向。','https://doc.rust-lang.org/error_codes/error-index.html']];
function reference(){return heading('KEEP THE IMPORTANT THINGS CLOSE','速查表与官方资料','需要时快速查阅。完整规则和版本细节请跟随各章官方来源。')+
 `<div class="table-wrap"><table><thead><tr><th>需求</th><th>通常选择</th><th>需要记住</th></tr></thead><tbody>${[
 ['只读文本','&str','接受 String 借用与字面量；不要求拥有'],['拥有可变文本','String','len 是 UTF-8 字节数'],['只读 / 修改序列','&[T] / &mut [T]','参数无需绑定某一种容器'],['独占堆值','Box<T>','不自动提供共享所有权'],['单线程共享','Rc<T> / Weak<T>','避免强引用环'],['单线程内部可变','Cell / RefCell','RefCell 在运行时检查借用'],['跨线程共享','Arc<T>','T 仍需满足 Send/Sync 规则'],['跨线程共享修改','Arc<Mutex<T>>','锁范围短；仍可能死锁'],['可缺失 / 可失败','Option / Result','没有值与失败原因不是同一种信息'],['泛型 / 动态分派','T: Trait / dyn Trait','单态化与运行时异构的取舍'],['借用或拥有','Cow<str>','只在部分路径避免分配'],['按值 / 借用遍历','into_iter / iter / iter_mut','看接收者类型与 Item'],['惰性转换 / 消费','map / collect、sum','未消费的迭代器通常不执行'],['一次 / 可变 / 共享调用','FnOnce / FnMut / Fn','move 捕获不等于只可调用一次'],
 ].map(row=>`<tr><td>${row[0]}</td><td><code class="inline">${esc(row[1])}</code></td><td>${row[2]}</td></tr>`).join('')}</tbody></table></div>
 <div class="section-title"><h2>常用命令</h2></div>${codeBlock('rustc --version\ncargo check --all-targets\ncargo fmt --check\ncargo test\ncargo test test_name -- --nocapture\ncargo clippy --all-targets\ncargo run --release\ncargo doc --open\nrustup doc --book\nrustc --explain E0382')}
 <div class="section-title"><h2>看到错误码，先问什么？</h2></div><div class="table-wrap"><table><thead><tr><th>错误</th><th>先检查</th></tr></thead><tbody>${[['E0382','值已移动。调用方还需要它吗？被调用方是否只需要借用？'],['E0499','多次可变借用。能否缩小作用域，或通过 split_at_mut 拆分？'],['E0502','共享和可变借用重叠。读引用的最后使用能否提前？'],['E0597','引用比被引用对象活得久。是否应该返回拥有的值？'],['E0277','trait 约束不满足。接收者实际类型是什么？是否缺少实现？']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
 <div class="section-title"><h2>继续阅读官方资料</h2></div><div class="resource-grid">${resources.map(r=>`<a class="resource" href="${r[2]}" target="_blank" rel="noopener noreferrer"><h3>${r[0]} ↗</h3><p>${r[1]}</p><span class="tag">官方来源</span></a>`).join('')}</div>
 <div class="notice"><strong>版本与覆盖范围</strong>本手册采用 Rust 2024 edition；示例与工程在 Rust 1.97.1 环境验证。资料核对日期为 2026-11-09，不把本机版本当作最新版本。范围包括核心语言、标准库常用能力与基本工程链路；生态库、完整 unsafe 形式化论证和所有平台细节需要专题深入。讲解和练习为原创整理，各章保留进一步阅读入口。</div>`+footer();}
function search(term){const needle=term.trim().toLocaleLowerCase();const list=lessons.filter(l=>JSON.stringify(l).toLocaleLowerCase().includes(needle));
 $('#main').innerHTML=heading('FIND YOUR WAY BACK','搜索知识点',`“${esc(term)}” · 找到 ${list.length} 个相关章节`)+
 (list.length?`<div class="lesson-grid">${list.map(lessonCard).join('')}</div>`:'<div class="empty">没有找到相关章节。试试「借用」「生命周期」「FnMut」「E0382」或「async」。</div>')+footer();
 $('#breadcrumb').textContent='搜索';
}
function advancedHome(){
 return home()
  .replace('到一个可以交付的命令行项目','到 SQLite 与异步 HTTP 服务')
  .replace('01<small>完整 CLI 项目','02<small>递进式实战项目')
  .replace('另附 Tokio 异步实战实验','SQLite · HTTP · CLI · 后台任务')
  .replace('Rust Trail<br>你的学习任务管理器','Rust Taskboard<br>从模型到后台服务')
  .replace('用所有权组织数据，用 Result 处理错误，用测试守住每一次修改。','事务、乐观锁、筛选分页、审计记录和有界队列。8 节导读把设计拆开讲清楚。')
  .replace(/<div class="terminal-mini">[\s\S]*?<\/div>/,'<div class="terminal-mini">$ cargo run --bin taskboard-server<br>Listening on 127.0.0.1:4318<br>POST /tasks → 201 Created<br>stale version → 409 Conflict</div>')
  .replace('Rust 代码需在本地 Cargo 执行；下载完整包可获得 30 个示例、练习模板、测试、参考实现和异步实验。','Rust 代码需在本地 Cargo 执行；内嵌下载包提供 30 个示例、12 道练习、入门 CLI、进阶 Taskboard 和异步实验。');
}
function advancedProject(){
 return heading('BUILD A SYSTEM, UNDERSTAND THE BOUNDARIES','进阶实战 · Rust Taskboard','一个多模块任务系统，把领域建模、SQLite 事务、HTTP 与异步任务连接起来。',`<a class="btn primary" href="${packageUrl}" download="rust-code.zip">下载完整工程 ↓</a>`)+
 `<div class="notice"><strong>项目分两级，不跳过中间步骤</strong>先做 ${'<a class="source" href="#starter">Rust Trail 入门 CLI</a>'}，再完成本页的进阶项目。进阶项目具有独立 Cargo.toml 与锁文件，源码全部内嵌在本 HTML 中，第一次构建第三方依赖需要联网。</div>
 <div class="diagram"><span>HTTP / CLI</span><b>→</b><span>领域验证 · Result</span><b>→</b><span>阻塞池 · 并发限制</span><b>→</b><span>SQLite 事务</span></div>
 <div class="resource-grid"><div class="resource"><h3>真实的业务能力</h3><p>任务增删改查、优先级与标签、状态流转、截止时间字段、组合筛选、稳定分页、便携内容导出，以及后台批量导入。</p><span class="tag green">2 个二进制入口</span> <span class="tag green">6 个核心模块</span></div><div class="resource"><h3>明确的工程保证</h3><p>版本号阻止陈旧覆盖；任务、标签与审计同一事务提交；读取快照保持分页一致；队列与阻塞工作有上限；错误有可辨识状态码。</p><span class="tag orange">先理解边界，再增加功能</span></div></div>
 ${codeBlock('cd taskboard\ncargo test --locked\ncargo run --locked --bin taskboard-server\n# 另开终端\nInvoke-RestMethod http://127.0.0.1:4318/health')}
 <div class="section-title"><div><h2>8 节工程导读</h2><p>每节都有设计解释、实际命令、失败场景与独立扩展任务。</p></div>${link('guide/01','从第一节开始 →','small')}</div>
 <div class="lesson-grid">${COURSE.projectGuide.map(g=>`<a class="lesson-card" href="#guide/${g.id}"><span class="number">LAB ${g.id}</span><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p><div class="card-foot"><span>设计 · 代码 · 验收</span><span>阅读 →</span></div></a>`).join('')}</div>
 <div class="section-title"><h2>直接打开真实项目源码</h2></div><div class="resource-grid">${COURSE.projectFiles.map((f,i)=>`<a class="resource" href="#source/${i}"><h3>${esc(f.path)} ↗</h3><p>${f.code.split('\n').length} 行 · 与下载工程同源</p></a>`).join('')}</div>
 <div class="notice warn"><strong>学习系统的范围</strong>仅回环监听，无账户认证；内存 job 队列不跨崩溃恢复；内容导出不是完整数据库备份；一个 SQLite 连接串行工作。可靠队列、幂等提交、身份隔离和迁移升级留作分级扩展，并在第 7—8 节说明具体实现方向。</div>`+footer();
}
function guide(id){
 const g=COURSE.projectGuide.find(g=>g.id===id)||COURSE.projectGuide[0];const n=COURSE.projectGuide.indexOf(g);
 return `<div class="lesson-layout"><article class="article"><header class="article-head"><div class="eyebrow">PROJECT LAB ${g.id} / RUST TASKBOARD</div><h1>${esc(g.title)}</h1><p>${esc(g.summary)}</p><div class="actions">${link('project','返回项目')}${action('print','打印本节')}<a class="btn primary" href="${packageUrl}" download="rust-code.zip">下载工程</a></div></header>
 ${g.sections.map((s,i)=>`<section id="guide-${i}"><h2>${i+1}. ${esc(s[0])}</h2><p>${esc(s[1])}</p></section>`).join('')}
 <h2 id="guide-command">实际命令与关键代码</h2>${codeBlock(g.code,g.code.startsWith('//')?'Rust / 关键调用':'PowerShell / JSON',g.code.startsWith('//'))}
 <section class="exercise-box"><div class="eyebrow">BUILD IT YOURSELF</div><h3>这次由你扩展</h3><p>${esc(g.exercise)}</p><p class="muted">先写清预期行为和失败场景，再修改代码。让测试证明你没有破坏已经成立的规则。</p></section>
 <div class="prev-next">${n?`<a href="#guide/${COURSE.projectGuide[n-1].id}"><span>← 上一节</span>${esc(COURSE.projectGuide[n-1].title)}</a>`:'<span></span>'}${n<7?`<a href="#guide/${COURSE.projectGuide[n+1].id}"><span>下一节 →</span>${esc(COURSE.projectGuide[n+1].title)}</a>`:link('project','返回项目总览')}</div></article><aside class="reading-toc"><b>本节导航</b>${g.sections.map((s,i)=>`<a href="#guide-${i}" data-scroll="guide-${i}">${esc(s[0])}</a>`).join('')}<a href="#guide-command" data-scroll="guide-command">命令与代码</a><a href="#source/3">阅读 Repository 源码 ↗</a></aside></div>`+footer();
}
function projectSource(index){
 const n=Number(index);const file=COURSE.projectFiles[Number.isInteger(n)&&n>=0&&n<COURSE.projectFiles.length?n:0];
 return heading('SOURCE IS THE FINAL REFERENCE',esc(file.path),'下面展示下载包中的真实源码。先按导读理解职责，再沿调用链阅读。',link('project','返回项目'))+
 `<div class="filters">${COURSE.projectFiles.map((f,i)=>`<a class="filter ${f===file?'active':''}" href="#source/${i}">${esc(f.path)}</a>`).join('')}</div>`+
 codeBlock(file.code,`taskboard/${file.path}`,file.path.endsWith('.rs'))+footer();
}
function render(){
 const [page='home',arg]=location.hash.slice(1).split('/');const routes={home:advancedHome,course:()=>course(arg),lesson:()=>lesson(arg),practice,quiz,project:advancedProject,starter:project,guide:()=>guide(arg),source:()=>projectSource(arg),plan:roadmap,notes,reference};
 const current=Object.hasOwn(routes,page)?page:'home';$('#main').innerHTML=routes[current]();
 const names={home:'学习总览',course:'完整复习手册',lesson:'阅读章节',practice:'动手练习',quiz:'知识自测',project:'进阶综合项目',starter:'入门 CLI 项目',guide:'工程分步导读',source:'项目源码阅读',plan:'14 天复习路线',notes:'笔记与学习记录',reference:'速查表与资料'};
 $('#breadcrumb').textContent=names[current];document.title=`${current==='lesson'&&lessonById[arg]?lessonById[arg].title:names[current]} · Rust Reboot`;
 document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===(current==='lesson'?'course':['starter','guide','source'].includes(current)?'project':current);el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});updateProgress();
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function copyText(text){
 try{await navigator.clipboard.writeText(text);}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();const success=document.execCommand('copy');area.remove();if(!success)throw new Error('copy unavailable');}
}
document.addEventListener('click',async event=>{
 const scroll=event.target.closest('[data-scroll]');if(scroll){event.preventDefault();const target=document.getElementById(scroll.dataset.scroll);target?.scrollIntoView({behavior:'smooth'});if(scroll.dataset.scroll==='main')target?.focus({preventScroll:true});return;}
 const button=event.target.closest('[data-action]');if(!button)return;const name=button.dataset.action;
 if(name==='copy'){try{await copyText(button.closest('.code-panel').querySelector('code').textContent);notify('代码已复制');}catch{notify('复制不可用，请选中代码手动复制。');}}
 if(name==='complete'){const id=button.dataset.id;state.completed=completed(id)?state.completed.filter(x=>x!==id):[...state.completed,id];save();updateProgress();button.textContent=completed(id)?'✓ 已掌握 · 点击撤销':'标记为已掌握';notify(completed(id)?'已记录这一章的进度':'已撤销完成标记');}
 if(name==='print')window.print();
 if(name==='export')download('rust-reboot-progress.json',JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');
 if(name==='import')$('#import-file').click();
 if(name==='reset')$('#reset-dialog').showModal();
 if(name==='cancel-reset')$('#reset-dialog').close();
 if(name==='confirm-reset'){const theme=state.theme;state=initialState();state.theme=theme;save();$('#reset-dialog').close();render();notify('本地学习记录已清除');}
 if(name==='quiz-filter'){quizFilter=button.dataset.filter;quizPage=0;render();}
 if(name==='quiz-prev'){quizPage=Math.max(0,quizPage-1);render();window.scrollTo(0,0);}
 if(name==='quiz-next'){quizPage++;render();window.scrollTo(0,0);}
});
document.addEventListener('submit',event=>{
 const form=event.target.closest('[data-quiz]');if(!form)return;event.preventDefault();
 const selected=form.querySelector('input:checked');if(!selected)return;const question=questionById[form.dataset.quiz];
 state.answers[question.id]=Number(selected.value);save();updateProgress();form.querySelector('.answer-feedback').innerHTML=feedback(question.q,Number(selected.value)===question.q[2]);form.querySelector('button[type=submit]').textContent='重新检查';
});
document.addEventListener('input',event=>{
 if(event.target.matches('[data-note]')){state.notes[event.target.dataset.note]=event.target.value;save();$('#note-status').textContent=storageAvailable?'已保存到当前浏览器':'未能持久保存，请导出记录';}
});
document.addEventListener('change',event=>{
 if(event.target.matches('[data-milestone]')){const n=Number(event.target.dataset.milestone);state.milestones=event.target.checked?[...new Set([...state.milestones,n])]:state.milestones.filter(v=>v!==n);save();const tag=$('.section-title .tag');if(tag)tag.textContent=`${state.milestones.length} / 6 已验收`;}
 if(event.target.id==='quiz-phase'){quizPhase=event.target.value;quizPage=0;render();}
});
$('#import-file').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>2_000_000)throw new Error('文件过大，请选择小于 2 MB 的学习记录');const imported=sanitize(JSON.parse(await file.text()));state={...state,completed:[...new Set([...state.completed,...imported.completed])],notes:{...state.notes,...imported.notes},answers:{...state.answers,...imported.answers},milestones:[...new Set([...state.milestones,...imported.milestones])]};save();render();notify('学习记录已合并导入');}catch(error){notify('导入失败：'+error.message);}event.target.value='';
});
$('#search').addEventListener('input',event=>{const term=event.target.value;if(term.trim())search(term);else render();});
$('#theme-toggle').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';document.body.classList.toggle('dark',state.theme==='dark');save();});
$('#menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',open);});
document.addEventListener('click',event=>{if(!event.target.closest('.sidebar')&&!event.target.closest('#menu-toggle')){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}if(event.key==='Escape'){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');if(document.activeElement===$('#search')){$('#search').value='';$('#search').blur();render();}}});
window.addEventListener('hashchange',()=>{$('#search').value='';$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});});
render();if(!storageAvailable)notify('浏览器本地存储不可用，学习后请导出记录备份。');
