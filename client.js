const SCORE_API = "https://ddnbywabawofmmoxazdq.supabase.co/functions/v1/score-api";
const SCORE_PUBLIC_KEY = "sb_publishable_3RRUaC7s5TrJbVrtAqlkcw_hFRZhIxG";
let remoteRows = [];
let grade = "全部";
const events = [
  ["径赛", "100米", "男子 / 女子 · 决赛", "初一、初二、初三、高一、高二、高三"],
  ["径赛", "200米", "男子 / 女子 · 决赛", "初一、初二、初三、高一、高二、高三"],
  ["径赛", "400米", "男子 / 女子 · 决赛", "初一、初二、初三、高一、高二、高三"],
  ["径赛", "800米", "男子 / 女子 · 决赛", "初一、初二、初三、高一、高二、高三"],
  ["径赛", "4×100米接力", "男子 / 女子 · 决赛", "各年级"],
  ["田赛", "跳高 / 跳远", "按组别安排 · 决赛", "初中、高中"],
  ["田赛", "实心球", "按组别安排 · 决赛", "初中、高中"],
  ["田赛", "立定跳远 / 三级蛙跳", "按组别安排 · 决赛", "按年级及性别安排"],
];
function renderEvents() {
  const term = document.querySelector("#q").value.trim();
  const visible = events.filter(event => (grade === "全部" || event[3].includes(grade)) && (!term || event.join(" ").includes(term)));
  document.querySelector("#events").innerHTML = visible.length
    ? visible.map(event => `<article class="card"><div class="row"><span class="event">${event[1]}</span><span class="badge">${event[0]}</span></div><div class="meta">${event[2]}　·　${event[3]}</div></article>`).join("")
    : '<div class="card empty">没有找到相关项目</div>';
}

function normalizeScore(r) {
  return { id: r.id, event: r.event_name, div: r.division, name: r.athlete_name,
    className: r.class_name, result: String(r.result), mark: Number(r.result),
    schoolRecord: r.record_level === "school", gradeRecord: r.record_level === "grade" };
}
function getScores() { return remoteRows; }
function requestHeaders(extra = {}) {
  return { apikey: SCORE_PUBLIC_KEY, Authorization: `Bearer ${SCORE_PUBLIC_KEY}`, ...extra };
}
function gradeOf(div) { return (div || "").slice(0, 2); }
function isTrack(event) { return ["100米", "200米", "400米", "800米", "4×100米接力"].includes(event); }

async function refreshScores() {
  try {
    const response = await fetch(SCORE_API, { headers: requestHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "成绩读取失败");
    remoteRows = (data.results || []).map(normalizeScore);
    drawScores();
  } catch (error) {
    document.querySelector("#scoreList").innerHTML = `<div class="empty"><b>成绩暂时无法加载</b>${error.message}</div>`;
    document.querySelector("#adminList").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

function rankedScores() {
  const rows = getScores().map(row => ({ ...row }));
  const groups = {};
  rows.forEach(row => { const key = `${row.event}|${row.div}`; (groups[key] ||= []).push(row); });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => isTrack(a.event) ? a.mark - b.mark : b.mark - a.mark);
    let last = null, rank = 0;
    group.forEach((row, index) => {
      if (last === null || row.mark !== last) rank = index + 1;
      row.rank = rank;
      last = row.mark;
      row.points = ([7, 5, 4, 3, 2, 1][rank - 1] || 0) * (row.event.includes("接力") ? 2 : 1)
        + (row.schoolRecord ? 7 : 0) + (row.gradeRecord ? 5 : 0);
    });
  });
  return rows;
}

