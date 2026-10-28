// Jarvis — hub personale di David.
// Nessuna build: questo file viene servito così com'è da GitHub Pages.
// Dati su Supabase (tabelle: tasks, captures, expenses, health_daily) protetti da RLS.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

// La chiave "publishable" è pubblica per definizione: i dati sono protetti dalle regole RLS del database.
const SUPABASE_URL = 'https://ywebxcgltxvxgqptjuxk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DwYEydqU99Tkku7IsLyEiA_VSasIE9Z';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

// Roma, per il calcolo dell'alba/tramonto (tema giorno/sera).
const LAT = 41.9028, LON = 12.4964;

const CATEGORIES = ['Cibo', 'Auto', 'Salute', 'Allenamento', 'Abbonamenti', 'Esperienze', 'Tech', 'Casa', 'Altro'];
const KINDS = [
  { id: 'task', label: 'Task' },
  { id: 'studio', label: 'Da studiare' },
  { id: 'frase', label: 'Frase' },
  { id: 'idea', label: 'Idea' },
  { id: 'auto', label: 'Decide Jarvis' }
];
const KIND_LABEL = { task: 'Task', studio: 'Da studiare', frase: 'Frase', idea: 'Idea', auto: 'Jarvis' };
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DOW_LONG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const TIMES = ['09:00', '12:00', '15:30', '18:00', '21:00'];

// ---------------------------------------------------------------- Icone
const I = {
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  nfc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 7a7 7 0 0 1 0 10M12 4a11 11 0 0 1 0 16M4 10a3 3 0 0 1 0 4"/></svg>',
  pen: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  cart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
  sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2"/></svg>',
  week: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M15 15h3"/></svg>',
  mind: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3a4 4 0 0 0-4 4 4 4 0 0 0-2 7 4 4 0 0 0 6 5V3zM15 3a4 4 0 0 1 4 4 4 4 0 0 1 2 7 4 4 0 0 1-6 5V3z"/></svg>',
  logout: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>',
  logo: '<svg width="44" height="44" viewBox="0 0 100 100" role="img" aria-label="Jarvis"><rect width="100" height="100" rx="23" fill="var(--logo-bg, #2E5BDB)"/><path d="M38 22 H52 a26 28 0 0 1 0 56 H24 Z" fill="#FFFFFF"/><path d="M14 74 L86 30" stroke="var(--logo-bg, #2E5BDB)" stroke-width="7"/></svg>'
};

// ---------------------------------------------------------------- Date
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayYmd = () => ymd(new Date());
const dowIdx = (d) => (d.getDay() + 6) % 7;
const mondayOf = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dowIdx(d));
const hhmm = (t) => (t ? t.slice(0, 5) : '');
const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dayLabel = (s) => {
  const t = todayYmd();
  if (s === t) return 'oggi';
  if (s === ymd(addDays(new Date(), 1))) return 'domani';
  if (s === ymd(addDays(new Date(), -1))) return 'ieri';
  const d = parseYmd(s);
  return `${DOW[dowIdx(d)].toLowerCase()} ${d.getDate()}`;
};
const longDate = (d) => `${DOW_LONG[dowIdx(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const eur = (n) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem('jarvis.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('jarvis.' + k, JSON.stringify(v)); } catch { /* ignore */ } }
};

// ---------------------------------------------------------------- Tema giorno/sera
function sunTimes(date) {
  const rad = Math.PI / 180;
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const J = noon.getTime() / 864e5 + 2440587.5;
  const n = Math.ceil(J - 2451545.0 + 0.0008);
  const Js = n - LON / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const sinD = Math.sin(L * rad) * Math.sin(23.44 * rad);
  const cosD = Math.cos(Math.asin(sinD));
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * sinD) / (Math.cos(LAT * rad) * cosD)) / rad;
  const toDate = (j) => new Date((j - 2440587.5) * 864e5);
  return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
}
function applyTheme() {
  const now = new Date();
  const { rise, set } = sunTimes(now);
  const dark = now < rise || now > set;
  const theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--logo-bg', dark ? '#17171A' : '#2E5BDB');
  const meta = document.getElementById('theme-color');
  if (meta) meta.content = dark ? '#0F0F11' : '#EFEFEC';
}

// ---------------------------------------------------------------- Stato
const S = {
  session: null,
  loading: true,
  view: ls.get('view', 'oggi'),
  tasks: [],
  captures: [],
  expenses: [],
  health: null,
  gcal: { configured: false, connected: false, calendars: [] },
  events: [],
  evRange: null,
  ui: {
    showDay: false,
    schedId: null, schedDay: null, schedTime: '',
    draft: '', kind: 'auto', capOpen: false, listening: false,
    toast: '',
    newTask: '',
    weekOffset: 0, weekSel: todayYmd(),
    monthOffset: 0, calSel: todayYmd(),
    spMonth: 0, adding: false, exAmount: '', exDesc: '', exCat: 'Cibo', exMethod: 'manual',
    mFilter: 'tutto', mSearch: '',
    loginErr: '', loginBusy: false
  }
};
const wideMq = window.matchMedia('(min-width: 1000px)');
const isWide = () => wideMq.matches;

let toastTimer = null;
function toast(msg) {
  S.ui.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.ui.toast = ''; render(); }, 2800);
}
function fail(err) {
  console.error(err);
  toast('Errore: ' + (err?.message || 'qualcosa è andato storto'));
}

// ---------------------------------------------------------------- Dati
async function loadAll() {
  const since = new Date(); since.setDate(since.getDate() - 75);
  const sinceIso = since.toISOString();
  const sinceDay = ymd(since);
  const [t, c, e, h] = await Promise.all([
    sb.from('tasks').select('*').or(`done.eq.false,done_at.gte.${sinceIso},due_date.gte.${sinceDay}`).order('created_at').limit(2000),
    sb.from('captures').select('*').in('status', ['inbox', 'archived']).order('created_at', { ascending: false }).limit(1000),
    sb.from('expenses').select('*').gte('spent_at', sinceIso).order('spent_at', { ascending: false }).limit(2000),
    sb.from('health_daily').select('*').eq('day', todayYmd()).maybeSingle()
  ]);
  for (const r of [t, c, e]) if (r.error) throw r.error;
  S.tasks = t.data || [];
  S.captures = c.data || [];
  S.expenses = e.data || [];
  S.health = h.data || null;
}

// ---------------------------------------------------------------- Google Calendar (Edge Function "gcal")
async function gcal(action, payload = {}) {
  const { data, error } = await sb.functions.invoke('gcal', { body: { action, ...payload } });
  if (error) {
    let msg = error.message;
    try { const b = await error.context.json(); msg = b.error || msg; if (b.code === 'not_connected') S.gcal.connected = false; } catch { /* no body */ }
    throw new Error(msg);
  }
  return data;
}
function monthStart(offset) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() + offset); return d; }
async function loadEvents(force = false) {
  if (!S.gcal.connected) return;
  const lo = Math.min(0, S.ui.monthOffset) - 1, hi = Math.max(0, S.ui.monthOffset) + 2;
  if (!force && S.evRange && S.evRange[0] <= lo && S.evRange[1] >= hi) return;
  try {
    const r = await gcal('events', { from: monthStart(lo).toISOString(), to: monthStart(hi).toISOString() });
    S.events = r.events || [];
    S.evRange = [lo, hi];
  } catch (err) { console.warn(err); }
}
async function loadGcal() {
  try {
    S.gcal = await gcal('status');
    S.evRange = null;
    await loadEvents(true);
  } catch (err) { console.warn('gcal', err); }
}
async function syncTask(id) {
  if (!S.gcal.connected) return;
  try {
    const r = await gcal('syncTask', { taskId: id });
    const t = S.tasks.find((x) => x.id === id);
    if (t) t.gcal_event_id = r.eventId;
  } catch (err) { toast('Calendario: ' + err.message); }
}
// Eventi Google di un giorno (esclusi quelli creati da Jarvis per una task, già mostrati come task).
function eventsOn(day) {
  return S.events.filter((e) => !e.taskId && (e.allDay ? e.start <= day && day < e.end : ymd(new Date(e.start)) === day))
    .sort((a, b) => (a.allDay ? '0' : '1' + a.start).localeCompare(b.allDay ? '0' : '1' + b.start));
}
const evTime = (e) => (e.allDay ? 'giorno' : hhmm(new Date(e.start).toTimeString()));
const evEnd = (e) => (e.allDay ? '' : hhmm(new Date(e.end).toTimeString()));

async function addTask(title, extra = {}) {
  const row = { title, ...extra };
  const { data, error } = await sb.from('tasks').insert(row).select().single();
  if (error) throw error;
  S.tasks.push(data);
  return data;
}
async function updateTask(id, patch) {
  const t = S.tasks.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  render();
  const { error } = await sb.from('tasks').update(patch).eq('id', id);
  if (error) fail(error);
}

// "Decide Jarvis": smistamento semplice a parole chiave (in futuro: AI).
function classify(text) {
  const s = text.toLowerCase().trim();
  if (/^(ricorda|ricordami|devo|dovrei|compra|comprare|chiama|chiamare|paga|pagare|prenota|prenotare|fai|fare|porta|portare|manda|mandare|scrivi|scrivere|rinnova|rinnovare|sistema|sistemare|pulisci|pulire|vai|andare|prendi|prendere|controlla|controllare|finisci|finire|todo|to do)\b/.test(s)) return 'task';
  if (/^["“«'‘]/.test(s) || /["”»’]$/.test(s)) return 'frase';
  if (/\?$/.test(s) || /^(cos'è|cosa è|cos è|che cos|come funziona|come si|perch[eé]|capire|studiare|approfondire|imparare|cercare|leggere su)\b/.test(s)) return 'studio';
  if (s.split(/\s+/).length <= 4) return 'studio';
  return 'idea';
}
function cleanTaskTitle(text) {
  const t = text.trim().replace(/^(ricordami di|ricorda di|ricordami|devo|todo:?|to do:?)\s+/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

async function saveCapture() {
  const text = S.ui.draft.trim();
  if (!text) { S.ui.capOpen = false; render(); return; }
  const chosen = S.ui.kind;
  const kind = chosen === 'auto' ? classify(text) : chosen;
  S.ui.draft = ''; S.ui.capOpen = false; S.ui.kind = 'auto';
  stopListening();
  document.activeElement?.blur();
  try {
    if (kind === 'task') {
      await addTask(cleanTaskTitle(text), { source: 'capture' });
    } else {
      const { data, error } = await sb.from('captures').insert({ body: text, kind }).select().single();
      if (error) throw error;
      S.captures.unshift(data);
    }
    const where = kind === 'task' ? 'Task di oggi' : KIND_LABEL[kind];
    toast(chosen === 'auto' ? `Jarvis l'ha messo in ${where}` : `Salvato in ${where}`);
  } catch (err) { fail(err); }
}

