const api = require("../../utils/api");
const scoring = require("../../utils/scoring");

const EVENT_NAMES = ["100米", "200米", "400米", "800米", "4×100米接力", "跳高", "跳远", "实心球（2公斤）", "立定跳远", "三级蛙跳"];
const DIVISIONS = ["初一男子", "初一女子", "初二男子", "初二女子", "初三男子", "初三女子", "高一男子", "高一女子", "高二男子", "高二女子", "高三男子", "高三女子"];
const GRADES = ["全部", "初一", "初二", "初三", "高一", "高二", "高三"];
function classOptions(division) { const grade = (division || "初一男子").slice(0,2); return Array.from({length:12},(_,i)=>`${grade}（${i+1}）班`); }

Page({
  data: {
    title: "汕头市谢易初中学第二十七届学生田径运动会", date: "12月15日",
    activeTab: "home", tabs: [{id:"home",name:"首页",icon:"⌂"},{id:"scores",name:"成绩",icon:"◷"},{id:"rank",name:"积分榜",icon:"▤"},{id:"admin",name:"录成绩",icon:"✎"}],
    events: [
      {type:"径赛",name:"100米",info:"男子 / 女子 · 决赛",grades:"初一、初二、初三、高一、高二、高三"},
      {type:"径赛",name:"200米",info:"男子 / 女子 · 决赛",grades:"初一、初二、初三、高一、高二、高三"},
      {type:"径赛",name:"400米",info:"男子 / 女子 · 决赛",grades:"初一、初二、初三、高一、高二、高三"},
      {type:"径赛",name:"800米",info:"男子 / 女子 · 决赛",grades:"初一、初二、初三、高一、高二、高三"},
      {type:"径赛",name:"4×100米接力",info:"男子 / 女子 · 决赛",grades:"各年级"},
      {type:"田赛",name:"跳高 / 跳远",info:"按组别安排 · 决赛",grades:"初中、高中"},
      {type:"田赛",name:"实心球",info:"按组别安排 · 决赛",grades:"初中、高中"},
      {type:"田赛",name:"立定跳远 / 三级蛙跳",info:"按年级及性别安排 · 决赛",grades:"按组别安排"}
    ],
    grades: GRADES, gradeIndex: 0, eventNames: ["全部项目", ...EVENT_NAMES], eventIndex: 0,
    entryEvents: EVENT_NAMES, entryEventIndex: 0, loggedIn: false,
    divisions: DIVISIONS, divisionIndex: 0, classes: classOptions(DIVISIONS[0]), classIndex: 0,
    rows: [], ranked: [], visibleScores: [], latestScores: [], classTotals: [], rankLevel: "初中",
    name: "", result: "", password: "", isRecord: false, recordLevel: "school", recordLevelOptions: ["校级纪录（+7分）","年级纪录（+5分）"],
    editingId: "", apiMessage: "大陆接口尚未配置。配置 HTTPS 域名后才能读取和保存成绩。", error: ""
  },
  onLoad() { this.setData({ loggedIn: !!getApp().globalData.adminToken }); this.loadScores(); },
  onPullDownRefresh() { this.loadScores().finally(() => wx.stopPullDownRefresh()); },
  async loadScores() {
    try {
      const data = await api.listScores();
      const rows = Array.isArray(data) ? data : (data.results || []);
      this.setData({ rows, ranked: scoring.rankScores(rows), apiMessage: "", error: "" });
      this.refreshViews();
    } catch (e) {
      this.setData({ rows: [], ranked: [], apiMessage: "大陆接口尚未配置或暂不可用。", error: e.message });
      this.refreshViews();
    }
  },
  refreshViews() {
    const grade = GRADES[this.data.gradeIndex], event = this.data.eventIndex ? EVENT_NAMES[this.data.eventIndex-1] : "全部";
    const visibleScores = this.data.ranked.filter(row => (grade === "全部" || row.division.startsWith(grade)) && (event === "全部" || row.event_name === event));
    this.setData({ visibleScores, latestScores: this.data.ranked.slice(0,5), classTotals: scoring.classTotals(this.data.rows,this.data.rankLevel) });
  },
  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.id }); },
  onGradeChange(e) { this.setData({ gradeIndex: Number(e.detail.value) }); this.refreshViews(); },
  onEventChange(e) { this.setData({ eventIndex: Number(e.detail.value) }); this.refreshViews(); },
  onEntryEventChange(e) { this.setData({ entryEventIndex: Number(e.detail.value) }); },
  onRankLevelChange(e) { this.setData({ rankLevel: e.currentTarget.dataset.level }); this.refreshViews(); },
  onDivisionChange(e) { const divisionIndex=Number(e.detail.value); this.setData({ divisionIndex, classes:classOptions(DIVISIONS[divisionIndex]), classIndex:0 }); },
  onClassChange(e) { this.setData({ classIndex:Number(e.detail.value) }); },
  onNameInput(e) { this.setData({ name:e.detail.value }); },
  onResultInput(e) { this.setData({ result:e.detail.value }); },
  onPasswordInput(e) { this.setData({ password:e.detail.value }); },
  onRecordChange(e) { this.setData({ isRecord:e.detail.value.length>0 }); },
  onRecordLevelChange(e) { this.setData({ recordLevel:Number(e.detail.value)===0?"school":"grade" }); },
  async login() {
    this.setData({ error:"" });
    try { const data=await api.login(this.data.password); getApp().globalData.adminToken=data.token; this.setData({ password:"", error:"", loggedIn:true }); wx.showToast({title:"登录成功",icon:"success"}); }
    catch(e) { this.setData({error:e.message}); }
  },
  editScore(e) {
    const row=this.data.rows.find(item=>item.id===e.currentTarget.dataset.id); if(!row)return;
    const divisionIndex=Math.max(0,DIVISIONS.indexOf(row.division)), classes=classOptions(row.division), classIndex=Math.max(0,classes.indexOf(row.class_name));
    this.setData({activeTab:"admin",editingId:row.id,entryEventIndex:Math.max(0,EVENT_NAMES.indexOf(row.event_name)),divisionIndex,classes,classIndex,name:row.athlete_name,result:String(row.result),isRecord:row.record_level!=="none",recordLevel:row.record_level==="grade"?"grade":"school"});
  },
  async saveScore() {
    const token=getApp().globalData.adminToken;
    if(!token)return this.setData({error:"请先登录工作人员账号"});
    const name=this.data.name.trim(), result=Number(this.data.result), division=DIVISIONS[this.data.divisionIndex], className=this.data.classes[this.data.classIndex];
    if(!name||!className||!Number.isFinite(result))return this.setData({error:"请填写姓名、班级和有效数字成绩"});
    const eventName=EVENT_NAMES[this.data.entryEventIndex], entry={event_name:eventName,division,athlete_name:name,class_name:className,result,record_level:this.data.isRecord?this.data.recordLevel:"none"};
    try {
      if(this.data.editingId) await api.updateScore(this.data.editingId,entry,token); else await api.createScore(entry,token);
      this.setData({editingId:"",name:"",result:"",isRecord:false,error:""}); wx.showToast({title:"成绩已保存",icon:"success"}); await this.loadScores();
    } catch(e) { this.setData({error:e.message}); }
  },
  logout() { getApp().globalData.adminToken=""; this.setData({loggedIn:false,password:"",editingId:""}); }
});
