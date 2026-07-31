/* 日记本 · 治愈手帐 —— 纯前端 localStorage 实现 */
(function () {
  'use strict';

  const STORE_KEY = 'xiaorizi_state_v1';
  const root = document.getElementById('app');
  const modalRoot = document.getElementById('modal');
  const toastRoot = document.getElementById('toast');

  // ===== 配置：配色 / 纹理 =====
  const COLOR_OPTIONS = [
    { name: '雾蓝', color: '#cfe0ea' },
    { name: '雾粉', color: '#f2d7df' },
    { name: '鼠尾草', color: '#d6e0d2' },
    { name: '薰衣草', color: '#ddd6e8' },
    { name: '奶油', color: '#efe6cf' },
    { name: '蜜桃', color: '#f3dccf' },
    { name: '薄荷', color: '#d4e8df' },
    { name: '燕麦', color: '#e6ded3' }
  ];

  const PATTERNS = [
    // —— 主功能本专用（自定义本不可选）——
    { key: 'snow', glyph: '❄️', label: '雪花' },
    { key: 'floral', glyph: '🌸', label: '碎花' },
    // —— 原有通用 ——
    { key: 'dots', glyph: '•', label: '圆点' },
    { key: 'leaves', glyph: '🍃', label: '落叶' },
    { key: 'stars', glyph: '✦', label: '星星' },
    { key: 'hearts', glyph: '🤍', label: '爱心' },
    { key: 'waves', glyph: '〜', label: '波浪' },
    { key: 'none', glyph: '', label: '纯色' },
    // —— 新增自定义本纹理 ——
    { key: 'sun', glyph: '☀️', label: '太阳' },
    { key: 'rainbow', glyph: '🌈', label: '彩虹' },
    { key: 'star', glyph: '🌟', label: '亮星' },
    { key: 'gift', glyph: '🎁', label: '礼物' },
    { key: 'sparkles', glyph: '✨', label: '闪光' },
    { key: 'party', glyph: '🎊', label: '彩球' },
    { key: 'tada', glyph: '🎉', label: '礼花' },
    { key: 'hearts2', glyph: '💖', label: '心心' },
    { key: 'hearts3', glyph: '💗', label: '粉心' },
    { key: 'strawberry', glyph: '🍓', label: '草莓' },
    { key: 'apple', glyph: '🍎', label: '苹果' },
    { key: 'orange', glyph: '🍊', label: '橘子' },
    { key: 'watermelon', glyph: '🍉', label: '西瓜' },
    { key: 'burger', glyph: '🍔', label: '汉堡' },
    { key: 'icecream', glyph: '🍦', label: '冰淇淋' },
    { key: 'cocktail', glyph: '🍸', label: '鸡尾酒' },
    { key: 'greenapple', glyph: '🍏', label: '青苹果' },
    { key: 'cherry', glyph: '🍒', label: '樱桃' },
    { key: 'grapes', glyph: '🍇', label: '葡萄' },
    { key: 'peach', glyph: '🍑', label: '桃子' },
    { key: 'pineapple', glyph: '🍍', label: '菠萝' },
    { key: 'milk', glyph: '🥛', label: '牛奶' },
    { key: 'pretzel', glyph: '🥨', label: '椒盐卷' },
    { key: 'coconut', glyph: '🥥', label: '椰子' },
    { key: 'kiwi', glyph: '🥝', label: '猕猴桃' },
    { key: 'clover', glyph: '🍀', label: '四叶草' },
    { key: 'maple', glyph: '🍁', label: '枫叶' },
    { key: 'blossom', glyph: '🌼', label: '小雏菊' },
    { key: 'rosette', glyph: '🏵️', label: '玫瑰' },
    { key: 'butterfly', glyph: '🦋', label: '蝴蝶' },
    { key: 'peacock', glyph: '🦚', label: '孔雀' },
    { key: 'swan', glyph: '🦢', label: '天鹅' },
    { key: 'money', glyph: '🤑', label: '金币' },
    { key: 'plane', glyph: '✈️', label: '飞机' },
    { key: 'tea', glyph: '🍵', label: '茶' },
    { key: 'bread', glyph: '🥖', label: '面包' },
    { key: 'cupcake', glyph: '🧁', label: '杯子蛋糕' },
    { key: 'pill', glyph: '💊', label: '药丸' },
    { key: 'sprout', glyph: '🌱', label: '嫩芽' },
    { key: 'paw', glyph: '🐾', label: '爪印' }
  ];

  // 自定义本可用纹理（排除主功能本专用的 snow/floral）
  const CUSTOM_PATTERNS = PATTERNS.filter(p => p.key !== 'snow' && p.key !== 'floral');

  // 富文本编辑器的文字颜色（与整体 Morandi 低饱和风格一致）
  const NOTE_TEXT_COLORS = [
    '#5b554c', '#8a8276', '#7a6f8e', '#9a7b6f',
    '#6f8a7a', '#b08a8a', '#5b6b8a', '#a88a5b'
  ];

  // ===== 后台推送（极简 Node 服务地址）=====
  // 纯前端做不到「APP 关闭时也弹窗」，需要一个单独部署、带 HTTPS 的推送服务。
  // 把这个占位地址换成你部署好的服务地址即可（前端会自动从它拉取 VAPID 公钥）。
  const PUSH_SERVER_URL = 'https://YOUR-PUSH-SERVER.example.com';
  const PUSH_CONFIGURED = typeof PUSH_SERVER_URL === 'string' && PUSH_SERVER_URL.indexOf('YOUR-PUSH-SERVER') === -1;
  const PUSH_ON_KEY = 'xiaorizi_push_on';
  const DEVICE_ID_KEY = 'xiaorizi_device_id';

  // ===== 工具函数 =====
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function todayStr() { return ymd(new Date()); }
  function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); }
  function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function weekday(s) { return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseYmd(s).getDay()]; }
  function friendlyDate(s) {
    const t = todayStr();
    if (s === t) return '今天';
    const d = new Date(); d.setDate(d.getDate() + 1);
    if (s === ymd(d)) return '明天';
    return `${parseYmd(s).getMonth() + 1}月${parseYmd(s).getDate()}日`;
  }
  function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function contrastText(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#4a443d' : '#fffdfa';
  }

  const patternCache = new Map();

  // 用 canvas 把 emoji 画成 PNG 纹理贴图，绕过 SVG background 中 emoji 经常无法
  // 渲染成彩色/甚至不渲染的问题，保证手机端纹理可见且可区分。
  function patternBackground(color, patternKey) {
    const p = PATTERNS.find(x => x.key === patternKey) || PATTERNS[0];
    if (!p.glyph) return color;
    const key = `${color}|${p.glyph}`;
    if (patternCache.has(key)) return patternCache.get(key);

    const size = 80;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    ctx.font = `${Math.round(size * 0.42)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", emoji, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.32;
    ctx.fillText(p.glyph, size / 2, size / 2 + size * 0.04);

    const url = `url(${c.toDataURL('image/png')})`;
    patternCache.set(key, url);
    return `${color} ${url}`;
  }

  // ===== 状态 =====
  function defaultState() {
    return {
      notebooks: [
        {
          id: 'nb_tomorrow', kind: 'tomorrow', title: '明日计划本', emoji: '❄️',
          color: '#cfe0ea', pattern: 'snow', fixed: true, reminder: '21:00', entries: {}
        },
        {
          id: 'nb_success', kind: 'success', title: '成功日记本', emoji: '🌸',
          color: '#f2d7df', pattern: 'floral', fixed: true, reminder: '21:30', entries: {}
        }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('读取本地数据失败', e); }
    return defaultState();
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {
      showToast('保存失败，存储空间可能已满');
    }
  }

  // 老用户本地数据平滑升级（幂等、异常不阻塞启动）
  function migrateState() {
    try {
      state.notebooks.forEach(nb => {
        if (nb.defaultFontSize === undefined) nb.defaultFontSize = 16;
        if (nb.defaultColor === undefined) nb.defaultColor = '#5b554c';
        Object.keys(nb.entries || {}).forEach(date => {
          nb.entries[date] = (nb.entries[date] || []).map(e => {
            if (e.html !== undefined || e.status !== undefined || e.text === undefined) return e;
            const html = '<p>' + escapeHtml(e.text).replace(/\n/g, '</p><p>') + '</p>';
            return {
              id: e.id, html, title: '',
              createdAt: Date.now(), updatedAt: Date.now(),
              fontSize: 16, color: '#5b554c'
            };
          });
        });
      });
    } catch (err) {
      console.warn('本地数据迁移失败,已跳过', err);
    }
  }

  const state = loadState();
  migrateState();
  const view = { notebookId: null, dates: {}, modal: null, editing: null };
  const firedReminders = new Set();
  let suppressOpen = false; // 长按后抑制紧接着的误触“打开”点击

  function getNotebook(id) { return state.notebooks.find(n => n.id === id); }
  function currentDate(nb) {
    if (!view.dates[nb.id]) view.dates[nb.id] = nb.kind === 'tomorrow' ? tomorrowStr() : todayStr();
    return view.dates[nb.id];
  }
  function getEntries(nb, date) { return nb.entries[date] || []; }
  function setEntries(nb, date, arr) {
    if (arr.length) nb.entries[date] = arr;
    else delete nb.entries[date];
    saveState();
  }

  // ===== Toast =====
  let toastTimer;
  function showToast(msg) {
    toastRoot.textContent = msg;
    toastRoot.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastRoot.classList.remove('show'), 2200);
  }

  // ===== 首页 =====
  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了，早点休息 🌙';
    if (h < 11) return '早安，今天也慢慢来 ☀️';
    if (h < 14) return '中午好，记得休息一下 🍵';
    if (h < 18) return '下午好，保持自己的节奏 🌿';
    return '晚上好，给今天画个句号吧 🕯️';
  }

  function countToday(nb) {
    const arr = getEntries(nb, todayStr());
    if (nb.kind === 'tomorrow') return `${arr.filter(e => e.status === 'done').length}/${arr.length} 完成`;
    return `${arr.length} 条记录`;
  }

  function homeView() {
    const cards = state.notebooks.map(nb => `
      <button class="nb-card" data-action="open-notebook" data-id="${nb.id}" data-fixed="${nb.fixed}"
              style="background:${patternBackground(nb.color, nb.pattern)};--nb-color:${nb.color};--nb-text:${contrastText(nb.color)}">
        <div>
          <div class="nb-emoji">${nb.emoji}</div>
          <div class="nb-title">${escapeHtml(nb.title)}</div>
          <div class="nb-meta">${countToday(nb)} · ${nb.reminder ? nb.reminder : '无提醒'}</div>
        </div>
      </button>
    `).join('');

    return `
      <div class="home">
        <header class="home-header">
          <h1 class="app-title">日记本</h1>
          <p class="app-subtitle">${greeting()}</p>
        </header>
        <div class="nb-grid">
          ${cards}
          <button class="nb-card nb-add" data-action="open-add-notebook">
            <div class="nb-emoji">＋</div>
            <div class="nb-title">新建本子</div>
          </button>
        </div>
      </div>
    `;
  }

  // ===== 笔记本内页 =====
  function notebookView(nb) {
    const date = currentDate(nb);
    const entries = getEntries(nb, date);
    const title = escapeHtml(nb.title);
    const isCustom = nb.kind === 'custom';

    let body = '';
    if (nb.kind === 'tomorrow') body = tomorrowBody(nb, date, entries);
    else if (nb.kind === 'success') body = successBody(nb, date, entries);
    else body = customBody(nb, date, entries);

    return `
      <div class="notebook-view" style="--nb-color:${nb.color};--nb-text:${contrastText(nb.color)}">
        <div class="top-bar">
          <button class="back-btn" data-action="back" aria-label="返回">←</button>
          <div class="top-title">${title}</div>
          <button class="icon-btn" data-action="open-reminders" aria-label="提醒设置">⏰</button>
        </div>
        <div class="date-bar ${isCustom ? 'date-bar-plain' : ''}">
          ${isCustom ? '' : `<button class="icon-btn" data-action="prev-date" aria-label="上一天">‹</button>`}
          <div class="date-pill" data-action="open-calendar">
            <div class="date-main">${friendlyDate(date)} · ${weekday(date)}</div>
            ${isCustom ? '' : `<div class="date-sub">${date} · 点击查看日历</div>`}
          </div>
          ${isCustom ? '' : `<button class="icon-btn" data-action="next-date" aria-label="下一天">›</button>`}
        </div>
        ${body}
      </div>
    `;
  }

  function addInputRow(nb) {
    const placeholder =
      nb.kind === 'tomorrow' ? '添加一条明日计划…' :
      nb.kind === 'success' ? '写一件今天做得好的小事…' :
      '写点什么…';
    return `
      <div class="add-row">
        <input type="text" id="entry-input" class="add-input" maxlength="200"
               placeholder="${placeholder}" autocomplete="off">
        <button class="add-btn" data-action="add-entry">＋</button>
      </div>
    `;
  }

  function emptyState(nb) {
    const text =
      nb.kind === 'tomorrow' ? '为明天写几件想完成的小事吧 ✍️' :
      nb.kind === 'success' ? '今天有哪些小成就？哪怕很小也值得记下 🌷' :
      '这里还是空的，写下第一条记录吧 🍃';
    return `<div class="empty-state"><div class="emoji">🕊️</div><p>${text}</p></div>`;
  }

  // 明日计划
  function tomorrowBody(nb, date, entries) {
    const list = entries.length ? entries.map(e => tomorrowItem(e)).join('') : '';
    return `
      <div class="panel">
        <p class="panel-title">${date === todayStr() ? '今日待复盘' : date === tomorrowStr() ? '明日计划' : '当日计划'}</p>
        ${addInputRow(nb)}
        <div class="entry-list">
          ${list || emptyState(nb)}
        </div>
      </div>
    `;
  }

  function tomorrowItem(e) {
    const done = e.status === 'done';
    const failed = e.status === 'failed';
    const cls = done ? 'done' : failed ? 'failed' : 'pending';
    const noteHtml = done ? `
      <div class="entry-note">
        <div class="note-label">心得 / 备注（可选）</div>
        <textarea class="note-input" data-action="save-note" data-id="${e.id}" placeholder="完成后的一点感受…">${escapeHtml(e.note || '')}</textarea>
      </div>
    ` : failed ? `
      <div class="entry-note">
        <div class="note-label note-required">复盘备注（必须）</div>
        <div class="note-input" style="background:var(--paper-soft);border:none;padding:0;color:var(--ink-light);font-style:italic;">${escapeHtml(e.note || '')}</div>
      </div>
    ` : '';

    const actions = done ? `
      <button class="action-btn btn-revert" data-action="revert-entry" data-id="${e.id}" title="重置">↺</button>
      <button class="action-btn btn-delete" data-action="delete-entry" data-id="${e.id}" title="删除">×</button>
    ` : failed ? `
      <button class="action-btn btn-revert" data-action="revert-entry" data-id="${e.id}" title="重置">↺</button>
      <button class="action-btn btn-delete" data-action="delete-entry" data-id="${e.id}" title="删除">×</button>
    ` : `
      <button class="action-btn btn-check" data-action="done-entry" data-id="${e.id}" title="完成">✓</button>
      <button class="action-btn btn-fail" data-action="fail-entry" data-id="${e.id}" title="未完成">×</button>
      <button class="action-btn btn-delete" data-action="delete-entry" data-id="${e.id}" title="删除">×</button>
    `;

    return `
      <div class="entry-item ${cls}">
        <div class="entry-main">
          <div class="entry-text">${escapeHtml(e.text)}</div>
          <div class="entry-actions">${actions}</div>
        </div>
        ${noteHtml}
      </div>
    `;
  }

  // 成功日记
  function successBody(nb, date, entries) {
    const count = entries.length;
    const reached = count >= 5;
    const pct = Math.min(100, (count / 5) * 100);
    const list = entries.length ? entries.map(e => successItem(e)).join('') : '';
    const tracker = `
      <div class="success-tracker">
        <div class="success-bar"><div class="success-fill" style="width:${pct}%"></div></div>
        <div class="success-count">${count} / 5</div>
      </div>
      ${reached ? `
        <div class="success-celebrate">
          <div class="big">✨ 🌸 ✨</div>
          <p>今天已经收集到 5 颗小星星，真棒</p>
        </div>
      ` : `<p class="success-tip">再写 ${5 - count} 件小成就，今天就更完整啦 ~</p>`}
    `;
    return `
      <div class="panel">
        <p class="panel-title">${date === todayStr() ? '今天的闪光点' : `${date} 的闪光点`}</p>
        ${tracker}
        ${addInputRow(nb)}
        <div class="entry-list">${list || emptyState(nb)}</div>
      </div>
    `;
  }

  function successItem(e) {
    return `
      <div class="entry-item">
        <div class="entry-main">
          <div class="entry-text">${escapeHtml(e.text)}</div>
          <div class="entry-actions">
            <button class="action-btn btn-delete" data-action="delete-entry" data-id="${e.id}" title="删除">×</button>
          </div>
        </div>
      </div>
    `;
  }

  // 自定义本子
  function customBody(nb, date, entries) {
    const list = entries.length ? entries.map(e => customCard(e)).join('') : '';
    return `
      <div class="panel panel-custom">
        <div class="entry-list">${list}</div>
        <div class="custom-new-box" data-action="write-new">
          <span class="custom-new-placeholder">${entries.length ? '继续写点什么…' : '写新记录…'}</span>
        </div>
      </div>
    `;
  }

  function customCard(e) {
    const title = (e.title || firstLine(e.html) || '无标题').trim();
    const preview = plainPreview(e.html || e.text || '', 80);
    const time = friendlyTime(e.createdAt);
    return `
      <div class="note-card" data-id="${e.id}">
        <div class="note-card-head">
          <div class="note-card-title">${escapeHtml(title)}</div>
          <div class="note-card-time">${time}</div>
        </div>
        <div class="note-card-preview">${escapeHtml(preview)}</div>
        <div class="note-card-actions">
          <button class="note-act" data-action="read-entry" data-id="${e.id}" title="阅读">👁</button>
          <button class="note-act" data-action="edit-entry" data-id="${e.id}" title="编辑">✎</button>
          <button class="note-act note-act-del" data-action="delete-entry" data-id="${e.id}" title="删除">🗑</button>
        </div>
      </div>
    `;
  }

  // ===== 渲染与视图切换 =====
  function render() {
    if (view.notebookId) {
      const nb = getNotebook(view.notebookId);
      if (nb) root.innerHTML = notebookView(nb);
      else { view.notebookId = null; root.innerHTML = homeView(); }
    } else {
      root.innerHTML = homeView();
    }
  }

  function openNotebook(id) {
    view.notebookId = id;
    render();
  }

  function openCalendar() {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const selected = currentDate(nb);
    const now = new Date();
    const base = { year: now.getFullYear(), month: now.getMonth() };
    openModal(calendarHTML(nb, selected, base));
    renderCalendar(nb, selected, base);
  }

  function shiftDate(delta) {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const d = parseYmd(currentDate(nb));
    d.setDate(d.getDate() + delta);
    view.dates[nb.id] = ymd(d);
    render();
  }

  // ===== 弹窗系统 =====
  function openModal(html) {
    modalRoot.innerHTML = `<div class="modal-backdrop">${html}</div>`;
    modalRoot.setAttribute('aria-hidden', 'false');
    modalRoot.classList.add('show');
    requestAnimationFrame(() => {
      const bd = modalRoot.querySelector('.modal-backdrop');
      if (bd) {
        bd.classList.add('in');
        if (bd.querySelector('.editor-fullscreen')) bd.classList.add('editor-backdrop');
      }
    });
  }

  function closeModal() {
    suppressOpen = false;
    modalRoot.classList.remove('show');
    modalRoot.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modalRoot.innerHTML = ''; }, 250);
  }

  modalRoot.addEventListener('click', e => {
    // 长按松开后的“误触点击”不应点掉确认弹窗
    if (suppressOpen) { suppressOpen = false; return; }
    if (e.target === e.currentTarget.querySelector('.modal-backdrop')) closeModal();
  });

  // ===== 日历 =====
  let calendarState = null;

  function calendarHTML(nb, selected, base) {
    return `
      <div class="modal-panel">
        <div class="modal-title">选择日期</div>
        <div class="calendar-header">
          <div class="calendar-month" id="cal-month">—</div>
          <div class="calendar-nav">
            <button class="icon-btn" data-action="cal-prev">‹</button>
            <button class="icon-btn" data-action="cal-next">›</button>
          </div>
        </div>
        <div class="calendar-grid" id="cal-grid-head">
          ${['日', '一', '二', '三', '四', '五', '六'].map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
        </div>
        <div class="calendar-grid" id="cal-grid-body"></div>
        <button class="modal-close" data-action="close-modal">关闭</button>
      </div>
    `;
  }

  function renderCalendar(nb, selected, base) {
    calendarState = { nb, selected, base };
    const year = base.year, month = base.month;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const days = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthEl = $('#cal-month');
    if (monthEl) monthEl.textContent = `${year}年 ${monthNames[month]}`;

    const body = $('#cal-grid-body');
    if (!body) return;

    let html = '';
    // 上月
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevLast - i;
      const s = ymd(new Date(year, month - 1, d));
      html += dayBtn(s, d, true, selected, nb);
    }
    // 当月
    for (let d = 1; d <= days; d++) {
      const s = ymd(new Date(year, month, d));
      html += dayBtn(s, d, false, selected, nb);
    }
    // 下月
    const tail = (7 - ((startDay + days) % 7)) % 7;
    for (let d = 1; d <= tail; d++) {
      const s = ymd(new Date(year, month + 1, d));
      html += dayBtn(s, d, true, selected, nb);
    }
    body.innerHTML = html;
  }

  function dayBtn(dateStr, day, other, selected, nb) {
    const cls = [
      'calendar-day',
      other ? 'other' : '',
      dateStr === todayStr() ? 'today' : '',
      dateStr === selected ? 'selected' : '',
      getEntries(nb, dateStr).length ? 'has-data' : ''
    ].filter(Boolean).join(' ');
    return `<button class="${cls}" data-action="select-date" data-date="${dateStr}">${day}</button>`;
  }

  function selectCalendarDate(dateStr) {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    view.dates[nb.id] = dateStr;
    closeModal();
    render();
  }

  // ===== 新建本子 =====
  function openAddNotebookModal() {
    let selectedColor = COLOR_OPTIONS[2].color;
    let selectedPattern = 'sun';

    function colorSwatches() {
      return COLOR_OPTIONS.map(c => `
        <button class="swatch ${c.color === selectedColor ? 'selected' : ''}"
                data-action="select-color" data-color="${c.color}"
                style="background:${c.color}" aria-label="${c.name}"></button>
      `).join('');
    }

    function patternSwatches() {
      return CUSTOM_PATTERNS.map(p => `
        <button class="pattern-option ${p.key === selectedPattern ? 'selected' : ''}"
                data-action="select-pattern" data-pattern="${p.key}"
                style="background:${selectedColor};color:${contrastText(selectedColor)}"
                aria-label="${p.label}">${p.glyph || '无'}</button>
      `).join('');
    }

    function refresh() {
      $('#nb-color-list').innerHTML = colorSwatches();
      $('#nb-pattern-list').innerHTML = patternSwatches();
    }

    openModal(`
      <div class="modal-panel" id="add-nb-panel">
        <div class="modal-title">新建自定义本子</div>
        <div class="form-group">
          <label class="form-label">本子名称</label>
          <input type="text" id="nb-title-input" class="form-input" maxlength="12" placeholder="例如：学习本、情绪本…">
        </div>
        <div class="form-group">
          <label class="form-label">颜色</label>
          <div class="swatches" id="nb-color-list">${colorSwatches()}</div>
        </div>
        <div class="form-group">
          <label class="form-label">纹理</label>
          <div class="swatches" id="nb-pattern-list">${patternSwatches()}</div>
        </div>
        <button class="modal-close primary" data-action="create-notebook" id="nb-create-btn">创建</button>
        <button class="modal-close" data-action="close-modal">取消</button>
      </div>
    `);

    // 挂起此面板的中间态用于选项刷新
    $('#add-nb-panel').addEventListener('click', e => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      if (t.dataset.action === 'select-color') {
        selectedColor = t.dataset.color;
        refresh();
      } else if (t.dataset.action === 'select-pattern') {
        selectedPattern = t.dataset.pattern;
        refresh();
      } else if (t.dataset.action === 'create-notebook') {
        createNotebook(selectedColor, selectedPattern);
      }
    });
  }

  function createNotebook(color, pattern) {
    const input = $('#nb-title-input');
    const title = input.value.trim();
    if (!title) { showToast('给本子起个名字吧'); return; }
    const nb = {
      id: 'nb_' + generateId(), kind: 'custom', title,
      emoji: '📓', color, pattern,
      fixed: false, reminder: null, entries: {},
      defaultFontSize: 16, defaultColor: '#5b554c'
    };
    state.notebooks.push(nb);
    saveState();
    closeModal();
    openNotebook(nb.id);
    showToast('本子已创建');
  }

  // ===== 提醒设置 =====
  function triggersSupported() {
    try { return typeof Notification !== 'undefined' && 'showTrigger' in Notification.prototype; }
    catch (_) { return false; }
  }

  function openRemindersModal() {
    const pushOn = localStorage.getItem(PUSH_ON_KEY) === '1';
    const canTrigger = triggersSupported();
    const showToggle = canTrigger || PUSH_CONFIGURED;
    const subText = canTrigger
      ? '无需服务器，到点由浏览器准时弹窗（安卓 Chrome / Edge 支持）'
      : '配合推送服务，到点弹窗';
    const pushBlock = showToggle ? `
      <div class="push-toggle-row">
        <div class="push-toggle-text">
          <div class="push-toggle-title">后台提醒</div>
          <div class="push-toggle-sub">${subText}</div>
        </div>
        <button class="switch ${pushOn ? 'on' : ''}" data-action="toggle-push" role="switch" aria-checked="${pushOn}"><span class="knob"></span></button>
      </div>
    ` : `
      <p class="success-tip">到设置的时间、且日记本处于打开状态时，会温柔提醒你（此浏览器不支持后台定时弹窗）</p>
    `;
    openModal(`
      <div class="modal-panel">
        <div class="modal-title">每日提醒</div>
        ${pushBlock}
        <div id="reminder-list">
          ${state.notebooks.map(nb => `
            <div class="reminder-row">
              <div class="reminder-name"><span>${nb.emoji}</span> ${escapeHtml(nb.title)}</div>
              <input type="time" class="reminder-time" data-action="update-reminder" data-id="${nb.id}" value="${nb.reminder || ''}">
            </div>
          `).join('')}
        </div>
        <button class="modal-close primary" data-action="close-modal">完成</button>
      </div>
    `);
  }

  function updateReminder(id, value) {
    const nb = getNotebook(id);
    if (!nb) return;
    nb.reminder = value || null;
    saveState();
    showToast(`${nb.title} 提醒已${value ? '设为 ' + value : '关闭'}`);
    if (localStorage.getItem(PUSH_ON_KEY) === '1') {
      pushRemindersUpdate();
      scheduleRemindersViaTrigger();
    }
  }

  // ===== 后台推送（Web Push）=====
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function getVapidPublicKey() {
    const res = await fetch(PUSH_SERVER_URL + '/api/vapid-public-key');
    const j = await res.json();
    return j.publicKey;
  }

  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('当前浏览器不支持后台推送');
      return false;
    }
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') { showToast('未授权通知权限'); return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const publicKey = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const reminders = state.notebooks
        .filter(nb => nb.reminder)
        .map(nb => ({ id: nb.id, title: nb.title, time: nb.reminder }));
      const res = await fetch(PUSH_SERVER_URL + '/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), subscription: sub, reminders })
      });
      if (!res.ok) { showToast('订阅失败，请检查推送服务地址'); return false; }
      showToast('已开启后台提醒 ✓');
      return true;
    } catch (e) {
      showToast('订阅失败：' + (e && e.message ? e.message : e));
      return false;
    }
  }

  async function unsubscribeFromPush() {
    try {
      await fetch(PUSH_SERVER_URL + '/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() })
      });
    } catch (_) {}
    showToast('已关闭后台提醒');
  }

  async function pushRemindersUpdate() {
    if (!PUSH_CONFIGURED) return;
    if (localStorage.getItem(PUSH_ON_KEY) !== '1') return;
    try {
      const reminders = state.notebooks
        .filter(nb => nb.reminder)
        .map(nb => ({ id: nb.id, title: nb.title, time: nb.reminder }));
      await fetch(PUSH_SERVER_URL + '/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), reminders })
      });
    } catch (_) {}
  }

  // ===== 后台提醒（Notification Triggers，无需任何服务器）=====
  // 让浏览器在指定时间戳弹通知，即使 APP / Service Worker 都没在跑也由系统调度。
  // 支持 Chromium 系（安卓 Chrome / Edge）；iOS Safari 不支持，需走后端 Web Push。
  async function scheduleRemindersViaTrigger() {
    if (!triggersSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const now = Date.now();
      for (const nb of state.notebooks) {
        if (!nb.reminder) continue;
        const [h, m] = nb.reminder.split(':').map(Number);
        const t = new Date(); t.setHours(h, m, 0, 0);
        if (t.getTime() <= now) t.setDate(t.getDate() + 1); // 取下一次出现
        const tag = 'reminder-' + nb.id;
        const existing = await reg.getNotifications({ tag });
        existing.forEach(n => n.close()); // 先取消旧的定时，避免重复
        await reg.showNotification('日记本', {
          body: `该写${nb.title}啦 ~`,
          tag,
          showTrigger: { timestamp: t.getTime() },
          data: { url: '/' }
        });
      }
      return true;
    } catch (e) { return false; }
  }

  async function cancelScheduledReminders() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const all = await reg.getNotifications();
      all.forEach(n => { if ((n.tag || '').indexOf('reminder-') === 0) n.close(); });
    } catch (_) {}
    try { await unsubscribeFromPush(); } catch (_) {}
  }

  async function cancelOneReminder(nbId) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.getNotifications({ tag: 'reminder-' + nbId });
      existing.forEach(n => n.close());
    } catch (_) {}
  }

  // ===== 富文本 / 自定义本辅助 =====
  function firstLine(html) {
    const text = plainPreview(html, 500).replace(/\s+/g, ' ').trim();
    return (text.split('\n')[0] || '').trim();
  }

  function plainPreview(html, len) {
    let s = String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    s = s.replace(/\n{2,}/g, '\n').trim();
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  function friendlyTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // 白名单消毒：仅放行 p/br/div/span/b/strong/i/em/u/img，图片仅 data:image
  function sanitizeHtml(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const allowed = ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 'img'];
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType !== 1) return;
        walk(child); // 先递归清理子节点
        const tag = child.tagName.toLowerCase();
        if (!allowed.includes(tag)) { child.replaceWith(...child.childNodes); return; }
        [...child.attributes].forEach(attr => {
          const n = attr.name.toLowerCase();
          if (n.startsWith('on')) child.removeAttribute(attr.name);
          else if (n === 'src') { if (!/^data:image\//i.test(attr.value)) child.removeAttribute(attr.name); }
          else if (n !== 'alt' && n !== 'style' && n !== 'class') child.removeAttribute(attr.name);
        });
      });
    };
    walk(tpl.content);
    return tpl.innerHTML;
  }

  function compressImage(file, maxW = 1080, quality = 0.82) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          let { width: w, height: h } = img;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', quality));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function insertImageAtCursor(dataUrl) {
    const ed = $('#entry-editor'); if (!ed) return;
    ed.focus();
    const img = document.createElement('img');
    img.src = dataUrl; img.alt = '';
    const sel = window.getSelection();
    if (sel.rangeCount && ed.contains(sel.anchorNode)) {
      const r = sel.getRangeAt(0);
      r.deleteContents();
      r.insertNode(img);
      r.setStartAfter(img); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    } else {
      ed.appendChild(img);
    }
    ed.appendChild(document.createElement('br'));
  }

  function openEntryEditor(nb, entryId) {
    const entries = getEntries(nb, currentDate(nb));
    const entry = entryId ? entries.find(x => x.id === entryId) : null;
    const fontSize = (entry && entry.fontSize) || nb.defaultFontSize || 16;
    const color = (entry && entry.color) || nb.defaultColor || '#5b554c';
    view.editing = { notebookId: nb.id, date: currentDate(nb), entryId: entryId || null, fontSize, color };

    const editorHtml = entry ? entry.html : '';
    const titleVal = entry ? (entry.title || '') : '';
    const isEdit = !!entryId;

    openModal(`
      <div class="modal-panel editor-fullscreen" id="entry-editor-panel">
        <div class="editor-header">
          <button type="button" class="editor-header-btn" data-action="close-modal">取消</button>
          <div class="editor-header-title">${isEdit ? '编辑记录' : '写新记录'}</div>
          <button type="button" class="editor-header-btn primary" data-action="save-editor">完成</button>
        </div>
        <input type="text" id="entry-title" class="form-input editor-title" maxlength="40" placeholder="标题（可选）" value="${escapeHtml(titleVal)}">
        <div class="editor-toolbar" id="editor-toolbar">
          <button type="button" class="tool-btn" data-cmd="bold" onmousedown="event.preventDefault()"><b>B</b></button>
          <button type="button" class="tool-btn" data-cmd="italic" onmousedown="event.preventDefault()"><i>I</i></button>
          <button type="button" class="tool-btn" data-cmd="underline" onmousedown="event.preventDefault()"><u>U</u></button>
          <span class="tool-sep"></span>
          <select id="entry-font-size" class="tool-select">
            <option value="14">小</option>
            <option value="16">标准</option>
            <option value="18">中</option>
            <option value="20">大</option>
            <option value="24">特大</option>
          </select>
          <span class="tool-sep"></span>
          <div class="color-swatches">
            ${NOTE_TEXT_COLORS.map(c => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}
          </div>
          <span class="tool-sep"></span>
          <button type="button" class="tool-btn" data-action="insert-image" onmousedown="event.preventDefault()">🖼️</button>
        </div>
        <div id="entry-editor" class="editor-area" contenteditable="true" data-placeholder="写点什么…"></div>
        <input type="file" id="editor-file" accept="image/*" hidden>
      </div>
    `);

    const ed = $('#entry-editor');
    ed.innerHTML = editorHtml;
    ed.style.fontSize = fontSize + 'px';
    ed.style.color = color;
    $('#entry-font-size').value = String(fontSize);
    const sw = modalRoot.querySelector(`.color-swatch[data-color="${color}"]`);
    if (sw) sw.classList.add('selected');

    modalRoot.querySelector('#editor-toolbar').addEventListener('click', e => {
      const b = e.target.closest('[data-cmd], [data-action]'); if (!b) return;
      if (b.dataset.cmd) { ed.focus(); document.execCommand(b.dataset.cmd, false, null); }
      else if (b.dataset.action === 'insert-image') { $('#editor-file').click(); }
    });
    modalRoot.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        view.editing.color = sw.dataset.color;
        ed.style.color = sw.dataset.color;
        modalRoot.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });
    $('#entry-font-size').addEventListener('change', e => {
      view.editing.fontSize = +e.target.value;
      ed.style.fontSize = e.target.value + 'px';
    });
    $('#editor-file').addEventListener('change', async ev => {
      const file = ev.target.files[0]; if (!file) return;
      try { insertImageAtCursor(await compressImage(file)); }
      catch (_) { showToast('图片插入失败'); }
      ev.target.value = '';
    });
  }

  function saveEntryEditor() {
    const nb = getNotebook(view.editing.notebookId); if (!nb) return;
    const ed = $('#entry-editor');
    const html = sanitizeHtml(ed.innerHTML);
    const title = ($('#entry-title').value || '').trim();
    const plain = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!title && !plain) { showToast('写点什么吧'); return; }
    const arr = getEntries(nb, view.editing.date);
    if (view.editing.entryId) {
      const e = arr.find(x => x.id === view.editing.entryId);
      if (e) {
        e.html = html; e.title = title;
        e.fontSize = view.editing.fontSize; e.color = view.editing.color;
        e.updatedAt = Date.now();
      }
    } else {
      arr.push({
        id: generateId(), html, title,
        createdAt: Date.now(), updatedAt: Date.now(),
        fontSize: view.editing.fontSize, color: view.editing.color
      });
    }
    setEntries(nb, view.editing.date, arr);
    closeModal();
    render();
    showToast('已保存');
  }

  function openEntryReader(nb, entryId) {
    const e = getEntries(nb, currentDate(nb)).find(x => x.id === entryId);
    if (!e) return;
    openModal(`
      <div class="modal-panel reader-modal">
        <div class="reader-meta">${friendlyDate(currentDate(nb))} · ${friendlyTime(e.createdAt)}</div>
        <h2 class="reader-title">${escapeHtml(e.title || '无标题')}</h2>
        <div class="reader-body" style="font-size:${e.fontSize || 16}px;color:${e.color || '#5b554c'}">
          ${sanitizeHtml(e.html || '')}
        </div>
        <button class="modal-close primary" data-action="close-modal">关闭</button>
      </div>
    `);
  }

  // ===== 删除自建本子 =====
  function confirmDeleteNotebook(id) {
    const nb = getNotebook(id);
    if (!nb || nb.fixed) return;
    const entryCount = Object.values(nb.entries).reduce((s, a) => s + a.length, 0);
    openModal(`
      <div class="modal-panel">
        <div class="reminder-toast">
          <div class="emoji">🗑️</div>
          <h3>删除「${escapeHtml(nb.title)}」？</h3>
          <p>将一并删除本子内 ${entryCount} 条记录，且无法恢复。</p>
        </div>
        <button class="modal-close primary danger" data-action="confirm-delete-notebook" data-id="${id}">删除本子</button>
        <button class="modal-close" data-action="close-modal">取消</button>
      </div>
    `);
  }

  function deleteNotebook(id) {
    const nb = getNotebook(id);
    if (!nb || nb.fixed) return;
    cancelOneReminder(id); // 取消该本已定的后台提醒
    state.notebooks = state.notebooks.filter(n => n.id !== id);
    saveState();
    closeModal();
    if (view.notebookId === id) view.notebookId = null;
    render();
    showToast('本子已删除');
    pushRemindersUpdate(); // 同步后台：移除已删本的提醒
  }

  // ===== 条目操作 =====
  function addEntry() {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const input = $('#entry-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date);
    let item;
    if (nb.kind === 'tomorrow') {
      item = { id: generateId(), text, status: 'pending', note: '' };
    } else {
      item = { id: generateId(), text };
    }
    arr.push(item);
    setEntries(nb, date, arr);
    render();
    setTimeout(() => { const el = $('#entry-input'); if (el) el.focus(); }, 0);
  }

  function deleteEntry(id) {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date).filter(e => e.id !== id);
    setEntries(nb, date, arr);
    render();
  }

  function doneEntry(id) {
    const nb = getNotebook(view.notebookId);
    if (!nb || nb.kind !== 'tomorrow') return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date);
    const e = arr.find(x => x.id === id);
    if (e) { e.status = 'done'; setEntries(nb, date, arr); render(); }
  }

  function failEntry(id) {
    const nb = getNotebook(view.notebookId);
    if (!nb || nb.kind !== 'tomorrow') return;
    const entry = getEntries(nb, currentDate(nb)).find(x => x.id === id);
    if (!entry) return;

    openModal(`
      <div class="modal-panel">
        <div class="reminder-toast">
          <div class="emoji">🌧️</div>
          <h3>未完成也不要责备自己</h3>
          <p>写一点复盘，帮助自己更温柔地前进</p>
        </div>
        <div class="form-group">
          <label class="form-label note-required">为什么没完成？问题在哪里？（必填）</label>
          <textarea class="note-input" id="fail-note-input" placeholder="客观地写下原因，例如时间估算不足、被其他事打断…"></textarea>
        </div>
        <button class="modal-close primary" data-action="confirm-fail" data-id="${id}" id="confirm-fail-btn">保存复盘</button>
        <button class="modal-close" data-action="close-modal">取消</button>
      </div>
    `);

    const ta = $('#fail-note-input');
    const btn = $('#confirm-fail-btn');
    btn.disabled = !ta.value.trim();
    ta.addEventListener('input', () => { btn.disabled = !ta.value.trim(); });
    setTimeout(() => ta.focus(), 50);
  }

  function confirmFail(id) {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const note = $('#fail-note-input').value.trim();
    if (!note) return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date);
    const e = arr.find(x => x.id === id);
    if (e) { e.status = 'failed'; e.note = note; setEntries(nb, date, arr); closeModal(); render(); showToast('复盘已保存'); }
  }

  function revertEntry(id) {
    const nb = getNotebook(view.notebookId);
    if (!nb || nb.kind !== 'tomorrow') return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date);
    const e = arr.find(x => x.id === id);
    if (e) { e.status = 'pending'; e.note = ''; setEntries(nb, date, arr); render(); }
  }

  function saveNote(id, value) {
    const nb = getNotebook(view.notebookId);
    if (!nb || nb.kind !== 'tomorrow') return;
    const date = currentDate(nb);
    const arr = getEntries(nb, date);
    const e = arr.find(x => x.id === id);
    if (e) { e.note = value.trim(); setEntries(nb, date, arr); }
  }

  // ===== 提醒机制 =====
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function fireReminder(nb) {
    openModal(`
      <div class="modal-panel">
        <div class="reminder-toast">
          <div class="emoji">${nb.emoji}</div>
          <h3>该写${escapeHtml(nb.title)}啦</h3>
          <p>每天留一点时间给自己，慢慢来就好</p>
        </div>
        <button class="modal-close primary" data-action="open-from-reminder" data-id="${nb.id}">去记录</button>
        <button class="modal-close" data-action="close-modal">稍后</button>
      </div>
    `);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('日记本', { body: `该写${nb.title}啦 ~`, icon: 'icons/icon-192.png' });
      } catch (e) {}
    }
  }

  function checkReminders() {
    const now = new Date();
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const today = ymd(now);
    state.notebooks.forEach(nb => {
      if (!nb.reminder) return;
      const key = `${nb.id}-${today}-${hhmm}`;
      if (nb.reminder === hhmm && !firedReminders.has(key)) {
        firedReminders.add(key);
        fireReminder(nb);
      }
    });
  }

  setInterval(checkReminders, 30000);

  // ===== 事件委托 =====
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;

    if (a === 'open-notebook') {
      if (suppressOpen) { suppressOpen = false; return; }
      openNotebook(t.dataset.id);
    }
    else if (a === 'back') { view.notebookId = null; render(); }
    else if (a === 'write-new') { const nb = getNotebook(view.notebookId); if (nb) openEntryEditor(nb, null); }
    else if (a === 'edit-entry') { const nb = getNotebook(view.notebookId); if (nb) openEntryEditor(nb, t.dataset.id); }
    else if (a === 'read-entry') { const nb = getNotebook(view.notebookId); if (nb) openEntryReader(nb, t.dataset.id); }
    else if (a === 'save-editor') saveEntryEditor();
    else if (a === 'confirm-delete-notebook') deleteNotebook(t.dataset.id);
    else if (a === 'open-calendar') openCalendar();
    else if (a === 'prev-date') shiftDate(-1);
    else if (a === 'next-date') shiftDate(1);
    else if (a === 'select-date') selectCalendarDate(t.dataset.date);
    else if (a === 'cal-prev') { calendarState.base.month--; if (calendarState.base.month < 0) { calendarState.base.month = 11; calendarState.base.year--; } renderCalendar(calendarState.nb, calendarState.selected, calendarState.base); }
    else if (a === 'cal-next') { calendarState.base.month++; if (calendarState.base.month > 11) { calendarState.base.month = 0; calendarState.base.year++; } renderCalendar(calendarState.nb, calendarState.selected, calendarState.base); }
    else if (a === 'close-modal') closeModal();
    else if (a === 'open-add-notebook') openAddNotebookModal();
    else if (a === 'create-notebook') { /* 在 openAddNotebookModal 内联处理 */ }
    else if (a === 'open-reminders') openRemindersModal();
    else if (a === 'toggle-push') {
      const on = localStorage.getItem(PUSH_ON_KEY) === '1';
      (async () => {
        if (on) {
          localStorage.removeItem(PUSH_ON_KEY);
          await cancelScheduledReminders();
          showToast('已关闭后台提醒');
        } else {
          let permission = Notification.permission;
          if (permission === 'default') permission = await Notification.requestPermission();
          if (permission !== 'granted') { showToast('未授权通知权限'); openRemindersModal(); return; }
          let done = false;
          if (triggersSupported()) done = await scheduleRemindersViaTrigger(); // 优先：免服务器
          if (PUSH_CONFIGURED) { const ok = await subscribeToPush(); done = done || ok; }
          if (done) { localStorage.setItem(PUSH_ON_KEY, '1'); showToast('已开启后台提醒 ✓'); }
          else { showToast('当前环境不支持后台提醒'); }
        }
        openRemindersModal(); // 刷新开关状态
      })();
    }
    else if (a === 'update-reminder') { /* handled by change */ }
    else if (a === 'add-entry') addEntry();
    else if (a === 'delete-entry') deleteEntry(t.dataset.id);
    else if (a === 'done-entry') doneEntry(t.dataset.id);
    else if (a === 'fail-entry') failEntry(t.dataset.id);
    else if (a === 'confirm-fail') confirmFail(t.dataset.id);
    else if (a === 'revert-entry') revertEntry(t.dataset.id);
    else if (a === 'open-from-reminder') { closeModal(); openNotebook(t.dataset.id); }
  });

  document.addEventListener('change', e => {
    if (e.target.dataset.action === 'update-reminder') {
      updateReminder(e.target.dataset.id, e.target.value);
    }
  });

  document.addEventListener('input', e => {
    if (e.target.dataset.action === 'save-note') {
      saveNote(e.target.dataset.id, e.target.value);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'entry-input' && !e.isComposing) {
      e.preventDefault();
      addEntry();
    }
    if (e.key === 'Escape') closeModal();
  });

  // ===== 长按删除自建本子（Pointer 事件统一鼠标/触摸）=====
  let pressTimer = null;
  let pressTarget = null;
  const LONG_PRESS_MS = 600;
  const pressStart = { x: 0, y: 0 };

  function onCardPressStart(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const card = e.target.closest('.nb-card');
    if (!card || card.dataset.fixed === 'true') return;
    pressTarget = card;
    pressStart.x = e.clientX; pressStart.y = e.clientY;
    card.classList.add('pressing');
    pressTimer = setTimeout(() => {
      suppressOpen = true;
      if (pressTarget) pressTarget.classList.remove('pressing');
      card.classList.add('pressing-done');
      confirmDeleteNotebook(card.dataset.id);
      pressTimer = null; pressTarget = null;
    }, LONG_PRESS_MS);
  }

  function onCardPressMove(e) {
    if (!pressTimer || !pressTarget) return;
    if (Math.abs(e.clientX - pressStart.x) > 10 || Math.abs(e.clientY - pressStart.y) > 10) onCardPressEnd();
  }

  function onCardPressEnd() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (pressTarget) { pressTarget.classList.remove('pressing'); pressTarget = null; }
  }

  document.addEventListener('pointerdown', onCardPressStart);
  document.addEventListener('pointermove', onCardPressMove);
  document.addEventListener('pointerup', onCardPressEnd);
  document.addEventListener('pointercancel', onCardPressEnd);

  // ===== Service Worker =====
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ===== 初始化 =====
  render();
  setTimeout(checkReminders, 1000);
  // 若曾开启后台提醒，启动时为今天重新排定（Notification Triggers 每日需重排）
  if (localStorage.getItem(PUSH_ON_KEY) === '1') {
    setTimeout(() => { scheduleRemindersViaTrigger(); pushRemindersUpdate(); }, 1200);
  }
})();