// ---------------------------------------------------------------- Dettatura
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function startListening() {
  S.ui.capOpen = true;
  if (!SR) {
    toast('Usa il microfono della tastiera per dettare');
    focusLater('cap');
    return;
  }
  try {
    rec = new SR();
    rec.lang = 'it-IT';
    rec.interimResults = true;
    rec.continuous = false;
    const base = S.ui.draft ? S.ui.draft.trim() + ' ' : '';
    rec.onresult = (ev) => {
      let txt = '';
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      S.ui.draft = base + txt;
      const el = document.getElementById('cap');
      if (el) el.value = S.ui.draft;
    };
    rec.onerror = () => { S.ui.listening = false; render(); };
    rec.onend = () => { S.ui.listening = false; render(); };
    rec.start();
    S.ui.listening = true;
    render();
  } catch (err) {
    S.ui.listening = false;
    toast('Dettatura non disponibile: usa il microfono della tastiera');
  }
}
function stopListening() {
  if (rec) { try { rec.stop(); } catch { /* ignore */ } rec = null; }
  S.ui.listening = false;
}

let focusTarget = null;
function focusLater(id) { focusTarget = id; }

// ---------------------------------------------------------------- Selettori
function todayTasks() {
  const t = todayYmd();
  const list = S.tasks.filter((x) => {
    if (x.done) return x.done_at && ymd(new Date(x.done_at)) === t && (!x.due_date || x.due_date <= t);
    if (!x.due_date || x.due_date <= t) return true;
    return x.rescheduled_at && ymd(new Date(x.rescheduled_at)) === t;
  });
  const rank = (x) => (x.done ? 3 : x.due_date && x.due_date > t ? 2 : 1);
  return list.sort((a, b) => rank(a) - rank(b)
    || (a.due_time || '99').localeCompare(b.due_time || '99')
    || a.created_at.localeCompare(b.created_at));
}
const tasksOn = (day) => S.tasks.filter((x) => x.due_date === day).sort((a, b) => (a.due_time || '99').localeCompare(b.due_time || '99'));
const inbox = () => S.captures.filter((c) => c.status === 'inbox');

function taskWhen(x) {
  const t = todayYmd();
  if (!x.due_date) return '';
  if (x.due_date > t) return `Spostata a ${dayLabel(x.due_date)}${x.due_time ? ', ' + hhmm(x.due_time) : ''}`;
  if (x.due_date < t && !x.done) return `In sospeso da ${dayLabel(x.due_date)}`;
  return x.due_time ? `Oggi alle ${hhmm(x.due_time)}` : '';
}

