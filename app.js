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

// Stesse categorie dei database spese su Notion.
const CATEGORIES = ['Cibo', 'Spesa', 'Benza', 'Auto', 'Shopping', 'Abbonamenti', 'Salute', 'Esperienze', 'Fun', 'Cinema', 'Formazione',
  'Università', 'Regali', 'Home', 'Lavanderia', 'Burocrazie', 'Svapo', 'Yugi', 'Giorgia', 'Investimenti'];
const KINDS = [
  { id: 'task', label: 'Task' },
  { id: 'frase', label: 'Frase' },
  { id: 'idea', label: 'Idea' }
];
const KIND_LABEL = { task: 'Task', studio: 'Idea', frase: 'Frase', idea: 'Idea', auto: 'Jarvis' };
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DOW_LONG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const TIMES = ['09:00', '12:00', '15:30', '18:00', '21:00'];

// ---------------------------------------------------------------- Icone
const I = {
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sunSmall: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
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
  heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-4 3 8 2-4h7"/></svg>',
  run: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="15" cy="4.5" r="2"/><path d="M13.5 8 10.5 13l3.5 2.5-1 5"/><path d="M10.5 13 8 17H4.5"/><path d="m13.5 8 3.5 2.5 2.5-1.5"/><path d="M13.5 8 10 8.5 8 10.5"/></svg>',
  barbell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h20"/><rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/><path d="M3.5 9.5v5M20.5 9.5v5"/></svg>',
  checkBig: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/></svg>',
  gauge: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 18.5a9 9 0 1 1 15 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.6"/></svg>',
  trash: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  heartFill: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  battery: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10.5v3M6.5 10v4M10 10v4M13.5 10v4"/></svg>',
  doc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  logout: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>',
  logo: '<svg width="44" height="44" viewBox="0 0 100 100" role="img" aria-label="Jarvis"><rect width="100" height="100" rx="23" fill="var(--logo-bg, #2E5BDB)"/><g transform="skewX(-12) translate(10 0)"><path d="M56 16 H72 V56 A26 26 0 0 1 20 56 H36 A10 10 0 0 0 56 56 Z" fill="#FFFFFF"/></g><path d="M10 76 L90 32" stroke="var(--logo-bg, #2E5BDB)" stroke-width="6.5"/></svg>'
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
// Tema: automatico (scuro dal tramonto all'alba, Roma). Il pulsante sole/luna lo forza fino al prossimo tramonto o alba.
function autoDark(now) { const { rise, set } = sunTimes(now); return now < rise || now > set; }
function nextSunChange(now) {
  const { rise, set } = sunTimes(now);
  if (now < rise) return rise.getTime();
  if (now < set) return set.getTime();
  const t = new Date(now); t.setDate(t.getDate() + 1);
  return sunTimes(t).rise.getTime();
}
function isDark() {
  const now = new Date();
  const o = ls.get('themeOverride', null);
  if (o && Date.now() < o.until) return o.theme === 'dark';
  return autoDark(now);
}
let metaTimer = null;
// metaDelay: ritardo per il colore della barra di stato (ora, batteria), che non si può animare:
// durante la transizione a cerchio cambia quando il cerchio arriva in cima allo schermo.
function applyTheme(metaDelay = 0) {
  const dark = isDark();
  const theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--logo-bg', dark ? '#17171A' : '#2E5BDB');
  const meta = document.getElementById('theme-color');
  clearTimeout(metaTimer);
  const setMeta = () => { if (meta) meta.content = dark ? '#0F0F11' : '#EFEFEC'; };
  if (metaDelay > 0) metaTimer = setTimeout(setMeta, metaDelay); else setMeta();
}
// Pulsante sole/luna: luna di giorno (porta alla notte), sole di sera (porta al giorno).
let themeAnimUntil = 0; // l'icona ruota solo subito dopo il cambio, non a ogni render
function themeBtnHtml(cls = '') {
  const dark = isDark();
  return `<button class="theme-btn ${cls} ${Date.now() < themeAnimUntil ? 'anim' : ''}" data-action="toggleTheme" aria-label="${dark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}">
    <span class="ti ti-moon ${dark ? '' : 'show'}">${I.moon}</span><span class="ti ti-sun ${dark ? 'show' : ''}">${I.sunSmall}</span>${cls === 'rail-theme' ? `<span class="rl">${dark ? 'Giorno' : 'Notte'}</span>` : ''}</button>`;
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
  notion: { state: 'idle', lastSync: 0, msg: '' },
  loadedMonths: new Set(),
  healthDays: [],
  garminSync: 'idle',
  activities: [],
  gcal: { configured: false, connected: ls.get('gcalConnected', false), calendars: [], loaded: false },
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
    editId: null, editText: '',
    loginErr: '', loginBusy: false
  }
};
const wideMq = window.matchMedia('(min-width: 1000px)');
const isWide = () => wideMq.matches;

let toastTimer = null;
let toastUndo = null;
function toast(msg, undo = null) {
  S.ui.toast = msg;
  toastUndo = undo;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.ui.toast = ''; toastUndo = null; render(); }, undo ? 4500 : 2800);
}
const toastHtml = (cls) => `<p class="toast ${cls}" role="status">${esc(S.ui.toast)}${toastUndo ? ' <button class="toast-undo" data-action="undo">Annulla</button>' : ''}</p>`;
function fail(err) {
  console.error(err);
  toast('Errore: ' + (err?.message || 'qualcosa è andato storto'));
}

// ---------------------------------------------------------------- Dati
async function loadAll() {
  const since = new Date(); since.setDate(since.getDate() - 75);
  const sinceIso = since.toISOString();
  const sinceDay = ymd(since);
  const [t, c, e, h, a] = await Promise.all([
    sb.from('tasks').select('*').or(`done.eq.false,done_at.gte.${sinceIso},due_date.gte.${sinceDay}`).order('created_at').limit(2000),
    sb.from('captures').select('*').in('status', ['inbox', 'archived']).order('created_at', { ascending: false }).limit(1000),
    sb.from('expenses').select('*').gte('spent_at', sinceIso).order('spent_at', { ascending: false }).limit(2000),
    sb.from('health_daily').select('*').gte('day', sinceDay).order('day', { ascending: false }).limit(120),
    sb.from('activities').select('*').gte('day', sinceDay).order('start_time', { ascending: false }).limit(500)
  ]);
  for (const r of [t, c, e]) if (r.error) throw r.error;
  S.tasks = t.data || [];
  S.captures = c.data || [];
  S.expenses = e.data || [];
  S.healthDays = h.data || [];
  S.activities = a.data || [];
  S.health = S.healthDays.find((x) => x.day === todayYmd()) || null;
}