function drawScores() {
  const rows = rankedScores();
  document.querySelector("#published").textContent = rows.length;
  const rowHtml = (row, admin) => `<tr><td>${row.event}<br><small>${row.div}</small></td><td>${row.name}</td><td>${row.className}</td><td>${row.result}</td><td>${row.rank}</td><td>${row.points}</td>${admin ? `<td><button class="badge" onclick="openEditById('${row.id}')">修改</button></td>` : ""}</tr>`;
  const table = (data, admin = false) => `<div class="tablewrap"><table class="table"><thead><tr><th>项目 / 组别</th><th>姓名</th><th>班级</th><th>成绩</th><th>名次</th><th>积分</th>${admin ? "<th>操作</th>" : ""}</tr></thead><tbody>${data.map(row => rowHtml(row, admin)).join("")}</tbody></table></div>`;
  document.querySelector("#adminList").innerHTML = rows.length ? table(rows, true) : '<div class="empty">还没有录入记录</div>';
  const event = document.querySelector("#scoreEventFilter").value;
  const grade = document.querySelector("#scoreGradeFilter").value;
  const visible = rows.filter(row => (event === "全部" || row.event === event) && (grade === "全部" || gradeOf(row.div) === grade));
  document.querySelector("#scoreList").innerHTML = visible.length ? table(visible) : '<div class="empty"><b>暂无符合条件的成绩</b>试试更换项目或年级筛选</div>';
  drawRanks();
}

function drawRanks() {
  const type = document.querySelector("#rankTabs .active")?.dataset.rank || "初中";
  const rows = rankedScores().filter(row => type === "初中" ? gradeOf(row.div).startsWith("初") : gradeOf(row.div).startsWith("高"));
  const totals = {};
  rows.forEach(row => {
    if (!row.className) return;
    const total = totals[row.className] ||= { points: 0, firsts: 0 };
    total.points += row.points || 0;
    if (row.rank === 1) total.firsts++;
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1].points - a[1].points || b[1].firsts - a[1].firsts);
  document.querySelector("#rankList").innerHTML = sorted.length
    ? `<div class="tablewrap"><table class="table"><thead><tr><th>名次</th><th>班级</th><th>总分</th><th>第一名数</th></tr></thead><tbody>${sorted.map((item, i) => `<tr><td>${i + 1}</td><td>${item[0]}</td><td>${item[1].points}</td><td>${item[1].firsts}</td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty"><b>积分榜暂未生成</b>录入成绩后自动按班级累计<br>单项前六名：7、5、4、3、2、1分；接力加倍</div>';
}