// ---------------------------------------------------------------- Pezzi di interfaccia
function headHtml(date, title, extra = '') {
  return `<div class="head ${isWide() ? 'wide' : ''}">
    <div><p class="h-date">${esc(date)}</p><h1 class="h-title">${esc(title)}</h1></div>
    ${extra}${isWide() ? captureHtml() : ''}
  </div>`;
}

function captureHtml() {
  const u = S.ui;
  const kinds = u.capOpen ? `<div class="kinds"><p>Dove lo metto?</p><div class="chips">${KINDS.map((k) =>
    `<button class="chip ${u.kind === k.id ? 'on' : ''}" data-action="kind" data-id="${k.id}">${k.label}</button>`).join('')}</div></div>` : '';
  const tst = u.toast && !isWide() ? `<p class="toast" role="status">${esc(u.toast)}</p>` : '';
  return `<div class="capture-wrap">
    ${isWide() ? '' : tst}${isWide() ? '' : kinds}
    <div class="capture">
      <label for="cap" class="sr-only">Cattura</label>
      <input id="cap" data-model="draft" value="${esc(u.draft)}" placeholder="${u.listening ? 'Sto ascoltando…' : 'Cattura qualcosa…'}" autocomplete="off" enterkeyhint="send">
      ${u.capOpen ? `<button class="round send" data-action="saveCapture" aria-label="Salva">${I.up}</button>` : ''}
      <button class="round mic ${u.listening ? 'on' : ''}" data-action="mic" aria-label="Detta">${I.mic}</button>
    </div>
    ${isWide() ? kinds : ''}
  </div>`;
}

function navHtml() {
  const items = [
    { id: 'oggi', label: 'Oggi', icon: I.sun },
    { id: 'calendario', label: 'Calendario', icon: I.cal, wideOnly: true },
    { id: 'settimana', label: 'Settimana', icon: I.week },
    { id: 'spese', label: 'Spese', icon: I.wallet },
    { id: 'mente', label: 'Mente', icon: I.mind }
  ];
  const bottomView = S.view === 'calendario' ? 'settimana' : S.view;
  return `
  <nav class="rail" aria-label="Sezioni">
    <div class="logo">${I.logo}</div>
    ${items.map((i) => `<button class="${S.view === i.id ? 'on' : ''}" data-action="go" data-id="${i.id}">${i.icon}${i.label}</button>`).join('')}
    <div class="spacer"></div>
    <button data-action="logout" aria-label="Esci">${I.logout}Esci</button>
  </nav>
  <nav class="nav-bottom" aria-label="Sezioni">
    ${items.filter((i) => !i.wideOnly).map((i) => `<button class="${bottomView === i.id ? 'on' : ''}" data-action="go" data-id="${i.id}">${i.label}</button>`).join('')}
  </nav>`;
}

function taskRowHtml(x) {
  const t = todayYmd();
  const moved = !x.done && x.due_date && x.due_date > t;
  const when = taskWhen(x);
  const open = S.ui.schedId === x.id;
  const clockCls = open ? 'open' : (x.due_time || moved ? 'set' : '');
  return `<div class="task ${x.done ? 'done' : ''} ${moved ? 'moved' : ''}">
    <div class="task-line">
      <button class="task-main" data-action="toggleTask" data-id="${x.id}" aria-pressed="${x.done}">
        <span class="check">${x.done ? I.check : ''}</span>
        <span class="task-text"><span class="task-title">${esc(x.title)}</span>${when ? `<span class="task-when">${esc(when)}</span>` : ''}</span>
      </button>
      <button class="icon-btn ${clockCls}" data-action="openSched" data-id="${x.id}" aria-label="Metti in calendario: ${esc(x.title)}">${I.clock}</button>
    </div>
    ${open ? schedHtml() : ''}
  </div>`;
}

function schedHtml() {
  const u = S.ui;
  const base = new Date();
  const days = [0, 1, 2, 3, 4].map((n) => {
    const d = addDays(base, n);
    const id = ymd(d);
    const label = n === 0 ? 'Oggi' : n === 1 ? 'Domani' : `${DOW[dowIdx(d)]} ${d.getDate()}`;
    return `<button class="chip blue ${u.schedDay === id ? 'on' : ''}" data-action="schedDay" data-id="${id}">${label}</button>`;
  }).join('');
  const customDay = [0, 1, 2, 3, 4].every((n) => ymd(addDays(base, n)) !== u.schedDay);
  const times = TIMES.map((h) => `<button class="chip blue ${u.schedTime === h ? 'on' : ''}" data-action="schedTime" data-id="${h}">${h}</button>`).join('');
  const customTime = u.schedTime && !TIMES.includes(u.schedTime);
  return `<div class="sched">
    <p>Quando?</p>
    <div class="chips">${days}
      <label class="chip blue ${customDay ? 'on' : ''}"><span class="sr-only">Altro giorno</span><input type="date" data-model="schedDay" value="${esc(u.schedDay || '')}"></label>
    </div>
    <p>A che ora?</p>
    <div class="chips">${times}
      <label class="chip blue ${customTime ? 'on' : ''}"><span class="sr-only">Altro orario</span><input type="time" data-model="schedTime" value="${esc(u.schedTime || '')}"></label>
      <button class="chip blue ${!u.schedTime ? 'on' : ''}" data-action="schedTime" data-id="">Senza orario</button>
    </div>
    <div class="row-btns">
      <button class="btn grow" data-action="closeSched">Annulla</button>
      <button class="btn primary grow2" data-action="confirmSched">Metti in calendario</button>
    </div>
  </div>`;
}

function tasksCardHtml() {
  const list = todayTasks();
  const doneN = list.filter((x) => x.done).length;
  return `<div class="card tasks span2">
    <p class="card-label"><span>Task di oggi</span><span class="mono">${doneN} / ${list.length}</span></p>
    ${list.map(taskRowHtml).join('')}
    <div class="add-task">
      <span class="plus">${I.plus}</span>
      <label for="newTask" class="sr-only">Nuova task</label>
      <input id="newTask" data-model="newTask" value="${esc(S.ui.newTask)}" placeholder="Aggiungi una task…" autocomplete="off" enterkeyhint="done">
    </div>
  </div>`;
}

