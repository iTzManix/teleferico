import {windExact} from './numerics.js';
import {fmt,esc} from './render.js';
const active=new Map();
export function clearDemo(targetId) {
  active.get(targetId)?.stop();
  active.delete(targetId);
  document.getElementById(targetId)?.replaceChildren();
}
const cabin=(x,y,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 -49V-20" stroke="#53665c" stroke-width="4"/><rect x="-30" y="-20" width="60" height="45" rx="10" fill="#c87540"/><path d="M-22 -12H22V6H-22Z" fill="#d7ebed"/><path d="M0 -12V6M-22 12H22" stroke="#53665c" stroke-width="2"/></g>`;
export function renderDemo(caso,output,inputs,{targetId='demo-'+caso,preserveTime=false}={}) {
  const previous=preserveTime?active.get(targetId)?.playback():null;
  clearDemo(targetId);
  const host=document.getElementById(targetId);if(!host)return;
  let frameId;
  const stop=()=>{if(frameId!==undefined)cancelAnimationFrame(frameId);frameId=undefined;};
  const titles={detencion:'Del movimiento a la parada',deterioro:'El índice se acerca al umbral',viento:'Una fuerza, una respuesta oscilante',sensores:'Reconstruir lo que no se midió'};
  const descriptions={detencion:'Durante la reacción, la cabina conserva su velocidad. Después frena hasta detenerse. Mueve el tiempo para ver qué ocurre.',deterioro:'El rodamiento ilustra un índice educativo. El tiempo del control se expresa en meses, y el umbral no representa una falla real.',viento:'La cabina oscila alrededor del equilibrio del modelo. El dibujo amplifica el movimiento para hacerlo visible; los valores muestran metros reales.',sensores:'Los círculos naranjas son observaciones retiradas del entrenamiento. Se contrastan las predicciones con el valor verdadero, sin usarlo para ajustar.'};
  const end=caso==='detencion'?output.ref.tTotal:caso==='deterioro'?(output.crossing??10):caso==='viento'?output.ref.tEnd:inputs.b;
  const unit=caso==='deterioro'?'meses':'s';
  const start=caso==='sensores'?inputs.a:0;
  const previewTime=caso==='viento'?5:caso==='sensores'?(start+end)/2:end*.55;
  const initial=previous?Math.min(end,Math.max(start,previous.time)):previewTime;
  host.innerHTML=`<div class="demo-heading"><span class="demo-kicker">EJEMPLO INTERACTIVO</span><h3>${titles[caso]}</h3><p>${descriptions[caso]}</p></div><svg data-scene viewBox="0 0 640 210" role="img" aria-label="${esc(titles[caso])}"></svg><div class="demo-values" data-values aria-live="off"></div><label class="demo-time">Explorar tiempo <span data-clock></span><input data-time type="range" min="${start}" max="${end}" step="any" value="${initial}" aria-label="Tiempo del ejemplo en ${unit}"></label><div class="demo-controls"><button type="button" data-play>Reproducir ejemplo</button><button type="button" data-reset>Volver al inicio</button></div>`;
  const slider=host.querySelector('[data-time]'),svg=host.querySelector('[data-scene]'),values=host.querySelector('[data-values]'),clock=host.querySelector('[data-clock]');slider.value=initial;
  const chip=(name,value)=>`<div><span>${name}</span><strong>${value}</strong></div>`;
  // Una misma escala para las fuerzas habituales permite comparar amplitudes.
  const windExtent=caso==='viento'?Math.max(2,Math.ceil(Math.max(output.ref.xMax,Math.abs(inputs.F/inputs.k)))):0;
  function draw(t) {
    clock.textContent=fmt(t)+' '+unit;
    if(caso==='detencion') {
      const {v0,tr,a}=inputs,u=Math.min(Math.max(0,t-tr),v0/a),distance=v0*Math.min(t,tr)+v0*u-a*u*u/2,velocity=Math.max(0,v0-a*u),total=output.ref.dTotal;
      const extent=100*Math.max(1,Math.ceil(total/100)),sx=meters=>65+510*meters/extent,px=sx(distance),rx=sx(v0*tr);
      const phase=t>=end?'Detenida':t<=tr?'Reacción':'Frenado';
      svg.innerHTML=`<path d="M45 67H595" stroke="#86988b" stroke-width="3"/><path d="M65 158H575" stroke="#bdc6be" stroke-width="3"/><path d="M65 158H${rx}" stroke="#ddab62" stroke-width="9"/><path d="M${rx} 158H${sx(total)}" stroke="#428889" stroke-width="9"/><path d="M65 149V168M${rx} 149V168M${sx(total)} 149V168" stroke="#718078" stroke-width="2"/>${cabin(px,116)}<text x="65" y="191" font-size="14">0 m</text><text x="320" y="191" font-size="14" text-anchor="middle">Reacción · ${fmt(v0*tr)} m / Parada · ${fmt(total)} m</text><text x="575" y="191" font-size="14" text-anchor="end">${fmt(extent)} m</text>`;
      values.innerHTML=chip('Fase',phase)+chip('Velocidad',fmt(velocity)+' m/s')+chip('Distancia',fmt(distance)+' m');
    } else if(caso==='deterioro') {
      const [d,a,b]=output.ref,D=d+a*t+b*t*t,ratio=D>=inputs.threshold?1:inputs.threshold>0?Math.max(0,D/inputs.threshold):0,px=75+(end?500*t/end:0);
      svg.innerHTML=`<g transform="translate(120 90)"><circle r="56" fill="none" stroke="#8e9c93" stroke-width="13"/><circle r="29" fill="none" stroke="#428889" stroke-width="12"/>${Array.from({length:8},(_,i)=>{const q=i*Math.PI/4+t*.5;return `<circle cx="${42*Math.cos(q)}" cy="${42*Math.sin(q)}" r="6" fill="#c87540"/>`;}).join('')}</g><text x="235" y="68" font-size="17">D(t) = D₀ + αt + βt²</text><rect x="235" y="90" width="340" height="20" rx="10" fill="#b7c6bb"/><rect x="235" y="90" width="${340*ratio}" height="20" rx="10" fill="#c87540"/><text x="235" y="137" font-size="14">${fmt(D)} / ${fmt(inputs.threshold)} puntos</text><path d="M75 175H575" stroke="#8e9c93" stroke-width="3"/><circle cx="${px}" cy="175" r="7" fill="#c87540"/><text x="75" y="202" font-size="14">Inspección inicial</text><text x="575" y="202" text-anchor="end" font-size="14">${output.crossing===null?'Fin de la vista':'Umbral'} · ${fmt(end)} meses</text>`;
      values.innerHTML=chip('Índice D(t)',fmt(D)+' puntos')+chip('Umbral',fmt(inputs.threshold)+' puntos')+chip('Tiempo proyectado',output.crossing===null?'Sin cruce proyectado':fmt(output.crossing)+' meses');
    } else if(caso==='viento') {
      const displacement=windExact(inputs,t),x=320+240*displacement/windExtent,eq=320+240*(inputs.F/inputs.k)/windExtent;
      svg.innerHTML=`<path d="M70 35H570" stroke="#8e9c93" stroke-width="4"/><path d="M320 35L${x} 105" stroke="#53665c" stroke-width="4"/><path d="M320 42V184" stroke="#8e9c93" stroke-dasharray="5 5"/><path d="M${eq} 44V184" stroke="#428889" stroke-dasharray="4 5"/>${cabin(x,145,Math.max(-15,Math.min(15,displacement/windExtent*16)))}<text x="65" y="201" font-size="14">Escala lateral · ±${fmt(windExtent)} m</text><text x="${Math.min(535,eq)}" y="65" font-size="13" text-anchor="end">Equilibrio F/k</text>`;
      values.innerHTML=chip('Desplazamiento',fmt(displacement)+' m')+chip('Equilibrio',fmt(inputs.F/inputs.k)+' m')+chip('Fuerza constante',fmt(inputs.F)+' N');
    } else {
      const xs=output.grafica.t,lag=output.grafica.yLag,spl=output.grafica.ySpl,truth=output.grafica.yRef,limits=[...truth,...lag,...spl,...output.valores],min=Math.min(...limits),max=Math.max(...limits),sx=x=>55+535*(x-inputs.a)/(inputs.b-inputs.a),sy=y=>170-135*(y-min)/(max-min||1),index=Math.min(xs.length-1,Math.max(0,Math.round((t-inputs.a)/(inputs.b-inputs.a)*(xs.length-1))));
      const curve=(ys,color,dash='')=>`<polyline points="${xs.map((x,i)=>`${sx(x)},${sy(ys[i])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="${dash}"/>`;
      svg.innerHTML=curve(truth,'#739785','5 4')+curve(lag,'#c87540')+curve(spl,'#5b80b5')+output.nodos.map((x,i)=>`<circle cx="${sx(x)}" cy="${sy(output.valores[i])}" r="4" fill="#428889"/>`).join('')+output.withheld.map(x=>`<circle cx="${sx(x)}" cy="${sy(inputs.funcion==='sin'?Math.sin(x):Math.exp(-x))}" r="7" stroke="#c87540" stroke-width="2" fill="none"/>`).join('')+`<path d="M${sx(t)} 25V180" stroke="#7e8f84" stroke-dasharray="3 4"/><text x="55" y="202" font-size="13">Verde: verdad · Naranja: polinomio · Azul: spline · ○: dato oculto</text>`;
      values.innerHTML=chip('Datos utilizados',String(output.nodos.length))+chip('Datos ocultos',String(output.withheld.length))+chip('Valor reconstruido',fmt(lag[index]))+chip('Cruce del umbral',output.raiz.biseccion?.converged?fmt(output.raiz.biseccion.root)+' s':'Sin cruce');
    }
  }
  let playing=false,origin=0,last=initial;
  active.set(targetId,{stop,playback:()=>({time:last,playing})});
  const play=host.querySelector('[data-play]');
  slider.disabled=play.disabled=end<=start;
  slider.oninput=()=>{stop();playing=false;last=Number(slider.value);play.textContent='Reproducir ejemplo';draw(last);};
  host.querySelector('[data-reset]').onclick=()=>{stop();playing=false;last=start;slider.value=start;play.textContent='Reproducir ejemplo';draw(start);};
  function frame(now) {
    frameId=undefined;
    if(!playing)return;
    const t=Math.min(end,start+(now-origin)/1000*(end-start)/9);slider.value=t;last=t;draw(t);
    if(t<end)frameId=requestAnimationFrame(frame);else{playing=false;play.textContent='Repetir ejemplo';}
  }
  play.onclick=()=>{if(typeof requestAnimationFrame!=='function'||end<=start)return;playing=!playing;if(playing){if(last>=end)last=start;origin=performance.now()-(last-start)/(end-start)*9000;play.textContent='Pausar';frameId=requestAnimationFrame(frame);}else{stop();play.textContent='Continuar';}};
  draw(initial);
  if(previous?.playing && initial<end)play.onclick();
}
