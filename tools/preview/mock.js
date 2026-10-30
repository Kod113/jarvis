// Finto client Supabase per provare l'interfaccia senza toccare il database vero.
const today = new Date(); const pad=n=>String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const add = n => { const d = new Date(); d.setDate(d.getDate()+n); return ymd(d); };
const db = {
  tasks: [
    { id:'t1', title:'Pagare bollo auto', done:true, done_at:new Date().toISOString(), due_date:null, due_time:null, created_at:'2026-10-28T08:00:00Z', rescheduled_at:null },
    { id:'t2', title:'Rinnovare assicurazione auto', done:false, due_date:ymd(today), due_time:'21:30', created_at:'2026-10-28T08:01:00Z', rescheduled_at:null },
    { id:'t3', title:'Finire modulo TryHackMe', done:false, due_date:add(2), due_time:'10:00', created_at:'2026-10-28T08:02:00Z', rescheduled_at:new Date().toISOString() },
    { id:'t4', title:'Chiamare il meccanico', done:false, due_date:add(5), due_time:'09:00', created_at:'2026-10-28T08:03:00Z', rescheduled_at:null },
  ],
  captures: [
    { id:'c1', body:'Zero-knowledge proof', kind:'studio', status:'inbox', created_at:new Date().toISOString() },
    { id:'c2', body:'Idea per il sync Garmin', kind:'idea', status:'inbox', created_at:new Date().toISOString() },
    { id:'c3', body:'"La disciplina è scegliere tra ciò che vuoi ora e ciò che vuoi di più"', kind:'frase', status:'archived', created_at:new Date().toISOString() },
  ],
  expenses: [
    { id:'e1', amount:3.2, description:'Bar Aeroporto', category:'Cibo', method:'nfc', spent_at:new Date().toISOString() },
    { id:'e2', amount:50, description:'Benzina', category:'Auto', method:'nfc', spent_at:new Date(Date.now()-3*864e5).toISOString() },
    { id:'e4', amount:1450, description:'Stipendio', category:'Entrate', method:'manual', direction:'in', spent_at:new Date(Date.now()-2*864e5).toISOString() },
    { id:'e3', amount:10.99, description:'Spotify', category:'Abbonamenti', method:'manual', spent_at:new Date(Date.now()-864e5).toISOString() },
  ],
  health_daily: [0,1,2,3,4,5,6].map(i => ({ day: add(-i), sleep_minutes: 380 + i*9 % 60, deep_min: 80, light_min: 250, rem_min: 100, awake_min: 15, sleep_score: 70 + (i*7)%20, resting_hr: 50 + (i*3)%6, hrv: 42 + (i*5)%14, hrv_status: 'BALANCED', body_battery_wake: 60 + (i*11)%35, readiness: 55 + (i*9)%40, readiness_level: 'MODERATE', steps: 6000 + i*900 })),
  activities: [
    { id: 11, day: ymd(today), start_time: new Date().toISOString(), type: 'running', name: 'Roma Corsa', duration_s: 2460, distance_m: 6200, avg_hr: 141, aerobic_te: 2.8, training_load: 62, zones_s: [120, 1500, 600, 200, 0] },
    { id: 12, day: add(-2), start_time: new Date(Date.now()-2*864e5).toISOString(), type: 'strength_training', name: 'Forza', duration_s: 1800, avg_hr: 112, training_load: 35, zones_s: [900, 600, 100, 0, 0] },
    { id: 13, day: add(-4), start_time: new Date(Date.now()-4*864e5).toISOString(), type: 'running', name: 'Corsa', duration_s: 3000, distance_m: 7800, avg_hr: 148, aerobic_te: 3.2, training_load: 80, zones_s: [60, 900, 1500, 500, 40] }
  ]
};
let uid = 100;
function q(table){
  let rows = db[table]; let op='select'; let payload=null; let single=false; let filt=[];
  const api = {
    select(){ return api; }, or(){ return api; }, order(){ return api; }, limit(){ return api; }, in(){ return api; }, gte(){ return api; },
    eq(k,v){ filt.push([k,v]); return api; },
    insert(p){ op='insert'; payload=p; return api; }, update(p){ op='update'; payload=p; return api; }, delete(){ op='delete'; return api; },
    single(){ single=true; return api; }, maybeSingle(){ single=true; return api; },
    then(res, rej){
      let data;
      if (op==='insert'){ data = { id:'n'+(uid++), created_at:new Date().toISOString(), done:false, status:'inbox', spent_at:new Date().toISOString(), ...payload }; db[table].push(data); }
      else if (op==='update'){ db[table].filter(r=>filt.every(([k,v])=>r[k]===v)).forEach(r=>Object.assign(r,payload)); data=null; }
      else if (op==='delete'){ db[table]=db[table].filter(r=>!filt.every(([k,v])=>r[k]===v)); data=null; }
      else { data = JSON.parse(JSON.stringify(rows)); }
      return Promise.resolve({ data, error:null }).then(res, rej);
    }
  };
  return api;
}
export function createClient(){
  const session = { user:{ id:'u1', email:'test@example.com' } };
  const at = (dayOffset, h, m) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const events = [
    { id:'g1', cal:'me', calName:'davsorm@gmail.com', primary:true, title:'Turno · Aeroporto', start:at(0,14,0), end:at(0,22,0), allDay:false },
    { id:'g2', cal:'fam', calName:'Famiglia', primary:false, title:'Cena dai nonni', start:at(1,20,0), end:at(1,22,0), allDay:false },
    { id:'g3', cal:'me', calName:'davsorm@gmail.com', primary:true, title:'Turno · Aeroporto', start:at(2,6,0), end:at(2,14,0), allDay:false },
    { id:'g4', cal:'fam', calName:'Famiglia', primary:false, title:'Compleanno zia', start:add(4), end:add(5), allDay:true },
  ];
  const gstate = window.__GCAL === 'off'
    ? { configured:true, connected:false, calendars:[] }
    : { configured:true, connected:true, calendars:[{ calendar_id:'me', summary:'davsorm@gmail.com', enabled:true, is_primary:true }, { calendar_id:'fam', summary:'Famiglia', enabled:true, is_primary:false }] };
  return {
    functions: {
      async invoke(name, { body }) {
        if (name === 'notion-sync') return { data: body.action === 'archive' ? { ok: true } : { ok: true, pushed: 1, imported: 0, remaining: 0 }, error: null };
        if (name === 'garmin-refresh') return { data: { status: 'started' }, error: null };
        if (body.action === 'status') return { data: gstate, error: null };
        if (body.action === 'events') return { data: { events: gstate.connected ? events : [] }, error: null };
        if (body.action === 'syncTask') return { data: { eventId: 'ev-' + body.taskId }, error: null };
        if (body.action === 'authUrl') return { data: { url: 'about:blank' }, error: null };
        return { data: { ok: true }, error: null };
      }
    },
    from: q,
    auth: {
      onAuthStateChange(cb){ setTimeout(()=>cb('INITIAL_SESSION', window.__NOSESSION ? null : session), 0); return { data:{ subscription:{ unsubscribe(){} } } }; },
      signOut: async()=>({}), signUp: async()=>({}), signInWithPassword: async()=>({})
    }
  };
}