function timelineHtml(day, withNow) {
  const n = nowHHMM();
  const isToday = day === todayYmd();
  const items = tasksOn(day).filter((x) => x.due_time).map((x) => ({
    time: hhmm(x.due_time), title: x.title, meta: x.done ? 'Fatto' : 'Task', cls: x.done ? 'past' : 'is-task'
  }));
  const evs = eventsOn(day);
  evs.filter((e) => !e.allDay).forEach((e) => items.push({
    time: evTime(e), title: e.title, meta: `${e.calName} · fino alle ${evEnd(e)}`,
    cls: `is-event ${e.primary ? '' : 'alt'} ${isToday && evEnd(e) <= n ? 'past' : ''}`
  }));
  items.sort((a, b) => a.time.localeCompare(b.time));
  evs.filter((e) => e.allDay).reverse().forEach((e) => items.unshift({ time: '—', title: e.title, meta: `${e.calName} · tutto il giorno`, cls: `is-event ${e.primary ? '' : 'alt'}` }));
  if (withNow) {
    const idx = items.findIndex((i) => i.time !== '—' && i.time > n);
    const nowRow = { time: 'ora', title: n, meta: 'Adesso', cls: 'now' };
    if (idx < 0) items.push(nowRow); else items.splice(idx, 0, nowRow);
  }
  if (!items.length) return '<p class="empty">Nessun orario. Usa l\'orologio accanto a una task per metterla in calendario.</p>';
  return `<div class="tl">${items.map((i) => `<div class="tl-row ${i.cls}">
    <span class="tl-time">${esc(i.time)}</span>
    <div class="tl-axis"><span class="tl-dot"></span><span class="tl-line"></span></div>
    <div class="tl-body"><span class="tl-title">${esc(i.title)}</span><span class="tl-meta">${esc(i.meta)}</span></div>
  </div>`).join('')}</div>`;
}

function trainingCardHtml(cls = '') {
  const h = S.health;
  const zone = h?.workout_zone || 0;
  const zones = [1, 2, 3, 4, 5].map((z) => `<span class="${z === zone ? 'on' : z < zone ? 'soft' : ''}"></span>`).join('');
  return `<div class="card tall ${cls}">
    <p class="card-label"><span>Allenamento</span></p>
    ${h?.workout_title
      ? `<p class="card-strong">${esc(h.workout_title)}${h.workout_minutes ? ` · ${h.workout_minutes}'` : ''}</p>
         <div class="zones push" aria-hidden="true">${zones}</div>
         <p class="card-label"><span>${zone ? `Zona ${zone} di 5` : ''}</span></p>`
      : `<p class="card-strong">Garmin</p><p class="card-label push"><span>Da collegare</span></p>`}
  </div>`;
}

function bodyCardHtml(cls = 'span2') {
  const h = S.health || {};
  const sleep = h.sleep_minutes ? `${Math.floor(h.sleep_minutes / 60)}h${pad(h.sleep_minutes % 60)}` : '—';
  return `<div class="card ${cls}">
    <p class="card-label"><span>Corpo</span><span>${S.health ? 'da Garmin' : 'Garmin da collegare'}</span></p>
    <div class="stats3">
      <div><p class="stat-l">Sonno</p><p class="stat-v">${sleep}</p></div>
      <div><p class="stat-l">FC riposo</p><p class="stat-v">${h.resting_hr ?? '—'}</p></div>
      <div><p class="stat-l">HRV</p><p class="stat-v">${h.hrv ?? '—'}</p></div>
    </div>
  </div>`;
}

function nextCardHtml() {
  const n = nowHHMM();
  const day = todayYmd();
  const cands = tasksOn(day).filter((x) => x.due_time && !x.done && hhmm(x.due_time) >= n).map((x) => ({ time: hhmm(x.due_time), title: x.title, meta: 'Task' }))
    .concat(eventsOn(day).filter((e) => !e.allDay && evEnd(e) > n).map((e) => ({ time: evTime(e), title: e.title, meta: evTime(e) < n ? `In corso · fino alle ${evEnd(e)}` : e.calName })));
  cands.sort((a, b) => a.time.localeCompare(b.time));
  const next = cands[0];
  return `<button class="card tall tile-btn" data-action="toggleDay" aria-expanded="${S.ui.showDay}">
    <span class="card-label"><span>Prossimo</span></span>
    ${next ? `<span class="card-big">${next.time}</span><span class="card-strong push">${esc(next.title)}</span><span class="tl-meta">${esc(next.meta)}</span>`
      : `<span class="card-big">—</span><span class="card-strong push">Niente in programma</span>`}
    <span class="link">${S.ui.showDay ? 'Chiudi giornata ↑' : 'Vedi giornata ↓'}</span>
  </button>`;
}

function inboxBarHtml() {
  const n = inbox().length;
  return `<button class="inbox-bar span2" data-action="go" data-id="settimana">
    <span class="mono">${n}</span><span class="grow">${n === 1 ? 'Spunto da smistare' : 'Spunti da smistare'}</span><span class="go">Smista ora →</span>
  </button>`;
}

function inboxListHtml(limit = 6, withActions = false, dayForPlan = null) {
  const items = inbox();
  if (!items.length) return '<p class="empty">Niente da smistare.</p>';
  const lbl = dayForPlan ? dayLabel(dayForPlan) : '';
  return `<div class="list">${items.slice(0, limit).map((c) => `<div class="li">
    <div class="li-main"><span class="li-title">${esc(c.body)}</span><span class="tag ${c.kind}">${KIND_LABEL[c.kind]}</span></div>
    ${withActions ? `<button class="small-btn" data-action="planCapture" data-id="${c.id}">Metti ${esc(lbl)}</button>
      <button class="small-btn ghost" data-action="archiveCapture" data-id="${c.id}" aria-label="Sposta in Mente">Mente</button>` : ''}
  </div>`).join('')}</div>${items.length > limit ? `<p class="empty">+${items.length - limit} altri</p>` : ''}`;
}

