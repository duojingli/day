/* 日记本 · 治愈手帐 —— 纯前端 localStorage 实现 */
(function () {
  'use strict';

  const STORE_KEY = 'xiaorizi_state_v1';
  // 单页模式（不要日历卡）自定义本：所有记录统一存放在这一个键下，不按日期拆分
  const SINGLE = '__single__';
  const root = document.getElementById('app');
  const modalRoot = document.getElementById('modal');
  const toastRoot = document.getElementById('toast');

  // ===== 配置：配色 / 图标 =====
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

  // 新建本子可选的图标（每个本子只用一个图标标识，不再使用纹理背景）
  const ICONS = [
    '📓', '📔', '📒', '📝', '✏️', '📚', '🗒️', '📌', '📖', '🔖',
    '🌿', '🌸', '🌟', '🌈', '🍀', '☕', '🍵', '🌻', '🌼', '🪴',
    '✨', '🦋', '🌙', '🌊', '🍃', '🌳', '🌞', '❄️', '🔥', '💎',
    '🐱', '🐰', '🐻', '🐼', '🐥', '🐢', '🦊', '🐧',
    '🍎', '🍓', '🍊', '🍉', '🍇', '🍑', '🥝', '🍋',
    '🧁', '🍰', '🍪', '🍩', '🍬', '🍫',
    '🎯', '💭', '🎀', '❤️', '🧸', '💡', '⭐'
  ];

  // 富文本编辑器的文字颜色（与整体 Morandi 低饱和风格一致）
  const NOTE_TEXT_COLORS = [
    '#5b554c', '#8a8276', '#7a6f8e', '#9a7b6f',
    '#6f8a7a', '#b08a8a', '#5b6b8a', '#a88a5b'
  ];

  // 自定义本用的更鲜嫩的字体颜色（浅绿 / 浅蓝 / 浅粉等，不沉闷）
  const CUSTOM_TEXT_COLORS = [
    '#5fa97f', // 嫩绿
    '#6fa8c4', // 浅蓝
    '#c77f9b', // 浅粉
    '#9a86c0', // 浅紫
    '#cf9a5e', // 暖橙
    '#7bbfa0', // 薄荷绿
    '#5f9bc4', // 天蓝
    '#c7ad5e'  // 奶油黄
  ];

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

  // ===== 状态 =====
  function defaultState() {
    return {
      notebooks: [
        {
          id: 'nb_tomorrow', kind: 'tomorrow', title: '明日计划本', emoji: '❄️',
          color: '#cfe0ea', fixed: true, entries: {}
        },
        {
          id: 'nb_success', kind: 'success', title: '成功日记本', emoji: '🌸',
          color: '#f2d7df', fixed: true, entries: {}
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
        // 旧版自定义本没有 calendar 字段：默认“单页模式”，并把按日期散落的记录合并到单页键
        if (nb.kind === 'custom' && nb.calendar === undefined) {
          nb.calendar = false;
          const all = [];
          Object.keys(nb.entries || {}).forEach(d => { (nb.entries[d] || []).forEach(e => all.push(e)); });
          nb.entries = all.length ? { [SINGLE]: all } : {};
        }
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
  let suppressOpen = false; // 长按后抑制紧接着的误触"打开"点击

  function getNotebook(id) { return state.notebooks.find(n => n.id === id); }
  function currentDate(nb) {
    if (!view.dates[nb.id]) view.dates[nb.id] = nb.kind === 'tomorrow' ? tomorrowStr() : todayStr();
    return view.dates[nb.id];
  }
  // 记录的存储键：自定义本若不要日历卡，则统一存在单页键下；其余按当前日期
  function pageKey(nb) {
    if (nb.kind === 'custom' && !nb.calendar) return SINGLE;
    return currentDate(nb);
  }
  function getEntries(nb, date) { return nb.entries[date] || []; }
  // 自定义本当前应展示的记录：单页模式取单页键全部；日历模式取当日
  function displayEntries(nb) {
    if (nb.kind === 'custom' && !nb.calendar) return nb.entries[SINGLE] || [];
    return getEntries(nb, currentDate(nb));
  }
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
    if (nb.kind === 'tomorrow') {
      const arr = getEntries(nb, todayStr());
      return `${arr.filter(e => e.status === 'done').length}/${arr.length} 完成`;
    }
    if (nb.kind === 'custom' && !nb.calendar) {
      return `${(nb.entries[SINGLE] || []).length} 条记录`;
    }
    return `${getEntries(nb, todayStr()).length} 条记录`;
  }

  function homeView() {
    const cards = state.notebooks.map(nb => `
      <button class="nb-card" data-action="open-notebook" data-id="${nb.id}" data-fixed="${nb.fixed}"
              style="background:${nb.color};--nb-color:${nb.color};--nb-text:${contrastText(nb.color)}">
        <div>
          <div class="nb-emoji">${nb.emoji}</div>
          <div class="nb-title">${escapeHtml(nb.title)}</div>
          <div class="nb-meta">${countToday(nb)}</div>
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
    const entries = displayEntries(nb);
    const title = escapeHtml(nb.title);
    const isCustom = nb.kind === 'custom';
    const hasCalendar = isCustom && nb.calendar;       // 自定义本且启用日历卡
    const showDateBar = !isCustom || hasCalendar;       // 明日/成功 或 自定义+日历 才显示日期栏

    let body = '';
    if (nb.kind === 'tomorrow') body = tomorrowBody(nb, date, entries);
    else if (nb.kind === 'success') body = successBody(nb, date, entries);
    else body = customBody(nb, date, entries);

    const dateBarHtml = showDateBar ? `
      <div class="date-bar ${hasCalendar ? 'date-bar-plain' : ''}">
        <button class="icon-btn" data-action="prev-date" aria-label="上一天">‹</button>
        <div class="date-pill" data-action="open-calendar">
          <div class="date-main">${friendlyDate(date)} · ${weekday(date)}</div>
          ${hasCalendar ? '' : `<div class="date-sub">${date} · 点击查看日历</div>`}
        </div>
        <button class="icon-btn" data-action="next-date" aria-label="下一天">›</button>
      </div>` : '';

    // 自定义本：屏幕底部固定的“写新记录”框（沿用 2.8 虚线卡片样式，仅改固定定位）
    const addBarHtml = isCustom ? `
      <div class="custom-new-box" data-action="write-new">
        <span class="custom-new-placeholder">${entries.length ? '继续写点什么…' : '写新记录…'}</span>
      </div>` : '';

    return `
      <div class="notebook-view ${isCustom ? 'has-addbar' : ''}" style="--nb-color:${nb.color};--nb-text:${contrastText(nb.color)}">
        <div class="top-bar">
          <button class="back-btn" data-action="back" aria-label="返回">←</button>
          <div class="top-title">${title}</div>
        </div>
        ${dateBarHtml}
        ${body}
        ${addBarHtml}
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
          <div class="entry-text">${escapeHtml(entryText(e)) || '（无内容）'}</div>
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
    const text = entryText(e);
    return `
      <div class="entry-item">
        <div class="entry-main">
          <div class="entry-text">${escapeHtml(text) || '（无内容）'}</div>
          <div class="entry-actions">
            ${text ? `<button class="action-btn" data-action="read-entry" data-id="${e.id}" title="查看">📖</button>` : ''}
            <button class="action-btn btn-delete" data-action="delete-entry" data-id="${e.id}" title="删除">×</button>
          </div>
        </div>
      </div>
    `;
  }

  // 自定义本子
  function customBody(nb, date, entries) {
    const list = entries.length ? entries.map(e => customCard(e)).join('') : emptyState(nb);
    return `
      <div class="panel panel-custom">
        <div class="entry-list">${list}</div>
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
          <button class="note-act" data-action="read-entry" data-id="${e.id}" title="阅读">📖</button>
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
        if (bd.querySelector('.editor-fullscreen, .reader-fullscreen')) bd.classList.add('editor-backdrop');
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
    let selectedIcon = ICONS[0];
    let selectedCalendar = false; // 默认单页模式（不按日期）

    function colorSwatches() {
      return COLOR_OPTIONS.map(c => `
        <button class="swatch ${c.color === selectedColor ? 'selected' : ''}"
                data-action="select-color" data-color="${c.color}"
                style="background:${c.color}" aria-label="${c.name}"></button>
      `).join('');
    }

    function iconSwatches() {
      return ICONS.map(ic => `
        <button class="icon-option ${ic === selectedIcon ? 'selected' : ''}"
                data-action="select-icon" data-icon="${ic}"
                aria-label="图标 ${ic}">${ic}</button>
      `).join('');
    }

    function calendarChoice() {
      const opt = (on, label) => `
        <button class="choice-opt ${selectedCalendar === on ? 'selected' : ''}"
                data-action="select-calendar" data-cal="${on ? '1' : '0'}">${label}</button>`;
      return `
        <div class="choice-row">
          ${opt(false, '📝 单页（一直一个本，不按日期）')}
          ${opt(true, '📅 按日期（每天一页 + 日历标记）')}
        </div>`;
    }

    function refresh() {
      $('#nb-color-list').innerHTML = colorSwatches();
      $('#nb-icon-list').innerHTML = iconSwatches();
      const cc = $('#nb-cal-choice'); if (cc) cc.innerHTML = calendarChoice();
    }

    openModal(`
      <div class="modal-panel" id="add-nb-panel">
        <div class="modal-title">新建自定义本子</div>
        <div class="form-group">
          <label class="form-label">本子名称</label>
          <input type="text" id="nb-title-input" class="form-input" maxlength="12" placeholder="例如：学习本、情绪本…">
        </div>
        <div class="form-group">
          <label class="form-label">记录方式</label>
          <div id="nb-cal-choice">${calendarChoice()}</div>
        </div>
        <div class="form-group">
          <label class="form-label">图标</label>
          <div class="swatches" id="nb-icon-list">${iconSwatches()}</div>
        </div>
        <div class="form-group">
          <label class="form-label">颜色</label>
          <div class="swatches" id="nb-color-list">${colorSwatches()}</div>
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
      } else if (t.dataset.action === 'select-icon') {
        selectedIcon = t.dataset.icon;
        refresh();
      } else if (t.dataset.action === 'select-calendar') {
        selectedCalendar = t.dataset.cal === '1';
        refresh();
      } else if (t.dataset.action === 'create-notebook') {
        createNotebook(selectedColor, selectedIcon, selectedCalendar);
      }
    });
  }

  function createNotebook(color, icon, calendar) {
    const input = $('#nb-title-input');
    const title = input.value.trim();
    if (!title) { showToast('给本子起个名字吧'); return; }
    const nb = {
      id: 'nb_' + generateId(), kind: 'custom', title,
      emoji: icon, color,
      fixed: false, calendar: !!calendar, entries: {},
      defaultFontSize: 16, defaultColor: '#5fa97f'
    };
    state.notebooks.push(nb);
    saveState();
    closeModal();
    openNotebook(nb.id);
    showToast(calendar ? '本子已创建（按日期）' : '本子已创建');
  }

  // ===== 富文本 / 自定义本辅助 =====
  function firstLine(html) {
    const text = plainPreview(html, 500).replace(/\s+/g, ' ').trim();
    return (text.split('\n')[0] || '').trim();
  }

  // 兼容两种存储结构：旧版用 text 纯文本，迁移后/编辑器用 html 富文本。
  // 统一取出可读正文，避免某字段缺失时显示 "undefined"。
  function entryText(e) {
    if (e.text != null && String(e.text).trim() !== '') return String(e.text);
    if (e.html) return plainPreview(e.html, 400);
    return '';
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
    const entries = getEntries(nb, pageKey(nb));
    const entry = entryId ? entries.find(x => x.id === entryId) : null;
    const fontSize = (entry && entry.fontSize) || nb.defaultFontSize || 16;
    const color = (entry && entry.color) || nb.defaultColor || '#5b554c';
    view.editing = { notebookId: nb.id, date: pageKey(nb), entryId: entryId || null, fontSize, color };

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
            ${(nb.kind === 'custom' ? CUSTOM_TEXT_COLORS : NOTE_TEXT_COLORS).map(c => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}"></button>`).join('')}
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
    const e = getEntries(nb, pageKey(nb)).find(x => x.id === entryId);
    if (!e) return;
    const bodyHtml = e.html ? sanitizeHtml(e.html) : escapeHtml(entryText(e));
    const title = escapeHtml(e.title || firstLine(e.html || '') || entryText(e) || '无标题');
    openModal(`
      <div class="modal-panel reader-fullscreen">
        <div class="reader-header">
          <button type="button" class="reader-header-btn" data-action="close-modal">关闭</button>
          <div class="reader-header-title">阅读</div>
          ${nb.kind === 'custom' ? `<button type="button" class="reader-header-btn primary" data-action="edit-entry" data-id="${e.id}">编辑</button>` : ''}
        </div>
        <div class="reader-scroll">
          <div class="reader-meta">${friendlyDate(currentDate(nb))} · ${friendlyTime(e.createdAt)}</div>
          <h2 class="reader-title">${title}</h2>
          <div class="reader-body" style="font-size:${e.fontSize || 16}px;color:${e.color || '#5b554c'}">
            ${bodyHtml}
          </div>
        </div>
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
    state.notebooks = state.notebooks.filter(n => n.id !== id);
    saveState();
    closeModal();
    if (view.notebookId === id) view.notebookId = null;
    render();
    showToast('本子已删除');
  }

  // ===== 条目操作 =====
  function addEntry() {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const input = $('#entry-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const date = pageKey(nb);
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
    else if (a === 'add-entry') addEntry();
    else if (a === 'delete-entry') deleteEntry(t.dataset.id);
    else if (a === 'done-entry') doneEntry(t.dataset.id);
    else if (a === 'fail-entry') failEntry(t.dataset.id);
    else if (a === 'confirm-fail') confirmFail(t.dataset.id);
    else if (a === 'revert-entry') revertEntry(t.dataset.id);
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
})();
