import {test} from 'node:test';
import assert from 'node:assert/strict';
import {experiment} from './experiments.js';
import {cloudPayload,saveCloudExperiment,listCloudExperiments,loadCloudExperiment,compareCloudSnapshot} from './cloud-history.js';
const request='11111111-1111-4111-8111-111111111111';
const absent={code:'PGRST202',message:'Function not found'};
function mockDb({rpc=async()=>({data:null,error:absent}),signedIn=true,rows=[],insertError=null}={}) {
  const calls=[],inserted=[];
  return {calls,inserted,
    auth:{getUser:async()=>({data:{user:signedIn?{id:'verified-owner'}:null},error:null})},
    rpc:async(name,args)=>{calls.push({name,args});return rpc(name,args);},
    from(table){calls.push({table});const filters=[];let insert=null;
      return {insert(row){insert=row;inserted.push(row);return this;},select(fields){calls.push({fields});return this;},
        eq(key,value){filters.push([key,value]);calls.push({filter:[key,value]});return this;},order(){return this;},
        async single(){return insert?{data:insertError?null:{id:insert.id},error:insertError}:{data:rows.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null};},
        async limit(){return {data:rows.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null};}};
    }
  };
}
test('payload de nube conserva desbordamientos y excluye salida duplicada',()=>{
  const r=experiment('deterioro','mal'),p=cloudPayload(r);
  assert.equal(p.version,'3.0.0');assert.ok(!('output' in p));assert.equal(p.methods.find(m=>m.name==='Jacobi').converged,false);
  assert.doesNotThrow(()=>JSON.stringify(p));assert.equal(typeof p.methods.find(m=>m.name==='Jacobi').errorAbs,'string');
});
test('guardado DER usa una sola RPC, solicitud estable y propietario de la sesión',async()=>{
  const r=experiment('detencion','normal'),db=mockDb({rpc:async()=>({data:41,error:null})});
  const saved=await saveCloudExperiment(r,request,db);assert.equal(saved.id,41);assert.equal(saved.storage,'der');assert.equal(db.inserted.length,0);
  assert.equal(db.calls[0].name,'simtele_guardar');assert.equal(db.calls[0].args.p_solicitud,request);assert.deepEqual(db.calls[0].args.p_experimento,cloudPayload(r));
  assert.ok(!('user_id' in db.calls[0].args.p_experimento));
});
test('esquema anterior sigue guardando referencia, versión y valores originales si falta la migración',async()=>{
  const r=experiment('sensores','normal'),db=mockDb();
  const saved=await saveCloudExperiment(r,request,db);assert.equal(saved.storage,'legacy');
  assert.equal(db.inserted[0].user_id,'verified-owner');assert.equal(db.inserted[0].id,request);assert.equal(db.inserted[0].version_modelo,r.version);
  assert.deepEqual(db.inserted[0].resultados.resultados,cloudPayload(r).methods);
});
test('errores de permisos y respuestas inciertas nunca provocan escritura alternativa',async()=>{
  for(const error of [{code:'42501',message:'Denied'},{code:'NETWORK',message:'Timeout'}]) {
    const db=mockDb({rpc:async()=>({data:null,error})});await assert.rejects(()=>saveCloudExperiment(experiment('detencion','normal'),request,db));assert.equal(db.inserted.length,0);
  }
});
test('un reintento legado con la misma solicitud acepta solo el mismo contenido',async()=>{
  const r=experiment('detencion','normal'),original=mockDb();await saveCloudExperiment(r,request,original);
  const db=mockDb({rows:original.inserted,insertError:{code:'23505',message:'Duplicate'}});
  assert.equal((await saveCloudExperiment(r,request,db)).id,request);
  await assert.rejects(()=>saveCloudExperiment(experiment('detencion','estres'),request,db));
});
test('historial DER sincroniza versiones anteriores y filtra por caso',async()=>{
  const db=mockDb({rpc:async(name,args)=>name==='simtele_importar_anteriores'?{data:0,error:null}:{data:[{id:7,caso:args.p_caso}],error:null}});
  const rows=await listCloudExperiments('viento',db);assert.equal(rows[0].storage,'der');assert.equal(db.calls[0].name,'simtele_importar_anteriores');assert.deepEqual(db.calls[1].args,{p_caso:'viento',p_limite:30});
});
test('historial legado filtra el caso y recupera el snapshot sin recalcular',async()=>{
  const rows=[{id:request,caso:'detencion',escenario:'normal',entradas:{v0:99},version_modelo:'1',resultados:{resultados:[{name:'Histórico',value:-11,history:[]}]}}];
  const db=mockDb({rows}),list=await listCloudExperiments('detencion',db),saved=await loadCloudExperiment(list[0],db);
  assert.equal(saved.methods[0].value,-11);assert.deepEqual(saved.inputs,{v0:99});assert.equal(saved.version,'1');
  assert.ok(db.calls.some(c=>c.filter?.[0]==='caso'&&c.filter[1]==='detencion'));
});
test('sin sesión no se consulta ni se modifica el historial remoto',async()=>{
  const db=mockDb({signedIn:false});await assert.rejects(()=>saveCloudExperiment(experiment('detencion','normal'),request,db));
  await assert.rejects(()=>listCloudExperiments('detencion',db));await assert.rejects(()=>loadCloudExperiment({id:1,storage:'der'},db));assert.equal(db.calls.length,0);
});
test('la recuperación DER conserva métodos e iteraciones y diferencia cambio de versión',async()=>{
  const r=experiment('detencion','normal'),p=cloudPayload(r),db=mockDb({rpc:async()=>({data:{...p,id:9},error:null})});
  const saved=await loadCloudExperiment({id:9,storage:'der'},db);assert.deepEqual(saved.methods,p.methods);assert.equal(compareCloudSnapshot(saved,r).sameValues,true);
  assert.equal(compareCloudSnapshot({...saved,version:'1'},r).sameVersion,false);
});
