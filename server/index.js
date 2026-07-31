/*
 * 日记本 · 极简推送服务
 * ------------------------------------------------------------
 * 纯前端 + localStorage 做不到「APP 关闭时也弹窗」，所以加了这个小后端：
 *   - 生成并持久化 VAPID 密钥
 *   - 保存浏览器的 PushSubscription（含各本的提醒时间）
 *   - 每 20s 轮询，命中提醒时间就用 Web Push 推一条通知
 *
 * 前端仍走 GitHub Pages（静态），这个服务单独部署到一个带 HTTPS 的
 * 免费 Node 主机即可（Render / Railway / Fly.io / 自己的 VPS 都行）。
 *
 * 运行：
 *   npm install
 *   PORT=3000 node index.js
 */

const http = require('http');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const STORE = path.join(DIR, 'subscriptions.json');
const VAPID_FILE = path.join(DIR, 'vapid.json');
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:diary@example.com';

// ===== VAPID 密钥（首次运行生成，之后复用，公钥必须稳定） =====
function ensureVapid() {
  if (fs.existsSync(VAPID_FILE)) {
    try { return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')); } catch (_) {}
  }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  return keys;
}
const vapid = ensureVapid();
webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);

// ===== 订阅存储 =====
function loadSubs() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (_) { return []; }
}
function saveSubs(subs) {
  fs.writeFileSync(STORE, JSON.stringify(subs, null, 2));
}

// ===== 工具 =====
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function nowHHMM() { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (_) { resolve({}); }
    });
  });
}

// ===== 路由 =====
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { sendJSON(res, 204, {}); return; }

  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;

  try {
    if (p === '/api/vapid-public-key' && req.method === 'GET') {
      return sendJSON(res, 200, { publicKey: vapid.publicKey });
    }

    if (p === '/api/subscribe' && req.method === 'POST') {
      const b = await readBody(req);
      const sub = b.subscription;
      if (!sub || !sub.endpoint) return sendJSON(res, 400, { error: 'bad subscription' });
      const subs = loadSubs();
      const deviceId = b.deviceId || ('dev_' + Date.now() + Math.random().toString(36).slice(2, 7));
      const idx = subs.findIndex((s) => s.deviceId === deviceId);
      const rec = {
        deviceId,
        subscription: sub,
        reminders: Array.isArray(b.reminders) ? b.reminders : [],
        lastFired: (idx >= 0 && subs[idx].lastFired) || {},
        updatedAt: Date.now()
      };
      if (idx >= 0) subs[idx] = rec; else subs.push(rec);
      saveSubs(subs);
      return sendJSON(res, 200, { ok: true, deviceId });
    }

    if (p === '/api/reminders' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.deviceId) return sendJSON(res, 400, { error: 'no deviceId' });
      const subs = loadSubs();
      const s = subs.find((x) => x.deviceId === b.deviceId);
      if (!s) return sendJSON(res, 404, { error: 'not subscribed' });
      s.reminders = Array.isArray(b.reminders) ? b.reminders : [];
      s.updatedAt = Date.now();
      saveSubs(subs);
      return sendJSON(res, 200, { ok: true });
    }

    if (p === '/api/unsubscribe' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.deviceId) return sendJSON(res, 400, { error: 'no deviceId' });
      const subs = loadSubs().filter((s) => s.deviceId !== b.deviceId);
      saveSubs(subs);
      return sendJSON(res, 200, { ok: true });
    }

    if (p === '/' && req.method === 'GET') {
      return sendJSON(res, 200, { service: 'xiaorizi-push', ok: true, subscribers: loadSubs().length });
    }

    return sendJSON(res, 404, { error: 'not found' });
  } catch (e) {
    return sendJSON(res, 500, { error: String(e && e.message || e) });
  }
});

// ===== 调度：到点推送 =====
async function tick() {
  const now = nowHHMM();
  const today = todayStr();
  const subs = loadSubs();
  let dirty = false;

  for (const s of subs) {
    for (const r of (s.reminders || [])) {
      if (!r.time || r.time !== now) continue;
      const key = (r.id || 'x') + '@' + today;
      if (s.lastFired && s.lastFired[key] === now) continue; // 这一分钟已推过
      const payload = JSON.stringify({
        title: '日记本',
        body: `该写${r.title || '日记'}啦 ~`,
        url: '/'
      });
      try {
        await webpush.sendNotification(s.subscription, payload);
        s.lastFired = s.lastFired || {};
        s.lastFired[key] = now;
        dirty = true;
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) { s.dead = true; dirty = true; } // 订阅失效，移除
        else {
          // 其它错误（网络抖动 / 订阅字段异常）：本分钟不再重试，避免刷日志
          s.lastFired = s.lastFired || {};
          s.lastFired[key] = now;
          dirty = true;
          console.warn('push send failed:', code || (e && e.message));
        }
      }
    }
  }

  const alive = subs.filter((s) => !s.dead);
  if (dirty || alive.length !== subs.length) saveSubs(alive);
}

setInterval(tick, 20000);
tick();

server.listen(PORT, () => {
  console.log(`xiaorizi-push 监听 :${PORT}`);
  console.log(`VAPID 公钥(前端会自动拉取，无需手动配置): ${vapid.publicKey.slice(0, 24)}…`);
});