function showAdmin() {
  const logged = !!sessionStorage.getItem("meetAdminPassword");
  document.querySelector("#loginBox").classList.toggle("hidden", logged);
  document.querySelector("#entryBox").classList.toggle("hidden", !logged);
}
async function loginAdmin() {
  const password = document.querySelector("#adminPassword").value;
  try {
    const response = await fetch(SCORE_API, { method: "POST", headers: requestHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ action: "verify", password }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "密码验证失败");
    sessionStorage.setItem("meetAdminPassword", password);
    document.querySelector("#loginError").textContent = "";
    showAdmin();
  } catch (error) { document.querySelector("#loginError").textContent = error.message; }
}
function logoutAdmin() { sessionStorage.removeItem("meetAdminPassword"); document.querySelector("#adminPassword").value = ""; showAdmin(); }
function setClassOptions(select, grade, selected = "") {
  select.innerHTML = '<option value="">请选择班级</option>';
  for (let n = 1; n <= 12; n++) { const value = `${grade}（${n}）班`; select.add(new Option(value, value)); }
  if (selected && !Array.from(select.options).some(option => option.value === selected)) select.add(new Option(selected, selected));
  select.value = selected;
}
function syncEntryClasses() { setClassOptions(document.querySelector("#className"), gradeOf(document.querySelector("#division").value)); }
function recordLevel() { return document.querySelector("#isRecord").checked ? document.querySelector("#recordLevel").value : "none"; }
function buildEntry(event, division, name, className, result, level) {
  return { event_name: event, division, athlete_name: name, class_name: className, result: Number(result), record_level: level };
}
async function postEntry(body, password) {
  const response = await fetch(SCORE_API, { method: "POST", headers: requestHeaders({ "Content-Type": "application/json", "x-admin-password": password }), body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "保存失败");
  return data;
}
async function addScore() {
  const password = sessionStorage.getItem("meetAdminPassword");
  const name = document.querySelector("#athlete").value.trim();
  const className = document.querySelector("#className").value;
  const result = document.querySelector("#result").value.trim();
  if (!password) return alert("请先登录工作人员账号");
  if (!name || !className || !result || !Number.isFinite(Number(result))) return alert("请填写姓名、班级和有效数字成绩");
  try {
    await postEntry({ action: "create", entry: buildEntry(document.querySelector("#eventSelect").value, document.querySelector("#division").value, name, className, result, recordLevel()) }, password);
    document.querySelector("#athlete").value = ""; document.querySelector("#className").value = ""; document.querySelector("#result").value = "";
    document.querySelector("#isRecord").checked = false; document.querySelector("#recordLevelWrap").classList.add("hidden");
    await refreshScores();
  } catch (error) { if (error.message.includes("未授权")) logoutAdmin(); alert(error.message); }
}
function openEditById(id) {
  const row = getScores().find(item => item.id === id); if (!row) return;
  document.querySelector("#editIndex").value = id;
  document.querySelector("#editEvent").value = row.event;
  document.querySelector("#editDivision").value = row.div;
  document.querySelector("#editName").value = row.name;
  setClassOptions(document.querySelector("#editClass"), gradeOf(row.div), row.className);
  document.querySelector("#editResult").value = row.result;
  const hasRecord = row.schoolRecord || row.gradeRecord;
  document.querySelector("#editRecord").checked = hasRecord;
  document.querySelector("#editRecordLevel").value = row.schoolRecord ? "school" : "grade";
  document.querySelector("#editRecordLevelWrap").classList.toggle("hidden", !hasRecord);
  document.querySelector("#editDialog").showModal();
}
async function saveEdit() {
  const password = sessionStorage.getItem("meetAdminPassword"), id = document.querySelector("#editIndex").value;
  const name = document.querySelector("#editName").value.trim(), className = document.querySelector("#editClass").value, result = document.querySelector("#editResult").value.trim();
  if (!password) return alert("请重新登录");
  if (!name || !className || !result || !Number.isFinite(Number(result))) return alert("请填写姓名、班级和有效数字成绩");
  const level = document.querySelector("#editRecord").checked ? document.querySelector("#editRecordLevel").value : "none";
  const entry = buildEntry(document.querySelector("#editEvent").value, document.querySelector("#editDivision").value, name, className, result, level);
  try { await postEntry({ action: "update", id, entry }, password); document.querySelector("#editDialog").close(); await refreshScores(); }
  catch (error) { if (error.message.includes("未授权")) logoutAdmin(); alert(error.message); }
}

document.querySelectorAll("#gradeTabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("#gradeTabs button").forEach(item => item.classList.remove("active")); button.classList.add("active"); grade = button.dataset.grade; renderEvents();
}));
document.querySelectorAll(".nav button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav button").forEach(item => item.classList.remove("active")); button.classList.add("active");
  document.querySelectorAll("main section").forEach(section => section.classList.add("hidden")); document.getElementById(button.dataset.page).classList.remove("hidden");
}));
document.querySelectorAll("#rankTabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("#rankTabs button").forEach(item => item.classList.remove("active")); button.classList.add("active"); drawRanks();
}));
document.querySelector("#scoreEventFilter").addEventListener("change", drawScores);
document.querySelector("#scoreGradeFilter").addEventListener("change", drawScores);
document.querySelector(".search button").addEventListener("click", renderEvents);
document.querySelector("#q").addEventListener("keydown", event => { if (event.key === "Enter") renderEvents(); });
document.querySelector("#division").addEventListener("change", syncEntryClasses);
document.querySelector("#editDivision").addEventListener("change", event => setClassOptions(document.querySelector("#editClass"), gradeOf(event.target.value)));
document.querySelector("#isRecord").addEventListener("change", event => document.querySelector("#recordLevelWrap").classList.toggle("hidden", !event.target.checked));
document.querySelector("#editRecord").addEventListener("change", event => document.querySelector("#editRecordLevelWrap").classList.toggle("hidden", !event.target.checked));
document.querySelector("#adminPassword").addEventListener("keydown", event => { if (event.key === "Enter") loginAdmin(); });
syncEntryClasses(); showAdmin(); refreshScores();

