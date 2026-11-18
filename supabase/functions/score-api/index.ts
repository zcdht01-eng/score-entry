const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function validEntry(value: Record<string, unknown>) {
  const events = ["100米", "200米", "400米", "800米", "4×100米接力", "跳高", "跳远", "实心球（2公斤）", "立定跳远", "三级蛙跳"];
  const divisions = ["初一男子", "初一女子", "初二男子", "初二女子", "初三男子", "初三女子", "高一男子", "高一女子", "高二男子", "高二女子", "高三男子", "高三女子"];
  return typeof value.event_name === "string" && events.includes(value.event_name)
    && typeof value.division === "string" && divisions.includes(value.division)
    && typeof value.athlete_name === "string" && value.athlete_name.trim().length > 0
    && typeof value.class_name === "string" && value.class_name.trim().length > 0
    && Number.isFinite(Number(value.result)) && Number(value.result) >= 0
    && ["none", "school", "grade"].includes(String(value.record_level));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "服务端数据库配置不完整" }, 500);

  const tableUrl = `${supabaseUrl}/rest/v1/meet_results`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    const response = await fetch(`${tableUrl}?select=id,event_name,division,athlete_name,class_name,result,record_level,created_at&order=created_at.desc&limit=5000`, { headers });
    if (!response.ok) return json({ error: "读取成绩失败" }, 502);
    return json({ results: await response.json() });
  }

  if (req.method !== "POST") return json({ error: "不支持的请求方式" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "请求内容格式不正确" }, 400);
  }

  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPassword) return json({ error: "管理员密码尚未在 Supabase 设置" }, 503);

  if (body.action === "verify") {
    const supplied = typeof body.password === "string" ? body.password : "";
    return constantTimeEqual(supplied, adminPassword) ? json({ ok: true }) : json({ error: "密码不正确" }, 401);
  }

  const supplied = req.headers.get("x-admin-password") || "";
  if (!constantTimeEqual(supplied, adminPassword)) return json({ error: "未授权，请重新登录" }, 401);

  if (body.action === "create" || body.action === "update") {
    const entry = body.entry as Record<string, unknown> | undefined;
    if (!entry || !validEntry(entry)) return json({ error: "请检查项目、组别、姓名、班级和成绩" }, 400);
    const row = {
      event_name: entry.event_name,
      division: entry.division,
      athlete_name: String(entry.athlete_name).trim(),
      class_name: String(entry.class_name).trim(),
      result: Number(entry.result),
      record_level: entry.record_level,
      updated_at: new Date().toISOString(),
    };

    let url = tableUrl;
    let method = "POST";
    const requestHeaders: Record<string, string> = { ...headers, Prefer: "return=representation" };
    if (body.action === "update") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "成绩记录编号无效" }, 400);
      url += `?id=eq.${encodeURIComponent(id)}`;
      method = "PATCH";
    }
    const response = await fetch(url, { method, headers: requestHeaders, body: JSON.stringify(row) });
    if (!response.ok) return json({ error: "保存成绩失败" }, 502);
    const rows = await response.json();
    if (body.action === "update" && rows.length === 0) return json({ error: "找不到要修改的成绩记录" }, 404);
    return json({ result: rows[0] });
  }

  return json({ error: "未知操作" }, 400);
});

