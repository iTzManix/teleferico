// Paquetes clásicos para abrir las páginas tanto por HTTP como por file://.
// Las fuentes siguen siendo módulos ES; este empaquetador admite únicamente
// las importaciones/exportaciones explícitas que usa este proyecto sin dependencias.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {posix} from 'node:path';
const entries=['app.js','detencion-app.js','viento-app.js','sensores-app.js','validacion.js'];
const resolve=(from,spec)=>{if(!spec.startsWith('./')&&!spec.startsWith('../'))throw Error('Import estático externo no admitido: '+spec);return posix.normalize(posix.join(posix.dirname(from),spec));};
export async function bundle(entry) {
  const modules=new Map();
  async function visit(id) {
    if(modules.has(id))return;
    modules.set(id,'');let code=await readFile(id,'utf8'),dependencies=[];
    code=code.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm,(_all,names,spec)=>{
      const dep=resolve(id,spec);dependencies.push(dep);
      return 'const {'+names.replace(/\s+as\s+/g,':')+'} = load('+JSON.stringify(dep)+');';
    });
    code=code.replace(/^export\s+\*\s+from\s*['"]([^'"]+)['"];?\s*$/gm,(_all,spec)=>{
      const dep=resolve(id,spec);dependencies.push(dep);return 'Object.assign(exports,load('+JSON.stringify(dep)+'));';
    });
    const names=[];
    code=code.replace(/\bexport\s+((?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*))/g,(_all,declaration,name)=>{names.push(name);return declaration;});
    if(/^\s*(?:import\s+(?!\()|export\s+)/m.test(code))throw Error('Sintaxis de módulos sin empaquetar: '+id);
    modules.set(id,code+'\nObject.assign(exports,{'+names.join(',')+'});');
    for(const dep of dependencies)await visit(dep);
  }
  await visit(entry);
  return `// Generado por npm run build. Editar las fuentes, no este archivo.\n(()=>{'use strict';\nconst modules={\n${[...modules].map(([id,code])=>JSON.stringify(id)+':(exports,load)=>{\n'+code+'\n}').join(',\n')}\n};\nconst cache={};function load(id){if(cache[id])return cache[id];const exports=cache[id]={};modules[id](exports,load);return exports;}\ntry{load(${JSON.stringify(entry)});}catch(error){console.error(error);const status=document.getElementById('suite-status')||document.getElementById('app-load-status');if(status){status.hidden=false;status.textContent='No se pudo iniciar la página: '+error.message;}}\n})();\n`;
}
await mkdir('assets',{recursive:true});
for(const entry of entries)await writeFile('assets/'+entry.replace('.js','.bundle.js'),await bundle(entry));
console.log('Cinco páginas empaquetadas para HTTP y apertura local.');
