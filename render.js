export const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=n=>Array.isArray(n)?'['+n.map(fmt).join('; ')+']':typeof n==='number'?(Number.isFinite(n)?(n===0?'0':Math.abs(n)<.001||Math.abs(n)>1e5?n.toExponential(3):Number(n.toPrecision(6)).toString()):'no finito'):n==null?'—':esc(n);
export function historyTable(methods) {
  return methods.map(m=>{
    const rows=m.history||[],keys=['iteration','h','n','t','value','reference','x','c','residual','error'].filter(k=>rows.some(r=>r[k]!==undefined));
    const labels={iteration:'Paso / iteración',h:'h',n:'Subintervalos',t:'t',value:'Aproximación',reference:'Referencia',x:'x',c:'Punto medio',residual:'Residuo',error:'Error absoluto'};
    return `<details><summary>${esc(m.name)} · ${rows.length} registros · ${m.converged?'criterio satisfecho / calculado':'no convergió'}</summary>${rows.length?`<div class="table-wrap"><table><thead><tr>${keys.map(k=>`<th>${labels[k]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${fmt(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p>Método directo sin iteraciones. Consulte el resultado y su error.</p>'}</details>`;
  }).join('');
}
export function lineChart(svg,series,{xLabel='Iteración / refinamiento',yLabel='Error absoluto (escala log₁₀)',log=true,yDomain=[]}={}) {
  const colors=['#d77d48','#49a4c7','#8c75d6','#579361'],W=760,H=290,L=80,R=20,T=24,B=52;
  const points=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(!points.length){svg.innerHTML='<text x="20" y="40" fill="currentColor">Sin registros finitos para esta métrica.</text>';return;}
  const transform=y=>log?Math.log10(Math.max(1e-16,Math.abs(y))):y;
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const p of points){const y=transform(p.y);xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  for(const value of yDomain){ymin=Math.min(ymin,transform(value));ymax=Math.max(ymax,transform(value));}
  if(xmax===xmin)xmax=xmin+1;
  if(ymax===ymin){ymin-=1;ymax+=1;}
  const sx=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),sy=y=>H-B-(transform(y)-ymin)/(ymax-ymin)*(H-T-B);
  let html='';for(let i=0;i<=4;i++){const y=T+i*(H-T-B)/4,label=ymax-i*(ymax-ymin)/4;html+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="${L-8}" y="${y+5}" text-anchor="end" fill="currentColor" font-size="13">${log?'10^'+label.toFixed(1):fmt(Number(label.toPrecision(3)))}</text>`;}
  for(let i=0;i<=4;i++){const x=xmin+i*(xmax-xmin)/4;html+=`<text x="${sx(x)}" y="${H-B+22}" text-anchor="middle" fill="currentColor" font-size="13">${x.toPrecision(3)}</text>`;}
  for(const [i,s] of series.entries()){const ps=s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));html+=`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="2.5" points="${ps.map(p=>`${sx(p.x)},${sy(p.y)}`).join(' ')}"/>`;if(ps.length<20)html+=ps.map(p=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3" fill="${colors[i%4]}"/>`).join('');}
  html+=`<text x="${L}" y="15" fill="currentColor" font-size="13">${esc(yLabel)}</text><text x="${W/2}" y="${H-6}" text-anchor="middle" fill="currentColor" font-size="13">${esc(xLabel)}</text>`;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=html;
}