// ---------------------------------------------------------------- Garmin
const ACT_LABEL = {
  running: 'Corsa', trail_running: 'Trail', treadmill_running: 'Tapis roulant', track_running: 'Pista', walking: 'Camminata', hiking: 'Escursione',
  cycling: 'Bici', indoor_cycling: 'Bici indoor', road_biking: 'Bici', strength_training: 'Forza', indoor_cardio: 'Cardio', hiit: 'HIIT',
  yoga: 'Yoga', pilates: 'Pilates', lap_swimming: 'Nuoto', open_water_swimming: 'Nuoto', breathwork: 'Respirazione', other: 'Allenamento'
};
// Per David tutto ciò che non è corsa è un allenamento di forza.
const actLabel = (a) => (RUN_TYPES_ALL().includes(a.type) ? (ACT_LABEL[a.type] || 'Corsa') : 'Forza');
function RUN_TYPES_ALL() { return RUN_TYPES; }
const RUN_TYPES = ['running', 'trail_running', 'treadmill_running', 'track_running', 'indoor_running', 'virtual_run'];
const STRENGTH_TYPES = ['strength_training', 'weight_training'];
function actIcon(a) {
  const run = RUN_TYPES.includes(a.type);
  const str = !run;
  const svg = run ? I.run : str ? I.barbell : I.heart;
  return `<span class="act-icon ${run ? 'run' : str ? 'str' : ''}" aria-label="${run ? 'Corsa' : str ? 'Forza' : 'Allenamento'}">${svg}</span>`;
}
const actZone = (a) => { const z = a.zones_s || []; if (!z.some((v) => v > 0)) return 0; return z.indexOf(Math.max(...z)) + 1; };
const durLabel = (s) => { if (!s) return ''; const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}` : `${m}'`; };
const kmLabel = (m) => (m ? `${(m / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km` : '');
const sleepLabel = (mins) => (mins ? `${Math.floor(mins / 60)}h${pad(mins % 60)}` : '—');
const READY_IT = { PRIME: 'Ottima', HIGH: 'Alta', MODERATE: 'Moderata', LOW: 'Bassa', POOR: 'Scarsa' };
const HRV_IT = { BALANCED: 'Bilanciato', UNBALANCED: 'Sbilanciato', LOW: 'Basso', POOR: 'Scarso' };
const activitiesOn = (day) => (S.activities || []).filter((a) => a.day === day);
const garminLinked = () => (S.healthDays || []).length > 0 || (S.activities || []).length > 0;

// Aggiornamento Garmin su richiesta: avvia la sync (funzione garmin-refresh → GitHub Actions) e attende i dati nuovi.
let garminPoll = null;
async function refreshGarmin(manual = false) {
  if (S.garminSync === 'running') return;
  const startedAt = Date.now();
  ls.set('garminAuto', startedAt);
  S.garminSync = 'running'; render();
  let res;
  try {
    const { data, error } = await sb.functions.invoke('garmin-refresh', { body: { days: 2 } });
    if (error) throw error;
    res = data;
  } catch (err) {
    console.warn(err); S.garminSync = 'error'; render();
    if (manual) toast('Aggiornamento Garmin non riuscito');
    return;
  }
  if (res.status === 'not_configured') { S.garminSync = 'idle'; render(); if (manual) toast('Aggiornamento su richiesta non ancora attivo'); return; }
  if (res.status === 'error') { S.garminSync = 'error'; render(); if (manual) toast('Aggiornamento Garmin non riuscito'); return; }
  const before = S.health?.updated_at || '';
  let tries = 0;
  clearInterval(garminPoll);
  garminPoll = setInterval(async () => {
    tries++;
    const { data } = await sb.from('health_daily').select('updated_at').eq('day', todayYmd()).maybeSingle();
    const fresh = data && data.updated_at !== before && new Date(data.updated_at).getTime() > startedAt - 60000;
    if (fresh || tries >= 16) {
      clearInterval(garminPoll);
      try { await loadAll(); } catch { /* offline */ }
      S.garminSync = fresh ? 'done' : 'error';
      render();
      if (manual || fresh) toast(fresh ? 'Dati Garmin aggiornati' : 'Garmin non ha risposto, riprova tra poco');
    }
  }, 15000);
}
// Al mattino, se il sonno di stanotte non c'è ancora, aggiorna da solo (al massimo ogni 20 minuti).
function maybeAutoRefreshGarmin() {
  if (!garminLinked()) return;
  const h = new Date().getHours();
  if (h < 4 || h >= 14) return;
  if (S.health?.sleep_minutes) return;
  if (Date.now() - (ls.get('garminAuto', 0) || 0) < 20 * 60 * 1000) return;
  refreshGarmin(false);
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
    S.gcal = { ...(await gcal('status')), loaded: true };
    ls.set('gcalConnected', !!S.gcal.connected);
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
  // "Decide Jarvis": nel dubbio è una task. Gli altri tipi solo quando sono evidenti.
  const s = text.toLowerCase().trim();
  if (/^["“«'‘]/.test(s) || /["”»’]$/.test(s)) return 'frase';
  if (/^(idea|idee|e se|potrei|sarebbe bello|mi piacerebbe)\b/.test(s)) return 'idea';
  if (/\?$/.test(s) || /^(cos'è|cosa è|cos è|che cos|che cosa|come funziona|perch[eé]|studiare|approfondire|imparare|capire come|capire cosa|leggere su|scoprire)\b/.test(s)) return 'idea'; // "Da studiare" è confluito in Idea
  // Inizia con un verbo (infinito o imperativo comune) → task.
  const first = s.split(/\s+/)[0];
  if (/(are|ere|ire|rre)$/.test(first) || /^(ricorda|ricordami|devo|dovrei|compra|chiama|paga|prenota|fai|porta|manda|scrivi|rinnova|sistema|pulisci|vai|prendi|controlla|finisci|todo)$/.test(first)) return 'task';
  // Due-quattro parole senza verbo: una parola chiave da approfondire.
  if (s.split(/\s+/).length <= 4 && !/\d/.test(s)) return 'idea';
  return 'task';
}
function cleanTaskTitle(text) {
  const t = text.trim().replace(/^(ricordami di|ricorda di|ricordami|devo|todo:?|to do:?)\s+/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Animazione della cattura: una pillola col testo parte dalla barra e vola verso la sezione di destinazione.
function flyCapture(text, target) {
  const from = document.querySelector('.capture');
  if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly'; el.textContent = text;
  document.body.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  const x0 = a.left + 20, y0 = a.top + (a.height - h) / 2;
  el.style.left = x0 + 'px'; el.style.top = y0 + 'px';
  setTimeout(() => {
    // La destinazione si cerca dopo il render (la barra viene ridisegnata).
    const sel = isWide() ? `.rail [data-id="${target}"]` : `.nav-bottom [data-id="${target}"]`;
    const t = document.querySelector(sel);
    const cap = document.querySelector('.capture');
    if (cap) { cap.classList.remove('sent'); void cap.offsetWidth; cap.classList.add('sent'); }
    const b = t ? t.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight, width: 0, height: 0 };
    const dx = b.left + b.width / 2 - (x0 + w / 2), dy = b.top + b.height / 2 - (y0 + h / 2);
    const anim = el.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(.8)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0.2 }
    ], { duration: 650, easing: 'cubic-bezier(.45, 0, .25, 1)' });
    anim.onfinish = () => {
      el.remove();
      const t2 = document.querySelector(sel);
      if (t2) { t2.classList.remove('bump'); void t2.offsetWidth; t2.classList.add('bump'); setTimeout(() => t2.classList.remove('bump'), 500); }
    };
  }, 30);
}