// ---------------------------------------------------------------- Calendario (mese)
function monthGridHtml(offset, sel, compact = false) {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = dowIdx(first);
  const t = todayYmd();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<div class="cell out"><span class="n">${addDays(first, i - lead).getDate()}</span></div>`);
  for (let d = 1; d <= days; d++) {
    const id = ymd(new Date(y, m, d));
    const items = eventsOn(id).map((e) => ({ cls: e.primary ? 'g1' : 'g2', time: e.allDay ? '' : evTime(e), title: e.title }))
      .concat(tasksOn(id).map((x) => ({ cls: x.done ? 'done' : '', time: x.due_time ? hhmm(x.due_time) : '', title: x.title })));
    const max = compact ? 2 : 3;
    const evs = items.slice(0, max).map((x) => `<span class="ev ${x.cls}">${x.time ? x.time + ' ' : ''}${esc(x.title)}</span>`).join('');
    const more = items.length > max ? `<span class="more">+${items.length - max}</span>` : '';
    const dots = items.length ? `<span class="dots">${items.slice(0, 3).map(() => '<i></i>').join('')}</span>` : '';
    cells.push(`<button class="cell ${id === sel ? 'sel' : ''} ${id === t ? 'today' : ''} ${id < t ? 'past' : ''}" data-action="calSel" data-id="${id}"><span class="n">${d}</span>${evs}${more}${dots}</button>`);
  }
  let k = 1;
  while (cells.length % 7) cells.push(`<div class="cell out"><span class="n">${k++}</span></div>`);
  return `<div class="cal-wd">${DOW.map((w) => `<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div>`;
}
const monthTitle = (offset) => { const b = new Date(); b.setDate(1); b.setMonth(b.getMonth() + offset); return `${MONTHS[b.getMonth()].replace(/^./, (c) => c.toUpperCase())} ${b.getFullYear()}`; };

function dayPanelHtml(day) {
  const d = parseYmd(day);
  const diff = Math.round((d - parseYmd(todayYmd())) / 864e5);
  const sub = diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : diff < 0 ? 'Passato' : `Tra ${diff} giorni`;
  const list = tasksOn(day);
  const evs = eventsOn(day);
  return `<div class="card">
    <p class="card-label"><span>${sub}</span></p>
    <h2 style="margin:0;font-size:18px;font-weight:600">${longDate(d)}</h2>
    ${evs.length ? eventListHtml(evs) : ''}
    ${list.length ? `<div>${list.map(taskRowHtml).join('')}</div>` : ''}
    ${!list.length && !evs.length ? '<p class="empty">Giornata libera.</p>' : ''}
  </div>`;
}

function eventListHtml(evs) {
  return `<div class="list">${evs.map((e) => `<div class="li">
    <span class="ev-dot ${e.primary ? '' : 'alt'}"></span>
    <div class="li-main"><span class="li-title">${esc(e.title)}</span><span class="li-meta">${e.allDay ? 'Tutto il giorno' : `${evTime(e)} – ${evEnd(e)}`} · ${esc(e.calName)}${e.location ? ' · ' + esc(e.location) : ''}</span></div>
  </div>`).join('')}</div>`;
}

function gcalCardHtml(cls = 'span2') {
  if (!S.gcal.configured || S.gcal.connected) return '';
  return `<div class="card ${cls}">
    <p class="card-label"><span>Google Calendar</span><span>anche Notion Calendar</span></p>
    <p class="card-strong">Collega il calendario per vedere i tuoi eventi qui e mettere in calendario le task.</p>
    <button class="btn primary" data-action="connectGoogle">Collega Google Calendar</button>
  </div>`;
}

function calendarsCardHtml() {
  if (!S.gcal.connected) return gcalCardHtml('');
  return `<div class="card">
    <p class="card-label"><span>Calendari mostrati</span></p>
    <div class="chips">${S.gcal.calendars.map((c) => `<button class="chip ${c.enabled ? 'on' : ''}" data-action="toggleCal" data-id="${esc(c.calendar_id)}">${esc(c.is_primary ? 'Personale' : c.summary)}</button>`).join('')}</div>
  </div>`;
}

// ---------------------------------------------------------------- Viste
function viewOggi() {
  const d = new Date();
  const wide = isWide();
  const toggled = S.ui.showDay ? `<div class="card span2"><p class="card-label"><span>La tua giornata</span></p>${timelineHtml(todayYmd(), true)}</div>` : '';
  if (!wide) {
    return `${headHtml(longDate(d), 'Oggi')}
    <div class="grid2">
      ${nextCardHtml()}
      ${trainingCardHtml()}
      ${toggled}
      ${tasksCardHtml()}
      ${gcalCardHtml()}
      ${inboxBarHtml()}
      ${bodyCardHtml()}
    </div>`;
  }
  return `${headHtml(longDate(d), 'Oggi')}
  <div class="desk">
    <div class="desk-left">
      <div class="grid2">${nextCardHtml()}${trainingCardHtml()}${toggled}${tasksCardHtml()}${gcalCardHtml()}${bodyCardHtml()}</div>
      <div class="card"><p class="card-label"><span>Da smistare</span><span class="mono">${inbox().length}</span></p>${inboxListHtml(5)}
        <button class="link" data-action="go" data-id="settimana" style="align-self:flex-start">Smista in Settimana →</button></div>
    </div>
    <div class="desk-right">
      <div class="cal">
        <div class="cal-head">
          <button class="sq" data-action="month" data-id="-1" aria-label="Mese precedente">${I.left}</button>
          <h2 style="margin:0;font-size:18px;font-weight:600;min-width:150px">${monthTitle(S.ui.monthOffset)}</h2>
          <button class="sq" data-action="month" data-id="1" aria-label="Mese successivo">${I.right}</button>
          <button class="link" data-action="go" data-id="calendario" style="margin-left:8px">Apri a tutto schermo →</button>
        </div>
        ${monthGridHtml(S.ui.monthOffset, S.ui.calSel, true)}
      </div>
      ${dayPanelHtml(S.ui.calSel)}
    </div>
  </div>`;
}

function viewCalendario() {
  return `<div class="head ${isWide() ? 'wide' : ''}">
    <div class="cal-head">
      <button class="sq" data-action="month" data-id="-1" aria-label="Mese precedente">${I.left}</button>
      <h1>${monthTitle(S.ui.monthOffset)}</h1>
      <button class="sq" data-action="month" data-id="1" aria-label="Mese successivo">${I.right}</button>
      <button class="btn" data-action="monthToday">Oggi</button>
    </div>
    ${isWide() ? captureHtml() : ''}
  </div>
  <div class="cal-wrap">
    <div class="cal">${monthGridHtml(S.ui.monthOffset, S.ui.calSel)}</div>
    <div class="cal-side">
      ${dayPanelHtml(S.ui.calSel)}
      ${calendarsCardHtml()}
      <div class="card"><p class="card-label"><span>Da smistare · metti nel giorno scelto</span><span class="mono">${inbox().length}</span></p>${inboxListHtml(8, true, S.ui.calSel)}</div>
    </div>
  </div>`;
}

function viewSettimana() {
  const u = S.ui;
  const mon = addDays(mondayOf(new Date()), u.weekOffset * 7);
  const sun = addDays(mon, 6);
  const range = mon.getMonth() === sun.getMonth()
    ? `${mon.getDate()} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
    : `${mon.getDate()} ${MONTHS[mon.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
  const t = todayYmd();
  const strip = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(mon, i); const id = ymd(d);
    return `<button class="day-btn ${id === u.weekSel ? 'on' : ''} ${tasksOn(id).length || eventsOn(id).length ? 'busy' : ''} ${id === t ? 'today' : ''}" data-action="weekSel" data-id="${id}">
      <span class="dow">${DOW[i].charAt(0)}</span><span class="num">${d.getDate()}</span><span class="dot"></span></button>`;
  }).join('');
  const sel = parseYmd(u.weekSel);
  const list = tasksOn(u.weekSel);
  const dayEvs = eventsOn(u.weekSel);

  // Riepilogo settimana scorsa
  const pMon = addDays(mondayOf(new Date()), -7); const pSun = addDays(pMon, 6);
  const inPrev = (iso) => { const d = ymd(new Date(iso)); return d >= ymd(pMon) && d <= ymd(pSun); };
  const doneN = S.tasks.filter((x) => x.done && x.done_at && inPrev(x.done_at)).length;
  const spent = S.expenses.filter((e) => inPrev(e.spent_at)).reduce((a, e) => a + Number(e.amount), 0);

  return `${headHtml(range, 'Settimana', `<div class="week-nav">
      <button data-action="week" data-id="-1" aria-label="Settimana precedente">${I.left}</button>
      <button data-action="week" data-id="1" aria-label="Settimana successiva">${I.right}</button>
      <button class="pill-badge" data-action="go" data-id="calendario">Mese</button></div>`)}
  <div class="week-strip">${strip}</div>
  <div class="card">
    <p class="card-label"><span>${longDate(sel)}</span><span>${list.length + dayEvs.length} ${list.length + dayEvs.length === 1 ? 'cosa' : 'cose'}</span></p>
    ${dayEvs.length ? eventListHtml(dayEvs) : ''}
    ${list.map(taskRowHtml).join('')}
    ${!list.length && !dayEvs.length ? '<p class="empty">Niente in programma.</p>' : ''}
  </div>
  <div class="card">
    <p class="card-label"><span>Inbox · da smistare</span><span class="mono">${inbox().length}</span></p>
    ${inboxListHtml(50, true, u.weekSel)}
  </div>
  <div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div class="card"><p class="stat-l">Task fatte la settimana scorsa</p><p class="stat-v">${doneN}</p></div>
    <div class="card"><p class="stat-l">Speso la settimana scorsa</p><p class="stat-v">€${eur(spent)}</p></div>
  </div>`;
}

function viewSpese() {
  const u = S.ui;
  const b = new Date(); b.setDate(1); b.setMonth(b.getMonth() + u.spMonth);
  const y = b.getFullYear(), m = b.getMonth();
  const list = S.expenses.filter((e) => { const d = new Date(e.spent_at); return d.getFullYear() === y && d.getMonth() === m; });
  const total = list.reduce((a, e) => a + Number(e.amount), 0);
  const budget = ls.get('budget', 600);
  const pct = Math.min(100, Math.round((total / budget) * 100));
  const isCurrent = u.spMonth === 0;
  const daysLeft = new Date(y, m + 1, 0).getDate() - new Date().getDate();
  const byCat = {};
  list.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const cats = Object.entries(byCat).sort((a, c) => c[1] - a[1]);
  const max = cats.length ? cats[0][1] : 1;
  const icon = (meth) => meth === 'nfc' ? `<span class="mv-icon nfc">${I.nfc}</span>` : meth === 'online' ? `<span class="mv-icon">${I.cart}</span>` : `<span class="mv-icon">${I.pen}</span>`;
  const methLabel = { nfc: 'Apple Pay', manual: 'manuale', online: 'online' };
  const addForm = u.adding ? `<div class="card">
    <p class="card-label"><span>Nuova spesa</span></p>
    <div class="form-row">
      <label for="exAmount" class="sr-only">Importo</label>
      <input id="exAmount" class="field amount" data-model="exAmount" value="${esc(u.exAmount)}" inputmode="decimal" placeholder="0,00">
      <label for="exDesc" class="sr-only">Cosa</label>
      <input id="exDesc" class="field grow" data-model="exDesc" value="${esc(u.exDesc)}" placeholder="Cosa? (es. Amazon · libro)">
    </div>
    <div class="chips">${CATEGORIES.map((c) => `<button class="chip ${u.exCat === c ? 'on' : ''}" data-action="exCat" data-id="${c}">${c}</button>`).join('')}</div>
    <div class="chips">${[['manual', 'In negozio'], ['online', 'Online']].map(([id, l]) => `<button class="chip blue ${u.exMethod === id ? 'on' : ''}" data-action="exMethod" data-id="${id}">${l}</button>`).join('')}</div>
    <div class="row-btns"><button class="btn grow" data-action="cancelExpense">Annulla</button><button class="btn dark grow2" data-action="saveExpense">Salva</button></div>
  </div>` : '';
  return `${headHtml(`${MONTHS[m].replace(/^./, (c) => c.toUpperCase())} ${y}`, 'Spese', `<div class="week-nav">
      <button data-action="spMonth" data-id="-1" aria-label="Mese precedente">${I.left}</button>
      <button data-action="spMonth" data-id="1" aria-label="Mese successivo" ${isCurrent ? 'disabled' : ''}>${I.right}</button>
      <button class="btn primary" data-action="addExpense" style="min-height:40px">${I.plus} Aggiungi</button></div>`)}
  <div class="hero">
    <p class="lbl">${isCurrent ? 'Speso questo mese' : 'Speso nel mese'}</p>
    <div style="display:flex;align-items:baseline;gap:8px"><span class="big">€${eur(total)}</span><button class="of" data-action="budget">di €${eur(budget).replace(',00', '')}</button></div>
    <div class="bar"><div style="width:${pct}%"></div></div>
    <div class="foot"><span>${total <= budget ? `Restano €${eur(budget - total)}` : `Sforato di €${eur(total - budget)}`}</span><span>${isCurrent ? `${daysLeft} giorni alla fine del mese` : ''}</span></div>
  </div>
  ${addForm}
  <div class="card">
    <p class="card-label"><span>Per categoria</span></p>
    ${cats.length ? cats.map(([c, v]) => `<div class="cat-row"><div class="cat-top"><span>${esc(c)}</span><span class="mono muted">€${eur(v)}</span></div><div class="cat-bar"><div style="width:${Math.round((v / max) * 100)}%"></div></div></div>`).join('') : '<p class="empty">Ancora nessuna spesa questo mese.</p>'}
  </div>
  <div class="card">
    <p class="card-label"><span>Movimenti</span><span>${list.length}</span></p>
    <div class="list">${list.map((e) => {
      const d = new Date(e.spent_at);
      return `<div class="li">${icon(e.method)}
        <div class="li-main"><span class="li-title">${esc(e.description)}</span><span class="li-meta">${esc(e.category)} · ${methLabel[e.method] || e.method} · ${dayLabel(ymd(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}</span></div>
        <span class="mono">−${eur(e.amount)}</span>
        <button class="x-btn" data-action="delExpense" data-id="${e.id}" aria-label="Elimina ${esc(e.description)}">${I.x}</button>
      </div>`;
    }).join('') || '<p class="empty">Nessun movimento.</p>'}</div>
  </div>
  <button class="btn" disabled title="In arrivo">Invia a Notion · in arrivo</button>`;
}

function viewMente() {
  const u = S.ui;
  const filters = [['tutto', 'Tutto'], ['studio', 'Da studiare'], ['frase', 'Frasi'], ['idea', 'Idee']];
  const q = u.mSearch.trim().toLowerCase();
  const all = S.captures.filter((c) => c.kind !== 'task' && (u.mFilter === 'tutto' || c.kind === u.mFilter) && (!q || c.body.toLowerCase().includes(q)));
  const frase = S.captures.find((c) => c.kind === 'frase');
  return `${headHtml('Il tuo secondo cervello', 'Mente')}
  <div class="search">${I.search}<label for="mSearch" class="sr-only">Cerca</label><input id="mSearch" data-model="mSearch" value="${esc(u.mSearch)}" placeholder="Cerca in argomenti, frasi, idee…"></div>
  <div class="chips">${filters.map(([id, l]) => `<button class="chip ${u.mFilter === id ? 'on' : ''}" data-action="mFilter" data-id="${id}">${l}</button>`).join('')}</div>
  ${frase && (u.mFilter === 'tutto' || u.mFilter === 'frase') && !q ? `<div class="quote"><p class="m">Frase su cui riflettere</p><p class="q">${esc(frase.body)}</p><p class="m">Salvata ${dayLabel(ymd(new Date(frase.created_at)))}</p></div>` : ''}
  <div class="card">
    <div class="list">${all.map((c) => `<div class="li"><div class="li-main"><span class="li-title">${esc(c.body)}</span><span class="li-meta">${dayLabel(ymd(new Date(c.created_at)))}${c.status === 'inbox' ? ' · da smistare' : ''}</span></div><span class="tag ${c.kind}">${KIND_LABEL[c.kind]}</span></div>`).join('') || '<p class="empty">Niente qui, per ora. Cattura un argomento o una frase dalla barra.</p>'}</div>
  </div>`;
}

function viewLogin() {
  const u = S.ui;
  return `<div class="login"><form class="login-card" data-form="login">
    ${I.logo}
    <h1>Jarvis</h1>
    <p>Accedi con la tua email. La prima volta scegli una password con "Primo accesso".</p>
    <label for="email" class="sr-only">Email</label>
    <input id="email" name="email" class="field" type="email" autocomplete="email" placeholder="Email" required>
    <label for="password" class="sr-only">Password</label>
    <input id="password" name="password" class="field" type="password" autocomplete="current-password" placeholder="Password (min. 8 caratteri)" minlength="8" required>
    ${u.loginErr ? `<p class="err" role="alert">${esc(u.loginErr)}</p>` : ''}
    <button class="btn dark" type="submit" ${u.loginBusy ? 'disabled' : ''}>Accedi</button>
    <button class="btn" type="button" data-action="signup" ${u.loginBusy ? 'disabled' : ''}>Primo accesso</button>
  </form></div>`;
}

// ---------------------------------------------------------------- Render
const app = document.getElementById('app');
function render() {
  if (S.loading) { app.innerHTML = '<div class="boot">Jarvis</div>'; return; }
  if (!S.session) { app.innerHTML = viewLogin(); return; }
  const active = document.activeElement;
  const keepId = focusTarget || (active && active.id && app.contains(active) ? active.id : null);
  const sel = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const views = { oggi: viewOggi, calendario: viewCalendario, settimana: viewSettimana, spese: viewSpese, mente: viewMente };
  const body = (views[S.view] || viewOggi)();
  const floatToast = S.ui.toast && isWide() ? `<p class="toast float" role="status">${esc(S.ui.toast)}</p>` : '';
  app.innerHTML = `<div class="shell">${navHtml()}<main class="main">${body}</main>${isWide() ? '' : captureHtml()}${floatToast}</div>`;
  if (keepId) {
    const el = document.getElementById(keepId);
    if (el) {
      el.focus({ preventScroll: true });
      try { if (sel && el.setSelectionRange && keepId === active?.id) el.setSelectionRange(sel[0], sel[1]); else if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } catch { /* date inputs */ }
    }
  }
  focusTarget = null;
}

// ---------------------------------------------------------------- Azioni
const actions = {
  go(id) { S.view = id; ls.set('view', id); S.ui.schedId = null; window.scrollTo(0, 0); render(); },
  kind(id) { S.ui.kind = id; focusLater('cap'); render(); },
  saveCapture() { saveCapture(); },
  mic() { if (S.ui.listening) { stopListening(); render(); } else startListening(); },
  toggleDay() { S.ui.showDay = !S.ui.showDay; render(); },
  toggleTask(id) {
    const t = S.tasks.find((x) => x.id === id); if (!t) return;
    const done = !t.done;
    updateTask(id, { done, done_at: done ? new Date().toISOString() : null });
  },
  openSched(id) {
    if (S.ui.schedId === id) { S.ui.schedId = null; render(); return; }
    const t = S.tasks.find((x) => x.id === id);
    S.ui.schedId = id;
    S.ui.schedDay = t?.due_date && t.due_date >= todayYmd() ? t.due_date : todayYmd();
    S.ui.schedTime = t?.due_time ? hhmm(t.due_time) : '12:00';
    render();
  },
  schedDay(id) { S.ui.schedDay = id; render(); },
  schedTime(id) { S.ui.schedTime = id; render(); },
  closeSched() { S.ui.schedId = null; render(); },
  async confirmSched() {
    const id = S.ui.schedId; if (!id) return;
    const day = S.ui.schedDay || todayYmd();
    const time = S.ui.schedTime || null;
    const isToday = day === todayYmd();
    S.ui.schedId = null;
    if (isToday && time) S.ui.showDay = true;
    const g = S.gcal.connected && time ? ' · anche su Google' : '';
    toast(isToday ? (time ? `In calendario oggi alle ${time}${g}` : 'Messa per oggi') : `Spostata a ${dayLabel(day)}${time ? ' alle ' + time : ''}${g}`);
    await updateTask(id, { due_date: day, due_time: time, rescheduled_at: isToday ? null : new Date().toISOString() });
    await syncTask(id);
  },
  async connectGoogle() {
    try { const r = await gcal('authUrl'); window.location.href = r.url; } catch (err) { fail(err); }
  },
  async toggleCal(id) {
    const c = S.gcal.calendars.find((x) => x.calendar_id === id); if (!c) return;
    c.enabled = !c.enabled; render();
    try { await gcal('setCalendar', { calendarId: id, enabled: c.enabled }); await loadEvents(true); render(); } catch (err) { fail(err); }
  },
  week(id) {
    S.ui.weekOffset += Number(id);
    const mon = addDays(mondayOf(new Date()), S.ui.weekOffset * 7);
    S.ui.weekSel = S.ui.weekOffset === 0 ? todayYmd() : ymd(mon);
    render();
  },
  weekSel(id) { S.ui.weekSel = id; render(); },
  async month(id) { S.ui.monthOffset += Number(id); render(); await loadEvents(); render(); },
  monthToday() { S.ui.monthOffset = 0; S.ui.calSel = todayYmd(); render(); },
  calSel(id) { S.ui.calSel = id; render(); },
  async planCapture(id) {
    const c = S.captures.find((x) => x.id === id); if (!c) return;
    const day = S.view === 'calendario' ? S.ui.calSel : S.ui.weekSel;
    try {
      const prefix = c.kind === 'studio' ? 'Studiare: ' : '';
      const t = await addTask(prefix + c.body, { due_date: day, source: 'inbox' });
      c.status = 'planned';
      S.captures = S.captures.filter((x) => x.id !== id);
      render();
      const { error } = await sb.from('captures').update({ status: 'planned', planned_task_id: t.id }).eq('id', id);
      if (error) throw error;
      toast(`Messo ${dayLabel(day)}`);
    } catch (err) { fail(err); }
  },
  async archiveCapture(id) {
    const c = S.captures.find((x) => x.id === id); if (!c) return;
    c.status = 'archived'; render();
    const { error } = await sb.from('captures').update({ status: 'archived' }).eq('id', id);
    if (error) fail(error); else toast('Spostato in Mente');
  },
  spMonth(id) { S.ui.spMonth = Math.min(0, S.ui.spMonth + Number(id)); render(); },
  addExpense() { S.ui.adding = !S.ui.adding; if (S.ui.adding) focusLater('exAmount'); render(); },
  cancelExpense() { S.ui.adding = false; render(); },
  exCat(id) { S.ui.exCat = id; render(); },
  exMethod(id) { S.ui.exMethod = id; render(); },
  async saveExpense() {
    const u = S.ui;
    const amount = Number(String(u.exAmount).replace(/\s/g, '').replace(',', '.'));
    if (!amount || amount < 0) { toast('Scrivi un importo valido'); return; }
    if (!u.exDesc.trim()) { toast('Scrivi cosa hai comprato'); return; }
    try {
      const { data, error } = await sb.from('expenses').insert({ amount, description: u.exDesc.trim(), category: u.exCat, method: u.exMethod }).select().single();
      if (error) throw error;
      S.expenses.unshift(data);
      Object.assign(u, { adding: false, exAmount: '', exDesc: '', spMonth: 0 });
      toast(`Salvata: €${eur(amount)} in ${data.category}`);
    } catch (err) { fail(err); }
  },
  async delExpense(id) {
    const e = S.expenses.find((x) => x.id === id); if (!e) return;
    if (!confirm(`Eliminare "${e.description}" (€${eur(e.amount)})?`)) return;
    S.expenses = S.expenses.filter((x) => x.id !== id); render();
    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) fail(error);
  },
  budget() {
    const cur = ls.get('budget', 600);
    const v = prompt('Budget mensile in euro', String(cur));
    const n = Number(String(v || '').replace(',', '.'));
    if (n > 0) { ls.set('budget', n); render(); }
  },
  mFilter(id) { S.ui.mFilter = id; render(); },
  async logout() { await sb.auth.signOut(); },
  async signup() {
    const form = app.querySelector('[data-form="login"]');
    const email = form.email.value.trim(), password = form.password.value;
    if (!email || password.length < 8) { S.ui.loginErr = 'Inserisci email e una password di almeno 8 caratteri.'; render(); return; }
    S.ui.loginBusy = true; S.ui.loginErr = ''; render();
    const { error } = await sb.auth.signUp({ email, password });
    if (error) { S.ui.loginBusy = false; S.ui.loginErr = error.message.includes('Registrazione') || error.message.includes('Database error') ? 'Questa email non può registrarsi.' : error.message; render(); return; }
    const r = await sb.auth.signInWithPassword({ email, password });
    S.ui.loginBusy = false;
    if (r.error) { S.ui.loginErr = r.error.message; render(); }
  }
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el.dataset.id); }
});

