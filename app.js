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
    { key: 'snow', glyph: '❄️', label: '雪花' },
    { key: 'floral', glyph: '🌸', label: '碎花' },
    { key: 'dots', glyph: '•', label: '圆点' },
    { key: 'leaves', glyph: '🍃', label: '落叶' },
    { key: 'stars', glyph: '✦', label: '星星' },
    { key: 'hearts', glyph: '🤍', label: '爱心' },
    { key: 'waves', glyph: '〜', label: '波浪' },
    { key: 'none', glyph: '', label: '纯色' }
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

  function patternBackground(color, patternKey) {
    const p = PATTERNS.find(x => x.key === patternKey) || PATTERNS[0];
    if (!p.glyph) return color;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='32' y='42' font-size='22' text-anchor='middle' opacity='0.13'>${p.glyph}</text></svg>`;
    return `${color} url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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

  const state = loadState();
  const view = { notebookId: null, dates: {}, modal: null };
  const firedReminders = new Set();

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
      <button class="nb-card" data-action="open-notebook" data-id="${nb.id}"
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
        <div class="date-bar">
          <button class="icon-btn" data-action="prev-date" aria-label="上一天">‹</button>
          <div class="date-pill" data-action="open-calendar">
            <div class="date-main">${friendlyDate(date)} · ${weekday(date)}</div>
            <div class="date-sub">${date} · 点击查看日历</div>
          </div>
          <button class="icon-btn" data-action="next-date" aria-label="下一天">›</button>
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
    const list = entries.length ? entries.map(e => customItem(e)).join('') : '';
    return `
      <div class="panel">
        <p class="panel-title">${date === todayStr() ? '今日记录' : `${date} 的记录`}</p>
        ${addInputRow(nb)}
        <div class="entry-list">${list || emptyState(nb)}</div>
      </div>
    `;
  }

  function customItem(e) {
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
      if (bd) bd.classList.add('in');
    });
  }

  function closeModal() {
    modalRoot.classList.remove('show');
    modalRoot.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modalRoot.innerHTML = ''; }, 250);
  }

  modalRoot.addEventListener('click', e => {
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
    let selectedPattern = 'dots';

    function colorSwatches() {
      return COLOR_OPTIONS.map(c => `
        <button class="swatch ${c.color === selectedColor ? 'selected' : ''}"
                data-action="select-color" data-color="${c.color}"
                style="background:${c.color}" aria-label="${c.name}"></button>
      `).join('');
    }

    function patternSwatches() {
      return PATTERNS.map(p => `
        <button class="pattern-option ${p.key === selectedPattern ? 'selected' : ''}"
                data-action="select-pattern" data-pattern="${p.key}"
                style="background:${patternBackground(selectedColor, p.key)};color:${contrastText(selectedColor)}"
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
      fixed: false, reminder: null, entries: {}
    };
    state.notebooks.push(nb);
    saveState();
    closeModal();
    openNotebook(nb.id);
    showToast('本子已创建');
  }

  // ===== 提醒设置 =====
  function openRemindersModal() {
    openModal(`
      <div class="modal-panel">
        <div class="modal-title">每日提醒</div>
        <p class="success-tip">到设置的时间会在打开 APP 时温柔提醒（无后台推送，不打扰）</p>
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
    requestNotificationPermission();
  }

  function updateReminder(id, value) {
    const nb = getNotebook(id);
    if (!nb) return;
    nb.reminder = value || null;
    saveState();
    showToast(`${nb.title} 提醒已${value ? '设为 ' + value : '关闭'}`);
  }

  // ===== 条目操作 =====
  function addEntry() {
    const nb = getNotebook(view.notebookId);
    if (!nb) return;
    const input = $('#entry-input');
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

    if (a === 'open-notebook') openNotebook(t.dataset.id);
    else if (a === 'back') { view.notebookId = null; render(); }
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

  // ===== Service Worker =====
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ===== 初始化 =====
  render();
  setTimeout(checkReminders, 1000);
})();