async function saveCapture() {
  const text = S.ui.draft.trim();
  if (!text) { S.ui.capOpen = false; render(); return; }
  const chosen = S.ui.kind;
  const kind = chosen === 'auto' ? classify(text) : chosen;
  flyCapture(text, kind === 'task' ? 'oggi' : 'mente');
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
  // Prima le task da fare, dalla più recente; poi quelle spostate; in fondo le fatte.
  return list.sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));
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
  if (isWide()) return `<div class="head wide">
    <div><p class="h-date">${esc(date)}</p><h1 class="h-title">${esc(title)}</h1></div>
    ${extra}${captureHtml()}${themeBtnHtml()}
  </div>`;
  // Sole/luna sempre per primo in alto a destra, in ogni sezione (sopra gli altri pulsanti).
  return `<div class="head">
    <div><p class="h-date">${esc(date)}</p><h1 class="h-title">${esc(title)}</h1></div>
    <div class="h-side">${themeBtnHtml()}${extra}</div>
  </div>`;
}

function captureHtml() {
  const u = S.ui;
  const kinds = u.capOpen ? `<div class="kinds"><p>Dove lo metto? Se non scegli, decide Jarvis</p><div class="chips">${KINDS.map((k) =>
    `<button class="chip ${u.kind === k.id ? 'on' : ''}" data-action="kind" data-id="${k.id}">${k.label}</button>`).join('')}</div></div>` : '';
  const tst = u.toast && !isWide() ? toastHtml('') : '';
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

// Barra in basso: indicatore che scivola tra le sezioni, anche trascinando il dito sulla barra.
const BOTTOM = ['oggi', 'settimana', 'spese', 'mente'];
const bottomOf = (v) => v === 'calendario' ? 'settimana' : v === 'corpo' ? 'oggi' : v;
let navPrevIdx = -1;      // posizione dell'indicatore nel render precedente (per animarlo verso la nuova)
let lastView = null;      // sezione mostrata nel render precedente (per l'animazione d'entrata)
let navDrag = null;

function navHtml() {
  const items = [
    { id: 'oggi', label: 'Oggi', icon: I.sun },
    { id: 'calendario', label: 'Calendario', icon: I.cal, wideOnly: true },
    { id: 'settimana', label: 'Settimana', icon: I.week },
    { id: 'spese', label: 'Spese', icon: I.wallet },
    { id: 'mente', label: 'Mente', icon: I.mind },
    { id: 'corpo', label: 'Corpo', icon: I.heart, wideOnly: true }
  ];
  const bottomView = S.view === 'calendario' ? 'settimana' : S.view === 'corpo' ? 'oggi' : S.view;
  return `
  <nav class="rail" aria-label="Sezioni">
    <div class="logo">${I.logo}</div>
    ${items.map((i) => `<button class="${S.view === i.id ? 'on' : ''}" data-action="go" data-id="${i.id}">${i.icon}${i.label}</button>`).join('')}
    <div class="spacer"></div>
    <button data-action="logout" aria-label="Esci">${I.logout}Esci</button>
  </nav>
  <nav class="nav-bottom" aria-label="Sezioni" style="--i:${navPrevIdx < 0 ? BOTTOM.indexOf(bottomView) : navPrevIdx}">
    <span class="nav-ind" aria-hidden="true"></span>
    ${BOTTOM.map((id) => { const i = items.find((x) => x.id === id); return `<button class="${bottomView === id ? 'on' : ''}" data-action="go" data-id="${id}" ${bottomView === id ? 'aria-current="page"' : ''}>${i.label}</button>`; }).join('')}
  </nav>`;
}

function taskRowHtml(x) {
  const t = todayYmd();
  const moved = !x.done && x.due_date && x.due_date > t;
  const when = taskWhen(x);
  const open = S.ui.schedId === x.id;
  const clockCls = open ? 'open' : (x.due_time || moved ? 'set' : '');
  const editing = S.ui.editId === x.id;
  return `<div class="task ${x.done ? 'done' : ''} ${moved ? 'moved' : ''}">
    <div class="task-line">
      <button class="check-btn" data-action="toggleTask" data-id="${x.id}" aria-pressed="${x.done}" aria-label="${x.done ? 'Segna da fare' : 'Segna fatta'}: ${esc(x.title)}"><span class="check">${x.done ? I.check : ''}</span></button>
      <span class="task-text">
        ${editing
          ? `<label for="edit-${x.id}" class="sr-only">Modifica task</label><input id="edit-${x.id}" class="task-edit" data-model="editText" data-edit="${x.id}" value="${esc(S.ui.editText)}" enterkeyhint="done" autocomplete="off">`
          : `<button class="task-title" data-action="editTask" data-id="${x.id}" title="Tocca per modificare">${esc(x.title)}</button>`}
        ${when && !editing ? `<span class="task-when">${esc(when)}</span>` : ''}
      </span>
      <button class="icon-btn trash" data-action="deleteTask" data-id="${x.id}" aria-label="Elimina: ${esc(x.title)}">${I.trash}</button>
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
    ${(S.ui.tasksAll ? list : list.slice(0, 3)).map(taskRowHtml).join('')}
    ${list.length > 3 ? `<button class="more-btn" data-action="tasksAll">${S.ui.tasksAll ? 'Mostra meno' : `Mostra tutte · altre ${list.length - 3}`}</button>` : ''}
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

function zonesBar(zone) {
  return `<div class="zones" aria-hidden="true">${[1, 2, 3, 4, 5].map((z) => `<span class="${z === zone ? 'on' : z < zone ? 'soft' : ''}"></span>`).join('')}</div>`;
}

function trainingCardHtml(cls = '') {
  const today = activitiesOn(todayYmd());
  const h = S.health || {};
  let body;
  if (today.length) {
    const a = today[0];
    body = `<span class="act-head">${actIcon(a)}<span class="card-strong">${esc(actLabel(a))} · ${durLabel(a.duration_s)}</span></span>
      <p class="card-label push"><span>Fatto${a.distance_m ? ' · ' + kmLabel(a.distance_m) : ''}${today.length > 1 ? ` · +${today.length - 1}` : ''}</span></p>
      <p class="card-label"><span>${a.avg_hr ? `FC media ${a.avg_hr}` : ''}</span></p>`;
  } else if (h.readiness != null) {
    // Nessun allenamento oggi: "Riposo" in evidenza, la prontezza come dato secondario.
    body = `<p class="card-strong">Riposo</p>
      <p class="card-label push"><span>Nessun allenamento oggi</span></p>
      <p class="card-label"><span>Prontezza ${h.readiness}${READY_IT[h.readiness_level] ? ' · ' + READY_IT[h.readiness_level] : ''}</span></p>`;
  } else if (garminLinked()) {
    body = '<p class="card-strong">Riposo</p><p class="card-label push"><span>Nessun allenamento oggi</span></p>';
  } else {
    body = '<p class="card-strong">Garmin</p><p class="card-label push"><span>Da collegare</span></p>';
  }
  return `<button class="card tall tile-btn ${cls}" data-action="go" data-id="corpo">
    <span class="card-label"><span>Allenamento</span></span>${body}</button>`;
}

const SLEEP_Q = (sc) => (sc >= 90 ? 'Ottimo' : sc >= 80 ? 'Buono' : sc >= 60 ? 'Discreto' : 'Scarso');
function avgOf(key) {
  const vals = (S.healthDays || []).filter((d) => d.day !== todayYmd() && d[key] != null).slice(0, 30).map((d) => d[key]);
  return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function vsAvg(key, val, higherIsGood) {
  const a = avgOf(key);
  if (a == null || val == null) return '';
  const d = Math.round(val - a);
  if (d === 0) return '<span class="trend" title="Uguale alla media degli ultimi 30 giorni">=</span>';
  const good = higherIsGood ? d > 0 : d < 0;
  return `<span class="trend ${good ? 'good' : 'bad'}" title="Rispetto alla media degli ultimi 30 giorni">${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`;
}
function metricRow(kind, icon, label, val, unit, trend) {
  return `<div class="m-row"><span class="m-icon ${kind}">${icon}</span><span class="m-label">${label}</span>
    <span class="m-val">${val ?? '—'}${val != null && unit ? `<small>${unit}</small>` : ''}</span>${trend || '<span class="trend"></span>'}</div>`;
}
function bodyCardHtml(cls = 'span2') {
  const h = S.health || {};
  const running = S.garminSync === 'running';
  const linked = garminLinked();
  const hasSleep = !!h.sleep_minutes;
  const note = running ? 'Aggiorno i dati del Garmin…'
    : linked && !hasSleep && S.garminSync === 'done' ? 'Garmin non ha ancora il sonno di stanotte: apri Garmin Connect per sincronizzare l\'orologio, poi aggiorna.' : '';
  const st = [['deep', h.deep_min, 'Profondo'], ['light', h.light_min, 'Leggero'], ['rem', h.rem_min, 'REM'], ['awake', h.awake_min, 'Sveglio']].filter((x) => x[1]);
  const stages = st.length ? `<div class="stage-bar" aria-hidden="true">${st.map(([k, m]) => `<span class="st-${k}" style="flex:${m}"></span>`).join('')}</div>
    <div class="stage-legend">${st.filter(([k]) => k !== 'awake').map(([k, m, l]) => `<span><i class="st-${k}"></i>${l} ${sleepLabel(m)}</span>`).join('')}</div>` : '';
  const rl = h.readiness_level;
  const readyTrend = rl ? `<span class="trend ${['PRIME', 'HIGH'].includes(rl) ? 'good' : ['LOW', 'POOR'].includes(rl) ? 'bad' : ''}">${READY_IT[rl] || ''}</span>` : '';
  return `<div class="card body-card ${cls}">
    <div class="card-label"><span>Corpo</span>
      <span class="card-actions">
        ${linked ? `<button class="mini-btn ${running ? 'spin' : ''}" data-action="garminRefresh" aria-label="Aggiorna dati Garmin" ${running ? 'disabled' : ''}>${I.refresh}</button>
        <button class="link" data-action="go" data-id="corpo">Vedi settimana →</button>` : '<span>Garmin da collegare</span>'}
      </span>
    </div>
    <button class="tile-btn plain sleep-hero" data-action="go" data-id="corpo" aria-label="Apri la sezione Corpo">
      ${hasSleep ? `<span class="sleep-top"><span><span class="stat-l">Stanotte hai dormito</span><span class="sleep-big">${sleepLabel(h.sleep_minutes)}</span></span>
        ${h.sleep_score ? `<span class="pill-badge">Punteggio ${h.sleep_score} · ${SLEEP_Q(h.sleep_score)}</span>` : ''}</span>${stages}`
      : `<span class="stat-l">Stanotte</span><span class="card-strong">${linked ? 'Il sonno non è ancora arrivato' : 'Collega Garmin per vedere il sonno'}</span>`}
    </button>
    <div class="m-list">
      ${metricRow('heart', I.heartFill, 'FC a riposo', h.resting_hr, ' bpm', vsAvg('resting_hr', h.resting_hr, false))}
      ${metricRow('wave', I.heart, 'HRV notturna', h.hrv, ' ms', vsAvg('hrv', h.hrv, true))}
      ${metricRow('batt', I.battery, 'Body Battery', h.body_battery_wake ?? h.body_battery_high, '', vsAvg('body_battery_wake', h.body_battery_wake, true))}
      ${metricRow('gauge', I.gauge, 'Prontezza', h.readiness, '', readyTrend)}
    </div>
    ${note ? `<p class="sync-note">${note}</p>` : ''}
  </div>`;
}

// Grafico a barre semplice per 7 giorni.
function barsHtml(title, days, key, fmt, note = '') {
  const vals = days.map((d) => d.h?.[key] ?? null);
  const max = Math.max(...vals.filter((v) => v != null), 1);
  const min = key === 'resting_hr' ? Math.max(0, Math.min(...vals.filter((v) => v != null), max) - 8) : 0;
  const last = [...vals].reverse().find((v) => v != null);
  return `<div class="card chart">
    <p class="card-label"><span>${title}</span><span class="mono">${last != null ? fmt(last) : '—'}</span></p>
    <div class="bars">${days.map((d, i) => {
      const v = vals[i];
      const pct = v == null ? 0 : Math.max(6, Math.round(((v - min) / (max - min || 1)) * 100));
      return `<div class="bar-col ${d.today ? 'today' : ''}"><span class="bar-v">${v != null ? fmt(v) : ''}</span><span class="bar-track"><span style="height:${pct}%"></span></span><span class="bar-l">${d.dow}</span></div>`;
    }).join('')}</div>
    ${note ? `<p class="card-label"><span>${note}</span></p>` : ''}
  </div>`;
}

function viewCorpo() {
  const off = S.ui.corpoWeek || 0;
  const mon = addDays(mondayOf(new Date()), off * 7);
  const sun = addDays(mon, 6);
  const t = todayYmd();
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const id = ymd(addDays(mon, i));
    return { id, dow: DOW[i].charAt(0), today: id === t, h: (S.healthDays || []).find((x) => x.day === id) };
  });
  const acts = (S.activities || []).filter((a) => a.day >= ymd(mon) && a.day <= ymd(sun)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const totS = acts.reduce((s, a) => s + (a.duration_s || 0), 0);
  const totM = acts.reduce((s, a) => s + Number(a.distance_m || 0), 0);
  const load = acts.reduce((s, a) => s + Number(a.training_load || 0), 0);
  const range = `${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0, 3)} – ${sun.getDate()} ${MONTHS[sun.getMonth()].slice(0, 3)}`;
  const last = (S.healthDays || [])[0];
  const hrvNote = last?.hrv_status ? `Stato HRV: ${HRV_IT[last.hrv_status] || last.hrv_status}` : '';
  if (!garminLinked()) {
    return `${headHtml('Garmin', 'Corpo')}
    <div class="card"><p class="card-strong">Garmin non è ancora collegato.</p><p class="empty">Appena la sincronizzazione è attiva, qui trovi allenamenti della settimana, sonno, FC a riposo, HRV e Body Battery.</p></div>`;
  }
  return `${headHtml(range, 'Corpo', `<div class="week-nav">
      <button data-action="corpoWeek" data-id="-1" aria-label="Settimana precedente">${I.left}</button>
      <button data-action="corpoWeek" data-id="1" aria-label="Settimana successiva" ${off >= 0 ? 'disabled' : ''}>${I.right}</button></div>`)}
  <div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="card"><p class="stat-l">Allenamenti</p><p class="stat-v">${acts.length}</p></div>
    <div class="card"><p class="stat-l">Tempo</p><p class="stat-v">${durLabel(totS) || '0\''}</p></div>
    <div class="card"><p class="stat-l">Distanza</p><p class="stat-v">${totM ? (totM / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '0'}</p></div>
    <div class="card"><p class="stat-l">Carico</p><p class="stat-v">${Math.round(load)}</p></div>
  </div>
  <div class="card">
    <p class="card-label"><span>Allenamenti della settimana</span></p>
    <div class="list">${acts.map((a) => {
      return `<div class="li">${actIcon(a)}<div class="li-main">
        <span class="li-title">${esc(actLabel(a))}${a.name && a.name !== actLabel(a) ? ` <span class="muted">· ${esc(a.name)}</span>` : ''}</span>
        <span class="li-meta">${dayLabel(a.day)} · ${durLabel(a.duration_s)}${a.distance_m ? ' · ' + kmLabel(a.distance_m) : ''}${a.avg_hr ? ` · FC ${a.avg_hr}` : ''}${a.aerobic_te ? ` · TE ${String(a.aerobic_te).replace('.', ',')}` : ''}</span>
      </div></div>`;
    }).join('') || '<p class="empty">Nessun allenamento questa settimana.</p>'}</div>
  </div>
  <div class="charts">
    ${barsHtml('Sonno', days, 'sleep_minutes', sleepLabel)}
    ${barsHtml('FC a riposo', days, 'resting_hr', (v) => String(v))}
    ${barsHtml('HRV notturna', days, 'hrv', (v) => String(v), hrvNote)}
    ${barsHtml('Body Battery al risveglio', days, 'body_battery_wake', (v) => String(v))}
  </div>`;
}

function nextCardHtml() {
  const n = nowHHMM();
  const day = todayYmd();
  const cands = tasksOn(day).filter((x) => x.due_time && !x.done && hhmm(x.due_time) >= n).map((x) => ({ time: hhmm(x.due_time), title: x.title, meta: 'Task' }))
    .concat(eventsOn(day).filter((e) => !e.allDay && evEnd(e) > n).map((e) => ({ time: evTime(e), title: e.title, meta: evTime(e) < n ? `In corso · fino alle ${evEnd(e)}` : e.calName })));
  cands.sort((a, b) => a.time.localeCompare(b.time));
  const next = cands[0];
  const hadToday = tasksOn(day).some((x) => x.due_time) || eventsOn(day).some((e) => !e.allDay);
  return `<button class="card tall tile-btn" data-action="toggleDay" aria-expanded="${S.ui.showDay}">
    <span class="card-label"><span>Prossimo</span></span>
    ${next ? `<span class="card-big">${next.time}</span><span class="card-strong push">${esc(next.title)}</span><span class="tl-meta">${esc(next.meta)}</span>`
      : `<span class="done-badge" aria-hidden="true">${I.checkBig}</span><span class="card-strong push">${hadToday ? 'Per oggi hai fatto tutto' : 'Giornata libera'}</span><span class="tl-meta">${hadToday ? 'Niente altro oggi' : 'Nessun impegno oggi'}</span>`}
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
  if (!S.gcal.loaded || S.gcal.connected) return '';
  return `<div class="card ${cls}">
    <p class="card-label"><span>Google Calendar</span><span>anche Notion Calendar</span></p>
    <p class="card-strong">Collega il calendario per vedere i tuoi eventi qui e mettere in calendario le task.</p>
    ${S.gcal.configured ? '' : '<p class="card-label"><span>Se non funziona: controlla le chiavi Google nei segreti di Supabase.</span></p>'}
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
  // La settimana scorsa può cadere nel mese finanziario precedente: carichiamo i mesi che tocca. Le entrate non sono spese.
  ensureMonthLoaded(financialKey(pMon)); ensureMonthLoaded(financialKey(pSun));
  const spent = S.expenses.filter((e) => e.direction !== 'in' && inPrev(e.spent_at)).reduce((a, e) => a + Number(e.amount), 0);

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
  <div class="card"><p class="stat-l">Speso la settimana scorsa</p><p class="stat-v">€${eur(spent)}</p></div>`;
}

// ---------------------------------------------------------------- Spese: mese finanziario (dal 27 al 26)
// Il mese prende il nome da quello in cui finisce: 27 ott – 26 nov = Novembre (come su Notion).
function financialKey(d) {
  const m = d.getMonth() + (d.getDate() >= 27 ? 1 : 0);
  const x = new Date(d.getFullYear(), m, 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
}
function shiftKey(key, n) { const [y, m] = key.split('-').map(Number); const x = new Date(y, m - 1 + n, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; }
function keyRange(key) { const [y, m] = key.split('-').map(Number); return { start: new Date(y, m - 2, 27), end: new Date(y, m - 1, 26) }; }
const keyName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1].replace(/^./, (c) => c.toUpperCase())} ${y}`; };
const shortDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
function daysToPayday() {
  const now = new Date(); const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let p = new Date(t.getFullYear(), t.getMonth(), 27);
  if (t >= p) p = new Date(t.getFullYear(), t.getMonth() + 1, 27);
  return Math.round((p - t) / 864e5);
}
async function ensureMonthLoaded(key) {
  if (S.loadedMonths.has(key)) return;
  S.loadedMonths.add(key);
  const { data, error } = await sb.from('expenses').select('*').eq('month_key', key).order('spent_at', { ascending: false }).limit(1000);
  if (error) { S.loadedMonths.delete(key); return; }
  const ids = new Set(S.expenses.map((e) => e.id));
  S.expenses.push(...(data || []).filter((e) => !ids.has(e.id)));
  render();
}

// Sincronizzazione con Notion (funzione notion-sync): invia le spese nuove, crea il database del mese, importa lo storico.
async function notionSync(manual = false) {
  if (S.notion.state === 'running') return;
  S.notion.state = 'running'; render();
  try {
    let r;
    for (let i = 0; i < 6; i++) {
      const { data, error } = await sb.functions.invoke('notion-sync', { body: { action: 'sync' } });
      if (error) { let m = error.message; try { const b = await error.context.json(); m = b.hint || b.error || m; } catch { /* */ } throw new Error(m); }
      r = data;
      if (r.status === 'not_configured' || !r.remaining) break;
    }
    if (r.status === 'not_configured') { S.notion = { state: 'off', lastSync: Date.now(), msg: '' }; render(); return; }
    S.notion = { state: 'ok', lastSync: Date.now(), msg: '' };
    S.loadedMonths = new Set();
    await loadAll();
    await ensureMonthLoaded(shiftKey(financialKey(new Date()), S.ui.spMonth));
    render();
    if (manual) toast(r.pushed ? `Inviate a Notion: ${r.pushed}` : 'Notion è aggiornato');
  } catch (err) {
    console.warn(err);
    S.notion = { state: 'error', lastSync: Date.now(), msg: err.message };
    render();
    if (manual) toast('Notion: ' + err.message);
  }
}

// ---------------------------------------------------------------- Comandi Rapidi (iPhone)
// Su iPhone/iPad "Aggiungi spesa" apre il comando rapido "Spesa manuale"; sul computer resta il modulo dentro l'app.
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const SHORTCUT_URL = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Spesa manuale');

// Icone delle categorie spese (stesse categorie di Notion). Il colore del riquadro indica il metodo: blu = Apple Pay, verde = entrata.
const CAT_PATHS = {
  Home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  Spesa: '<path d="M4 9h16l-2 10H6z"/><path d="M8 9l3-5M16 9l-3-5M9 13v3M15 13v3"/>',
  Shopping: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  Auto: '<path d="M4 16v-4l2-5h12l2 5v4z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/><path d="M4 12h16"/>',
  Benza: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  Cibo: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3.5 4-3.5 8H17"/>',
  Esperienze: '<path d="M3 19l6-9 4 5 3-4 5 8z"/><circle cx="17" cy="6" r="1.5"/>',
  Entrate: '<path d="M12 4v10M8 10l4 4 4-4M4 16v3h16v-3"/>',
  Lavanderia: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h2"/>',
  'Università': '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v5"/>',
  Giorgia: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  Formazione: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  Abbonamenti: '<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/>',
  Investimenti: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  Salute: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  Yugi: '<rect x="4" y="6" width="11" height="15" rx="2"/><path d="M8 3h9a2 2 0 0 1 2 2v12"/>',
  Regali: '<path d="M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-1.5-4-5-4-4.5-1.5M12 9c1.5-4 5-4 4.5-1.5"/>',
  Svapo: '<path d="M6 18h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1A4 4 0 0 0 6 18z"/>',
  Fun: '<path d="M6.5 9h11a4 4 0 0 1 3.9 4.9l-.5 2.2a2.4 2.4 0 0 1-4.2 1L15 15H9l-1.7 2.1a2.4 2.4 0 0 1-4.2-1l-.5-2.2A4 4 0 0 1 6.5 9z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01"/>',
  Burocrazie: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  Cinema: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M7 7l2 4M13 7l2 4M19 7l-1 4"/>'
};
const CAT_DEFAULT = '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>';
const catIcon = (cat) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_PATHS[cat] || CAT_DEFAULT}</svg>`;

function viewSpese() {
  const u = S.ui;
  const curKey = financialKey(new Date());
  const key = shiftKey(curKey, u.spMonth);
  const { start, end } = keyRange(key);
  ensureMonthLoaded(key);
  const all = S.expenses.filter((e) => (e.month_key || financialKey(new Date(e.spent_at))) === key).sort((a, b) => b.spent_at.localeCompare(a.spent_at));
  const outs = all.filter((e) => e.direction !== 'in');
  const ins = all.filter((e) => e.direction === 'in');
  const total = outs.reduce((a, e) => a + Number(e.amount), 0);
  const income = ins.reduce((a, e) => a + Number(e.amount), 0);
  const budget = ls.get('budget', 600);
  const pct = Math.min(100, Math.round((total / budget) * 100));
  const isCurrent = u.spMonth === 0;
  const dl = daysToPayday();
  const byCat = {};
  outs.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const cats = Object.entries(byCat).sort((a, c) => c[1] - a[1]);
  const max = cats.length ? cats[0][1] : 1;
  const icon = (e) => {
    const cat = e.direction === 'in' ? 'Entrate' : e.category;
    const tint = e.direction === 'in' ? ' in' : e.method === 'nfc' ? ' nfc' : '';
    return `<span class="mv-icon${tint}" title="${esc(cat)}">${catIcon(cat)}</span>`;
  };
  const methLabel = { nfc: 'Apple Pay', manual: 'manuale', online: 'online', notion: 'Notion' };
  const ns = S.notion;
  const notionLine = ns.state === 'off' ? '<span>Notion non ancora collegato</span>'
    : ns.state === 'running' ? '<span>Sincronizzo con Notion…</span>'
    : ns.state === 'error' ? `<span class="err">${esc(ns.msg || 'Errore con Notion')}</span>`
    : ns.state === 'ok' ? `<span>Allineato con Notion · ${pad(new Date(ns.lastSync).getHours())}:${pad(new Date(ns.lastSync).getMinutes())}</span>` : '<span></span>';
  const addForm = u.adding ? `<div class="card">
    <p class="card-label"><span>${u.exMethod === 'in' ? 'Nuova entrata' : 'Nuova spesa'}</span></p>
    <div class="form-row">
      <label for="exAmount" class="sr-only">Importo</label>
      <input id="exAmount" class="field amount" data-model="exAmount" value="${esc(u.exAmount)}" inputmode="decimal" placeholder="0,00">
      <label for="exDesc" class="sr-only">Cosa</label>
      <input id="exDesc" class="field grow" data-model="exDesc" value="${esc(u.exDesc)}" placeholder="${u.exMethod === 'in' ? 'Da dove? (es. Stipendio)' : 'Cosa? (es. Amazon · libro)'}">
    </div>
    <div class="chips">${[['manual', 'In negozio'], ['online', 'Online'], ['in', 'Entrata']].map(([id, l]) => `<button class="chip blue ${u.exMethod === id ? 'on' : ''}" data-action="exMethod" data-id="${id}">${l}</button>`).join('')}</div>
    ${u.exMethod === 'in' ? '' : `<div class="chips">${CATEGORIES.map((c) => `<button class="chip ${u.exCat === c ? 'on' : ''}" data-action="exCat" data-id="${c}">${c}</button>`).join('')}</div>`}
    <div class="row-btns"><button class="btn grow" data-action="cancelExpense">Annulla</button><button class="btn dark grow2" data-action="saveExpense">Salva</button></div>
  </div>` : '';
  return `${headHtml(`${shortDate(start)} – ${shortDate(end)}`, 'Spese', `<div class="week-nav">
      <button data-action="spMonth" data-id="-1" aria-label="Mese precedente">${I.left}</button>
      <button data-action="spMonth" data-id="1" aria-label="Mese successivo" ${isCurrent ? 'disabled' : ''}>${I.right}</button></div>`)}
  <button class="btn primary add-big" data-action="addExpense">${I.plus} Aggiungi spesa</button>
  ${addForm}
  <div class="hero">
    <p class="lbl">${keyName(key)}${isCurrent ? ' · mese in corso' : ''}</p>
    <div style="display:flex;align-items:baseline;gap:8px"><span class="big">€${eur(total)}</span><button class="of" data-action="budget">di €${eur(budget).replace(',00', '')}</button></div>
    <div class="bar"><div style="width:${pct}%"></div></div>
    <div class="foot"><span>${total <= budget ? `Restano €${eur(budget - total)}` : `Sforato di €${eur(total - budget)}`}</span>
      <span>${isCurrent ? (dl === 0 ? 'Oggi arriva lo stipendio' : `${dl} ${dl === 1 ? 'giorno' : 'giorni'} allo stipendio`) : ''}</span></div>
    ${income ? `<div class="foot"><span>Entrate €${eur(income)}</span><span>Saldo ${income - total >= 0 ? '+' : '−'}€${eur(Math.abs(income - total))}</span></div>` : ''}
  </div>
  <div class="card">
    <p class="card-label"><span>Per categoria</span></p>
    ${cats.length ? cats.map(([c, v]) => `<div class="cat-row"><div class="cat-top"><span>${esc(c)}</span><span class="mono muted">€${eur(v)}</span></div><div class="cat-bar"><div style="width:${Math.round((v / max) * 100)}%"></div></div></div>`).join('') : '<p class="empty">Ancora nessuna spesa in questo mese.</p>'}
  </div>
  <div class="card">
    <p class="card-label"><span>Movimenti</span><span>${all.length}</span></p>
    <div class="list">${all.map((e) => {
      const d = new Date(e.spent_at);
      const when = e.source === 'notion' ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : `${dayLabel(ymd(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return `<div class="li">${icon(e)}
        <div class="li-main"><span class="li-title">${esc(e.description)}</span><span class="li-meta">${esc(e.direction === 'in' ? 'Entrata' : e.category)} · ${methLabel[e.method] || e.method} · ${when}</span></div>
        <span class="mono ${e.direction === 'in' ? 'pos' : ''}">${e.direction === 'in' ? '+' : '−'}${eur(e.amount)}</span>
        <button class="x-btn" data-action="delExpense" data-id="${e.id}" aria-label="Elimina ${esc(e.description)}">${I.x}</button>
      </div>`;
    }).join('') || '<p class="empty">Nessun movimento.</p>'}</div>
  </div>
  <div class="notion-row">${notionLine}
    <button class="btn" data-action="notionSync" ${ns.state === 'running' ? 'disabled' : ''}>${ns.state === 'off' ? 'Riprova' : 'Sincronizza con Notion'}</button></div>`;
}

function viewMente() {
  const u = S.ui;
  const filters = [['tutto', 'Tutto'], ['idea', 'Idee'], ['frase', 'Frasi']];
  if (u.mFilter === 'studio') u.mFilter = 'tutto';
  const q = u.mSearch.trim().toLowerCase();
  const all = S.captures.filter((c) => c.kind !== 'task' && (u.mFilter === 'tutto' || c.kind === u.mFilter) && (!q || c.body.toLowerCase().includes(q)));
  const frase = S.captures.find((c) => c.kind === 'frase');
  return `${headHtml('Il tuo secondo cervello', 'Mente')}
  <div class="search">${I.search}<label for="mSearch" class="sr-only">Cerca</label><input id="mSearch" data-model="mSearch" value="${esc(u.mSearch)}" placeholder="Cerca in argomenti, frasi, idee…"></div>
  <div class="chips">${filters.map(([id, l]) => `<button class="chip ${u.mFilter === id ? 'on' : ''}" data-action="mFilter" data-id="${id}">${l}</button>`).join('')}</div>
  ${frase && (u.mFilter === 'tutto' || u.mFilter === 'frase') && !q ? `<div class="quote"><p class="m">Frase su cui riflettere</p><p class="q">${esc(frase.body)}</p><p class="m">Salvata ${dayLabel(ymd(new Date(frase.created_at)))}</p></div>` : ''}
  <div class="card">
    <div class="list">${all.map((c) => `<div class="li"><div class="li-main"><span class="li-title">${esc(c.body)}</span><span class="li-meta">${dayLabel(ymd(new Date(c.created_at)))}${c.status === 'inbox' ? ' · da smistare' : ''}</span></div><span class="tag ${c.kind}">${KIND_LABEL[c.kind]}</span><button class="todo-btn" data-action="toTodo" data-id="${c.id}" aria-label="Sposta in To-do: ${esc(c.body)}">To-do</button></div>`).join('') || '<p class="empty">Niente qui, per ora. Cattura un argomento o una frase dalla barra.</p>'}</div>
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
function afterRenderNav() {
  const target = BOTTOM.indexOf(bottomOf(S.view));
  const nav = app.querySelector('.nav-bottom');
  if (nav && navPrevIdx !== target) requestAnimationFrame(() => requestAnimationFrame(() => nav.style.setProperty('--i', target)));
  if (lastView && lastView !== S.view) {
    const main = app.querySelector('.main');
    const dir = BOTTOM.indexOf(bottomOf(S.view)) >= BOTTOM.indexOf(bottomOf(lastView)) ? 'r' : 'l';
    if (main) main.classList.add('enter-' + dir);
  }
  navPrevIdx = target;
  lastView = S.view;
}
const app = document.getElementById('app');
function render() {
  if (S.loading) { app.innerHTML = '<div class="boot">Jarvis</div>'; return; }
  if (!S.session) { app.innerHTML = viewLogin(); return; }
  const active = document.activeElement;
  const keepId = focusTarget || (active && active.id && app.contains(active) ? active.id : null);
  const sel = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const views = { oggi: viewOggi, calendario: viewCalendario, settimana: viewSettimana, spese: viewSpese, mente: viewMente, corpo: viewCorpo };
  const body = (views[S.view] || viewOggi)();
  const floatToast = S.ui.toast && isWide() ? toastHtml('float') : '';
  app.innerHTML = `<div class="shell">${navHtml()}<main class="main">${body}</main>${isWide() ? '' : captureHtml()}${floatToast}</div>`;
  afterRenderNav();
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
  go(id) { if (id === 'spese' && Date.now() - S.notion.lastSync > 10 * 60 * 1000) setTimeout(() => notionSync(false), 300); S.view = id; ls.set('view', id); S.ui.schedId = null; window.scrollTo(0, 0); render(); },
  // Un tag si seleziona e si deseleziona: senza tag decide Jarvis (smistamento automatico).
  kind(id) { S.ui.kind = S.ui.kind === id ? 'auto' : id; focusLater('cap'); render(); },
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
  // Cambio tema con transizione: un cerchio che si allarga dal pulsante (View Transitions), altrimenti dissolvenza.
  toggleTheme(_id, el) {
    const goDark = !isDark();
    const now = new Date();
    const btn = el || document.querySelector('.theme-btn');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useVT = document.startViewTransition && !reduce && btn;
    const DUR = 520;
    let x = 0, y = 0, end = 0, metaDelay = 0;
    if (useVT) {
      const r = btn.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
      end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      // Quando il cerchio copre tutta la fascia in alto (fino all'angolo più lontano): lì cambia anche la barra di stato.
      const topReach = Math.hypot(Math.max(x, innerWidth - x), y);
      metaDelay = Math.round(DUR * Math.sqrt(Math.min(1, topReach / end)) * 0.85);
    }
    const switchIt = () => {
      // Se il nuovo tema coincide con quello automatico, niente override; altrimenti vale fino al prossimo tramonto/alba.
      if (goDark === autoDark(now)) ls.set('themeOverride', null);
      else ls.set('themeOverride', { theme: goDark ? 'dark' : 'light', until: nextSunChange(now) });
      themeAnimUntil = Date.now() + 700;
      applyTheme(metaDelay); render();
    };
    if (useVT) {
      const vt = document.startViewTransition(switchIt);
      vt.ready.then(() => {
        document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: DUR, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
    } else {
      document.documentElement.classList.add('theme-fade');
      switchIt();
      setTimeout(() => document.documentElement.classList.remove('theme-fade'), 450);
    }
  },
  // Dalla Mente alle task di oggi con un tocco.
  async toTodo(id) {
    const c = S.captures.find((x) => x.id === id); if (!c) return;
    try {
      const t = await addTask(cleanTaskTitle(c.body), { source: 'inbox' });
      S.captures = S.captures.filter((x) => x.id !== id);
      render();
      toast('Spostato nelle task di oggi');
      const { error } = await sb.from('captures').update({ status: 'planned', planned_task_id: t.id }).eq('id', id);
      if (error) throw error;
    } catch (err) { fail(err); }
  },
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
  addExpense() {
    // Al ritorno nell'app la spesa compare da sola (ricarica su visibilitychange).
    if (IS_IOS && !S.ui.adding) { location.href = SHORTCUT_URL; return; }
    S.ui.adding = !S.ui.adding; if (S.ui.adding) focusLater('exAmount'); render();
  },
  cancelExpense() { S.ui.adding = false; render(); },
  exCat(id) { S.ui.exCat = id; render(); },
  exMethod(id) { S.ui.exMethod = id; render(); },
  async saveExpense() {
    const u = S.ui;
    const amount = Number(String(u.exAmount).replace(/\s/g, '').replace(',', '.'));
    if (!amount || amount < 0) { toast('Scrivi un importo valido'); return; }
    if (!u.exDesc.trim()) { toast(u.exMethod === 'in' ? 'Scrivi da dove arriva' : 'Scrivi cosa hai comprato'); return; }
    const isIn = u.exMethod === 'in';
    try {
      const { data, error } = await sb.from('expenses').insert({
        amount, description: u.exDesc.trim(), category: isIn ? 'Entrate' : u.exCat, method: isIn ? 'manual' : u.exMethod, direction: isIn ? 'in' : 'out'
      }).select().single();
      if (error) throw error;
      S.expenses.unshift(data);
      Object.assign(u, { adding: false, exAmount: '', exDesc: '', spMonth: 0, exMethod: 'manual' });
      toast(isIn ? `Entrata salvata: €${eur(amount)}` : `Salvata: €${eur(amount)} in ${data.category}`);
      if (S.notion.state !== 'off') notionSync(false);
    } catch (err) { fail(err); }
  },
  async delExpense(id) {
    const e = S.expenses.find((x) => x.id === id); if (!e) return;
    if (!confirm(`Eliminare "${e.description}" (€${eur(e.amount)})?${e.notion_page_id ? ' Verrà tolta anche da Notion.' : ''}`)) return;
    S.expenses = S.expenses.filter((x) => x.id !== id); render();
    if (e.notion_page_id) {
      try { await sb.functions.invoke('notion-sync', { body: { action: 'archive', pageId: e.notion_page_id } }); } catch (err) { console.warn(err); }
    }
    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) fail(error);
  },
  notionSync() { notionSync(true); },
  budget() {
    const cur = ls.get('budget', 600);
    const v = prompt('Budget mensile in euro', String(cur));
    const n = Number(String(v || '').replace(',', '.'));
    if (n > 0) { ls.set('budget', n); render(); }
  },
  mFilter(id) { S.ui.mFilter = id; render(); },
  tasksAll() { S.ui.tasksAll = !S.ui.tasksAll; render(); },
  editTask(id) {
    const t = S.tasks.find((x) => x.id === id); if (!t) return;
    S.ui.editId = id; S.ui.editText = t.title; focusLater('edit-' + id); render();
  },
  deleteTask(id) {
    const i = S.tasks.findIndex((x) => x.id === id); if (i < 0) return;
    const t = S.tasks[i];
    S.tasks.splice(i, 1);
    if (S.ui.schedId === id) S.ui.schedId = null;
    let undone = false;
    toast('Task eliminata', () => { undone = true; S.tasks.splice(i, 0, t); render(); });
    setTimeout(async () => {
      if (undone) return;
      if (t.gcal_event_id && S.gcal.connected) {
        try { await sb.from('tasks').update({ due_time: null }).eq('id', id); await gcal('syncTask', { taskId: id }); } catch (err) { console.warn(err); }
      }
      const { error } = await sb.from('tasks').delete().eq('id', id);
      if (error) { S.tasks.splice(i, 0, t); fail(error); }
    }, 4600);
  },
  undo() { const f = toastUndo; toastUndo = null; S.ui.toast = ''; clearTimeout(toastTimer); if (f) f(); render(); },
  garminRefresh() { refreshGarmin(true); },
  corpoWeek(id) { S.ui.corpoWeek = Math.min(0, (S.ui.corpoWeek || 0) + Number(id)); render(); },
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

function navIndexAt(nav, x) {
  const r = nav.getBoundingClientRect();
  const w = (r.width - 12) / BOTTOM.length;
  return Math.max(0, Math.min(BOTTOM.length - 1, (x - r.left - 6) / w - 0.5));
}
app.addEventListener('pointerdown', (e) => {
  const nav = e.target.closest('.nav-bottom');
  if (!nav) return;
  navDrag = { nav, x0: e.clientX, moved: false, id: e.pointerId };
});
app.addEventListener('pointermove', (e) => {
  if (!navDrag || e.pointerId !== navDrag.id) return;
  if (!navDrag.moved && Math.abs(e.clientX - navDrag.x0) < 8) return;
  if (!navDrag.moved) { navDrag.moved = true; navDrag.nav.classList.add('dragging'); try { navDrag.nav.setPointerCapture(e.pointerId); } catch { /* ok */ } }
  navDrag.nav.style.setProperty('--i', navIndexAt(navDrag.nav, e.clientX));
});
const endNavDrag = (e) => {
  if (!navDrag || e.pointerId !== navDrag.id) return;
  const d = navDrag; navDrag = null;
  if (!d.moved) return;
  d.nav.classList.remove('dragging');
  const idx = Math.round(navIndexAt(d.nav, e.clientX));
  d.nav.style.setProperty('--i', idx);
  navPrevIdx = idx;
  suppressNavClick = true; setTimeout(() => { suppressNavClick = false; }, 350);
  if (bottomOf(S.view) !== BOTTOM[idx]) actions.go(BOTTOM[idx]);
};
let suppressNavClick = false;
app.addEventListener('pointerup', endNavDrag);
app.addEventListener('pointercancel', endNavDrag);

app.addEventListener('click', (e) => {
  if (suppressNavClick && e.target.closest('.nav-bottom')) { e.preventDefault(); return; }
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el.dataset.id, el); }
});

app.addEventListener('input', (e) => {
  const el = e.target;
  const key = el.dataset?.model; if (!key) return;
  S.ui[key] = el.value;
  if (key === 'draft' && !S.ui.capOpen && el.value) { S.ui.capOpen = true; render(); }
  if (key === 'mSearch') render();
  if (key === 'schedDay' || key === 'schedTime') render();
});

app.addEventListener('focusout', (e) => {
  const id = e.target.dataset?.edit;
  if (id && S.ui.editId === id) saveTaskEdit(id);
});

async function saveTaskEdit(id) {
  const t = S.tasks.find((x) => x.id === id);
  const title = S.ui.editText.trim();
  S.ui.editId = null;
  if (!t || !title || title === t.title) { render(); return; }
  await updateTask(id, { title });
  if (t.gcal_event_id) syncTask(id);
}

app.addEventListener('focusin', (e) => {
  if (e.target.id === 'cap' && !S.ui.capOpen) { S.ui.capOpen = true; render(); }
});

app.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && S.ui.capOpen) { S.ui.capOpen = false; stopListening(); document.activeElement?.blur(); render(); return; }
  if (e.target.dataset?.edit && e.key === 'Escape') { S.ui.editId = null; render(); return; }
  if (e.key !== 'Enter' || e.isComposing) return;
  const id = e.target.id;
  if (e.target.dataset?.edit) { e.preventDefault(); e.target.blur(); return; }
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
    maybeAutoRefreshGarmin();
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
// Tastiera su iPhone: la barra "Cattura qualcosa…" sale sopra la tastiera, così vedi cosa scrivi; la barra in basso si nasconde.
function fitKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  document.documentElement.style.setProperty('--kb', kb + 'px');
  document.documentElement.classList.toggle('kb-open', kb > 80);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitKeyboard);
  window.visualViewport.addEventListener('scroll', fitKeyboard);
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.session) return;
  applyTheme();
  if (todayYmd() !== lastDay) { lastDay = todayYmd(); S.ui.weekSel = lastDay; S.ui.calSel = lastDay; }
  try { await loadAll(); await loadEvents(true); render(); maybeAutoRefreshGarmin(); } catch { /* offline */ }
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    if ((S.session?.user?.id || null) !== (session?.user?.id || null) || S.loading) onSession(session);
  }
});