app.addEventListener('input', (e) => {
  const el = e.target;
  const key = el.dataset?.model; if (!key) return;
  S.ui[key] = el.value;
  if (key === 'draft' && !S.ui.capOpen && el.value) { S.ui.capOpen = true; render(); }
  if (key === 'mSearch') render();
  if (key === 'schedDay' || key === 'schedTime') render();
});

app.addEventListener('focusin', (e) => {
  if (e.target.id === 'cap' && !S.ui.capOpen) { S.ui.capOpen = true; render(); }
});

app.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && S.ui.capOpen) { S.ui.capOpen = false; stopListening(); document.activeElement?.blur(); render(); return; }
  if (e.key !== 'Enter' || e.isComposing) return;
  const id = e.target.id;
  if (id === 'cap') { e.preventDefault(); saveCapture(); }
  if (id === 'newTask') {
    e.preventDefault();
    const title = S.ui.newTask.trim(); if (!title) return;
    S.ui.newTask = ''; focusLater('newTask');
    try { await addTask(title); render(); } catch (err) { fail(err); }
  }
  if (id === 'exAmount' || id === 'exDesc') { e.preventDefault(); actions.saveExpense(); }
});

// Chiudi il pannello dei tag toccando fuori dalla barra di cattura (senza rubare il tocco ai pulsanti).
document.addEventListener('click', (e) => {
  if (!S.ui.capOpen || S.ui.draft) return;
  if (e.target.closest('.capture-wrap')) return;
  S.ui.capOpen = false;
  if (!e.target.closest('[data-action]')) render();
}, true);

