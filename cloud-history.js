// Adaptador de nube: DER transaccional y compatibilidad con el esquema previo.
import {database} from './db.js';
import {experiment,VERSION,CASES} from './experiments.js';
import {esc,fmt} from './render.js';
export function cloudPayload(report) {
  // JSON no admite Infinity/NaN: se preservan como texto; no se convierten en cero.
  return JSON.parse(JSON.stringify({caso:report.caso,scenario:report.scenario,inputs:report.inputs,version:report.version,
    reference:report.reference,conclusions:report.conclusions,sensitivity:report.sensitivity,methods:report.methods},
    (_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value));
}
export const missingRpc=error=>error?.code==='PGRST202'||error?.code==='42883';
export function canonicalJson(value) {
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
async function authenticated(db) {
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user)throw Error('Inicia sesión para guardar o recuperar tus experimentos.');
  return data.user;
}
export async function saveCloudExperiment(report,requestId,dbOverride) {
  const db=dbOverride||await database(),user=await authenticated(db),payload=cloudPayload(report);
  const {data,error}=await db.rpc('simtele_guardar',{p_experimento:payload,p_solicitud:requestId});
  if(!error)return {id:data,storage:'der',version:payload.version};
  // Solo se usa el esquema anterior si la RPC realmente no existe.
  // Un timeout o error de permisos nunca dispara una segunda escritura alternativa.
  if(!missingRpc(error))throw Error(error.message||'No se pudo guardar el experimento. Reintenta la misma solicitud.');
  const snapshot=JSON.parse(JSON.stringify({...report.output,_simtele_meta:{reference:payload.reference,conclusions:payload.conclusions}},
    (_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value));
  const row={id:requestId,user_id:user.id,caso:payload.caso,escenario:payload.scenario,entradas:payload.inputs,resultados:snapshot,version_modelo:payload.version};
  const result=await db.from('simulaciones').insert(row).select('id').single();
  if(result.error?.code==='23505') {
    const found=await db.from('simulaciones').select('id,user_id,caso,escenario,entradas,resultados,version_modelo').eq('id',requestId).single();
    if(!found.error&&found.data&&canonicalJson(found.data)===canonicalJson(row))return {id:requestId,storage:'legacy',version:payload.version};
  }
  if(result.error)throw Error(result.error.message);
  return {id:result.data.id,storage:'legacy',version:payload.version};
}
export async function listCloudExperiments(caso,dbOverride) {
  const db=dbOverride||await database();await authenticated(db);
  const sync=await db.rpc('simtele_importar_anteriores');
  if(sync.error&&!missingRpc(sync.error))throw Error(sync.error.message);
  if(!sync.error){
    const {data,error}=await db.rpc('simtele_listar',{p_caso:caso||null,p_limite:30});
    if(error)throw Error(error.message);
    return (data||[]).map(row=>({...row,storage:'der'}));
  }
  let query=db.from('simulaciones').select('id,caso,escenario,entradas,creado_en,version_modelo');
  if(caso)query=query.eq('caso',caso);
  const {data,error}=await query.order('creado_en',{ascending:false}).limit(30);
  if(error)throw Error(error.message);
  return (data||[]).map(row=>({...row,storage:'legacy'}));
}
export async function loadCloudExperiment(row,dbOverride) {
  const db=dbOverride||await database();await authenticated(db);
  if(row.storage==='der') {
    const {data,error}=await db.rpc('simtele_recuperar',{p_id:row.id});
    if(error)throw Error(error.message);
    if(!data||!Array.isArray(data.methods))throw Error('El experimento recuperado está incompleto.');
    return data;
  }
  const {data,error}=await db.from('simulaciones').select('*').eq('id',row.id).single();
  if(error)throw Error(error.message);
  const raw=data.resultados;
  return {id:data.id,caso:data.caso,scenario:data.escenario,inputs:data.entradas,version:data.version_modelo||'1',createdAt:data.creado_en,
    methods:Array.isArray(raw)?raw:(raw?.results||raw?.resultados||[]),reference:raw?._simtele_meta?.reference||raw?.ref,original:raw};
}
export function compareCloudSnapshot(saved,current) {
  const stable=xs=>JSON.stringify(xs,(_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value);
  const values=methods=>methods.map(m=>[m.name,m.value??m.x??m.valor]);
  return {sameVersion:saved.version===current.version,sameValues:stable(values(saved.methods))===stable(values(cloudPayload(current).methods))};
}
export function mountCloudHistory(caso,getInputs,restore) {
  const save=document.getElementById('save'),history=document.getElementById('history'),list=document.getElementById('history-list');
  const accountList=document.getElementById('account-history-list');
  const msg=text=>document.querySelectorAll('[data-msg], #account-message, #save-message').forEach(el=>el.textContent=text);
  const snapshot=document.createElement('section');snapshot.className='panel cloud-snapshot';snapshot.hidden=true;
  document.getElementById('simulador').append(snapshot);
  let pending=null;
  save.onclick=async()=>{
    if(save.disabled)return;save.disabled=true;
    try {
      const inputs=getInputs(),report=experiment(caso,inputs.scenario,inputs),body=JSON.stringify(cloudPayload(report));
      if(!pending||pending.body!==body)pending={body,id:crypto.randomUUID()};
      const result=await saveCloudExperiment(report,pending.id);pending=null;
      msg(`Experimento ${result.id} guardado · modelo ${result.version} · ${result.storage==='der'?'DER de Supabase':'esquema anterior compatible (migración del DER pendiente)'}.`);
    }catch(e){msg(e.message);}finally{save.disabled=false;}
  };
  async function showSaved(row) {
    const saved=await loadCloudExperiment(row);snapshot.hidden=false;
    snapshot.innerHTML=`<h3>Resultado original guardado · ${esc(CASES[saved.caso]||saved.caso)}</h3><p>Experimento ${esc(saved.id)} · versión ${esc(saved.version)}. Este snapshot no se recalcula al abrirlo.</p><div class="table-wrap"><table><thead><tr><th>Método</th><th>Valor guardado</th><th>Error absoluto guardado</th><th>Residuo guardado</th></tr></thead><tbody>${saved.methods.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.value??m.x??m.valor)}</td><td>${fmt(m.errorAbs??m.error)}</td><td>${fmt(m.residuo??m.residual)}</td></tr>`).join('')}</tbody></table></div>`;
    msg(`Recuperado ${saved.id}: ${saved.methods.length} métodos originales, modelo ${saved.version}.`);
    return saved;
  }
  history.onclick=async()=>{
    if(history.disabled)return;history.disabled=true;
    try {
      const rows=await listCloudExperiments(caso);list.replaceChildren();accountList?.replaceChildren();
      for(const row of rows) {
        const li=document.createElement('li'),open=document.createElement('button'),repeat=document.createElement('button');
        open.textContent=`${new Date(row.creado_en).toLocaleString('es-BO')} · ${row.escenario} · v${row.version_modelo} · Ver guardado`;
        open.onclick=()=>showSaved(row).catch(e=>msg(e.message));repeat.textContent='Repetir entradas';
        repeat.onclick=async()=>{try{const saved=await showSaved(row);restore({...saved.inputs,scenario:saved.scenario});const current=experiment(caso,saved.scenario,{...saved.inputs,scenario:saved.scenario}),check=compareCloudSnapshot(saved,current);
          msg(`Experimento ${row.id} recuperado y repetido. ${check.sameVersion?(check.sameValues?'La misma versión reproduce los valores guardados.':'La misma versión produjo diferencias: revisa las entradas.'): 'Versión guardada '+saved.version+'; actual '+VERSION+'. Las diferencias deben interpretarse como cambio de modelo.'}`);
        }catch(e){msg(e.message);}};
        li.append(open,repeat);list.append(li);
        if(accountList){const extra=document.createElement('li'),button=document.createElement('button');button.textContent=open.textContent;button.onclick=open.onclick;extra.append(button);accountList.append(extra);}
      }
      msg(rows.length?`${rows.length} experimentos de ${CASES[caso]} recuperados.`:'No hay experimentos guardados para este caso.');
    }catch(e){msg(e.message);}finally{history.disabled=false;}
  };
}
