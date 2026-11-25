// Prueba de contrato del renderizador con un DOM mínimo en memoria.
// Detecta errores JS/IDs/datos; no sustituye una prueba visual en navegador.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
class Element {
  _value=''; innerHTML=''; textContent=''; style={}; children=[]; events={};
  get value(){return this._value;} set value(v){this._value=String(v);}
  constructor(id){this.id=id;}
  addEventListener(name,fn){this.events[name]=fn;}
  dispatchEvent(e){this.events[e.type]?.(e);}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this[k]=v;}
  scrollIntoView(){} focus(){}
  querySelector(selector){return this.events[selector] ||= new Element(selector);}
}
test('los cuatro módulos renderizan sus tres escenarios con el contrato HTML actual',async()=>{
  for(const [name,script,suffix,scenario,run,result] of [
    ['deterioro','app.js','','scenario','run','method-results'],
    ['detencion','detencion-app.js','-det','scenario-det','run-det','method-results-det'],
    ['viento','viento-app.js','-vin','scenario-vin','run-vin','method-results-vin'],
    ['sensores','sensores-app.js','-sen','scenario-sen','run-sen','method-results-sen']]) {
    const html=await readFile(name+'.html','utf8'),elements=new Map();
    for(const tag of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){
      const el=new Element(tag[1]);el.value=tag[0].match(/\bvalue="([^"]*)"/)?.[1]||'';elements.set(tag[1],el);
    }
    elements.get(scenario).value='normal';
    globalThis.document={getElementById:id=>{if(id==='account-history-list')return elements.get(id)||null;assert.ok(elements.has(id),name+': ID inexistente '+id);return elements.get(id);},querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
    await import('./'+script+'?contract=3');
    for(const s of ['normal','estres','mal']) {
      elements.get(scenario).value=s;elements.get(scenario).dispatchEvent(new Event('change'));
      const button=elements.get(run);if(button.onclick) await button.onclick();else button.events.click?.();
      const error=elements.get('error'+suffix).textContent;
      assert.equal(error,'',name+'/'+s+': '+error);
      assert.ok(elements.get(result).innerHTML.includes('<tr>'),name+'/'+s+': sin resultados');
      for(const [id,el] of elements) if(id.startsWith('chart'))assert.ok(!el.innerHTML.includes('NaN'),name+'/'+s+': gráfico '+id);
    }
  }
});
test('las páginas entregadas ejecutan sus paquetes clásicos sin servidor ni módulos ES',async()=>{
  for(const [page,scenario,result] of [['deterioro','scenario','method-results'],['detencion','scenario-det','method-results-det'],['viento','scenario-vin','method-results-vin'],['sensores','scenario-sen','method-results-sen'],['validacion','scenario-filter','methods']]) {
    const html=await readFile(page+'.html','utf8'),elements=new Map(),errors=[];
    assert.ok(!html.includes('type="module"'),page+': carga incompatible con file://');
    const script=html.match(/<script[^>]+src="(assets\/[^\"]+\.bundle\.js)"/)[1];
    for(const tag of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){const e=new Element(tag[1]);e.value=tag[0].match(/\bvalue="([^"]*)"/)?.[1]||'';elements.set(tag[1],e);}
    elements.get(scenario).value='normal';
    if(page==='validacion') {elements.get('case-filter').value='deterioro';elements.get('trace-metric').value='error';}
    const document={getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
    runInNewContext(await readFile(script,'utf8'),{document,performance,Event,setTimeout,URLSearchParams,console:{error:e=>errors.push(e.message)},location:{protocol:'file:',search:''}},{filename:script,timeout:5000});
    if(page==='validacion') {const deadline=Date.now()+2000;while(!elements.get('coverage').textContent&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(elements.get('coverage').textContent,'12/12');}
    assert.deepEqual(errors,[],page+': el paquete no pudo iniciar');
    assert.ok(elements.get(result).innerHTML.includes('<tr>'),page+': falta el ejemplo calculado');
    assert.ok(elements.get('demo-'+page).innerHTML.includes('data-scene'),page+': falta la vista del simulador');
    if(page!=='validacion') {elements.get('restore-'+page).onclick();assert.equal(elements.get(scenario).value,'normal');}
  }
});
test('los filtros de validación tienen opciones y enlace de simulador aun antes de ejecutar JavaScript',async()=>{
  const html=await readFile('validacion.html','utf8');
  for(const [id,count] of [['case-filter',4],['scenario-filter',3]]) {
    const select=html.match(new RegExp('<select id="'+id+'">([\\s\\S]*?)</select>'));
    assert.equal((select[1].match(/<option /g)||[]).length,count);
  }
  assert.match(html,/<a id="open-module"[^>]*href="deterioro.html#simulador"/);
});
test('la pestaña de validación presenta los 12 escenarios y cambia de selección',async()=>{
  const html=await readFile('validacion.html','utf8'),elements=new Map();
  for(const tag of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g))elements.set(tag[1],new Element(tag[1]));
  elements.get('case-filter').value='detencion';elements.get('scenario-filter').value='normal';elements.get('trace-metric').value='error';
  globalThis.document={getElementById:id=>{assert.ok(elements.has(id),'ID inexistente '+id);return elements.get(id);},querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  globalThis.requestAnimationFrame=fn=>setImmediate(fn);
  const page=await import('./validacion.js?contract=3');
  await page.ready;
  assert.equal(elements.get('coverage').textContent,'12/12');assert.equal(elements.get('references').textContent,'12/12');
  for(const caso of ['detencion','deterioro','viento','sensores'])for(const escenario of ['normal','estres','mal']) {
    elements.get('case-filter').value=caso;elements.get('scenario-filter').value=escenario;
    elements.get('case-filter').onchange();
    assert.ok(elements.get('methods').innerHTML.includes('<tr>'));
    assert.ok(elements.get('histories').innerHTML.includes('<details>'));
    assert.ok(elements.get('numerical-conclusion').textContent.length>40);
    assert.ok(!elements.get('error-chart').innerHTML.includes('NaN'));
  }
});