app.addEventListener('submit', async (e) => {
  if (e.target.dataset.form !== 'login') return;
  e.preventDefault();
  const email = e.target.email.value.trim(), password = e.target.password.value;
  S.ui.loginBusy = true; S.ui.loginErr = ''; render();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  S.ui.loginBusy = false;
  if (error) { S.ui.loginErr = error.message === 'Invalid login credentials' ? 'Email o password non corretti.' : error.message; render(); }
});

// Cmd/Ctrl+K apre la cattura su computer.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); S.ui.capOpen = true; focusLater('cap'); render(); }
});

wideMq.addEventListener('change', render);

// ---------------------------------------------------------------- Avvio
async function onSession(session) {
  S.session = session;
  if (session) {
    try { await loadAll(); } catch (err) { console.error(err); S.ui.toast = 'Errore nel caricare i dati'; }
  }
  S.loading = false;
  render();
  if (session) {
    await loadGcal();
    render();
    const g = new URLSearchParams(location.search).get('google');
    if (g) {
      history.replaceState(null, '', location.pathname);
      toast({ ok: 'Google Calendar collegato', denied: 'Collegamento annullato', error: 'Collegamento non riuscito, riprova' }[g] || '');
    }
  }
}

applyTheme();
setInterval(applyTheme, 5 * 60 * 1000);
// A mezzanotte (o al ritorno sull'app) aggiorna la giornata.
let lastDay = todayYmd();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.session) return;
  applyTheme();
  if (todayYmd() !== lastDay) { lastDay = todayYmd(); S.ui.weekSel = lastDay; S.ui.calSel = lastDay; }
  try { await loadAll(); await loadEvents(true); render(); } catch { /* offline */ }
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    if ((S.session?.user?.id || null) !== (session?.user?.id || null) || S.loading) onSession(session);
  }
});
