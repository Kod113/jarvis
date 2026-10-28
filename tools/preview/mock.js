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
    { id:'e3', amount:10.99, description:'Spotify', category:'Abbonamenti', method:'manual', spent_at:new Date(Date.now()-864e5).toISOString() },
  ],
  health_daily: []
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
      else { data = table==='health_daily' ? null : JSON.parse(JSON.stringify(rows)); }
      return Promise.resolve({ data, error:null }).then(res, rej);
    }
  };
  return api;
}
export function createClient(){
  const session = { user:{ id:'u1', email:'test@example.com' } };
  return {
    from: q,
    auth: {
      onAuthStateChange(cb){ setTimeout(()=>cb('INITIAL_SESSION', window.__NOSESSION ? null : session), 0); return { data:{ subscription:{ unsubscribe(){} } } }; },
      signOut: async()=>({}), signUp: async()=>({}), signInWithPassword: async()=>({})
    }
  };
}
