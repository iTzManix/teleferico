-- Migración aditiva. No borra ni modifica los registros de public.simulaciones.
-- Aplicar como una migración transaccional; la tabla original sigue atendiendo la versión publicada.
create table public.usuario (
 id integer generated always as identity primary key,
 auth_uid uuid not null unique references auth.users(id) on delete cascade,
 nombre text not null default 'Participante'
);
create table public.caso_estudio (
 id integer generated always as identity primary key,
 codigo text not null unique check(codigo in ('detencion','deterioro','viento','sensores')),
 nombre text not null, version_modelo text not null
);
create table public.escenario (
 id integer generated always as identity primary key,
 caso_id integer not null references public.caso_estudio(id),
 tipo text not null check(tipo in ('normal','estres','mal')),
 descripcion text not null, parametros_base_json jsonb not null, fuente_datos text,
 unique(caso_id,tipo)
);
create table public.simulacion (
 id integer generated always as identity primary key,
 usuario_id integer not null references public.usuario(id) on delete cascade,
 escenario_id integer not null references public.escenario(id),
 fecha timestamptz not null default now(), parametros_entrada_json jsonb not null,
 version_modelo text not null, estado text not null check(estado in ('guardado','importado')),
 solicitud_id uuid not null, huella_solicitud text not null,
 legacy_id uuid unique references public.simulaciones(id) on delete set null,
 metadatos_json jsonb not null default '{}'::jsonb,
 resultado_original_json jsonb,
 unique(usuario_id,solicitud_id)
);
create table public.ejecucion_metodo (
 id integer generated always as identity primary key,
 simulacion_id integer not null references public.simulacion(id) on delete cascade,
 metodo text not null, tolerancia double precision check(tolerancia>0),
 paso double precision check(paso>0), max_iteraciones integer check(max_iteraciones>0),
 convergio boolean not null, tiempo_ms double precision check(tiempo_ms>=0),
 unique(simulacion_id,metodo)
);
create table public.iteracion_resultado (
 id integer generated always as identity primary key,
 ejecucion_id integer not null references public.ejecucion_metodo(id) on delete cascade,
 numero integer not null check(numero>0), aproximacion_json jsonb not null,
 residual double precision, error_absoluto double precision, error_relativo double precision,
 unique(ejecucion_id,numero)
);
create table public.resultado_resumen (
 id integer generated always as identity primary key,
 ejecucion_id integer not null unique references public.ejecucion_metodo(id) on delete cascade,
 valor_json jsonb not null, referencia_json jsonb not null,
 metricas_error_json jsonb not null, interpretacion text not null,
 metodo_snapshot_json jsonb not null
);
create index escenario_caso_idx on public.escenario(caso_id);
create index simulacion_usuario_fecha_idx on public.simulacion(usuario_id,fecha desc,id desc);
create index simulacion_escenario_idx on public.simulacion(escenario_id);
create index if not exists simulaciones_usuario_fecha_idx on public.simulaciones(user_id,creado_en desc);
-- Los UNIQUE cubren las demás claves foráneas por su primera columna.
alter table public.usuario enable row level security;
alter table public.caso_estudio enable row level security;
alter table public.escenario enable row level security;
alter table public.simulacion enable row level security;
alter table public.ejecucion_metodo enable row level security;
alter table public.iteracion_resultado enable row level security;
alter table public.resultado_resumen enable row level security;
-- Revoca privilegios heredados SOLO en las tablas y secuencias nuevas.
revoke all on public.usuario,public.caso_estudio,public.escenario,public.simulacion,public.ejecucion_metodo,public.iteracion_resultado,public.resultado_resumen from public,anon,authenticated;
revoke all on sequence public.usuario_id_seq,public.caso_estudio_id_seq,public.escenario_id_seq,public.simulacion_id_seq,public.ejecucion_metodo_id_seq,public.iteracion_resultado_id_seq,public.resultado_resumen_id_seq from public,anon,authenticated;
grant select on public.caso_estudio,public.escenario to authenticated;
grant select,insert on public.usuario,public.simulacion,public.ejecucion_metodo,public.iteracion_resultado,public.resultado_resumen to authenticated;
grant usage on sequence public.usuario_id_seq,public.simulacion_id_seq,public.ejecucion_metodo_id_seq,public.iteracion_resultado_id_seq,public.resultado_resumen_id_seq to authenticated;
create policy casos_lectura on public.caso_estudio for select to authenticated using(true);
create policy escenarios_lectura on public.escenario for select to authenticated using(true);
create policy usuario_lectura on public.usuario for select to authenticated using(auth_uid=(select auth.uid()));
create policy usuario_alta on public.usuario for insert to authenticated with check(auth_uid=(select auth.uid()));
create policy simulacion_lectura on public.simulacion for select to authenticated using(usuario_id in (select u.id from public.usuario u where u.auth_uid=(select auth.uid())));
create policy simulacion_alta on public.simulacion for insert to authenticated with check(usuario_id in (select u.id from public.usuario u where u.auth_uid=(select auth.uid())));
create policy ejecucion_lectura on public.ejecucion_metodo for select to authenticated using(exists(select 1 from public.simulacion s where s.id=simulacion_id));
create policy ejecucion_alta on public.ejecucion_metodo for insert to authenticated with check(exists(select 1 from public.simulacion s where s.id=simulacion_id));
create policy iteracion_lectura on public.iteracion_resultado for select to authenticated using(exists(select 1 from public.ejecucion_metodo e where e.id=ejecucion_id));
create policy iteracion_alta on public.iteracion_resultado for insert to authenticated with check(exists(select 1 from public.ejecucion_metodo e where e.id=ejecucion_id));
create policy resumen_lectura on public.resultado_resumen for select to authenticated using(exists(select 1 from public.ejecucion_metodo e where e.id=ejecucion_id));
create policy resumen_alta on public.resultado_resumen for insert to authenticated with check(exists(select 1 from public.ejecucion_metodo e where e.id=ejecucion_id));

create function public.simtele_numero(p_valor jsonb) returns double precision
language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(p_valor)='number' then (p_valor#>>'{}')::double precision else null end
$$;
revoke all on function public.simtele_numero(jsonb) from public,anon;
grant execute on function public.simtele_numero(jsonb) to authenticated;

-- Toda la escritura del experimento es una sola transacción (RPC).
-- Reintentos con la misma solicitud no duplican filas ni cambian un snapshot.
create function public.simtele_guardar(p_experimento jsonb,p_solicitud uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare
 uid uuid:=auth.uid(); profile_id integer; scenario_id integer; simulation_id integer; execution_id integer;
 payload jsonb:=p_experimento; legacy public.simulaciones%rowtype; legacy_uuid uuid;
 methods jsonb; method jsonb; history_row jsonb; position integer; total_rows integer:=0;
 fingerprint text:=md5(p_experimento::text); previous_fingerprint text; initial_date timestamptz:=now();
 original jsonb; state text:='guardado';
begin
 if uid is null then raise exception 'Inicia sesión para guardar.' using errcode='42501'; end if;
 if p_solicitud is null or jsonb_typeof(payload) is distinct from 'object' then raise exception 'Solicitud inválida.' using errcode='22023'; end if;
 -- Importación de un registro anterior: siempre se lee su snapshot real y se verifica propietario.
 if payload ? 'legacy_id' then
  select s.* into legacy from public.simulaciones s where s.id=(payload->>'legacy_id')::uuid and s.user_id=uid;
  if not found then raise exception 'Experimento anterior no disponible.' using errcode='42501'; end if;
  legacy_uuid:=legacy.id; original:=legacy.resultados; state:='importado'; initial_date:=legacy.creado_en;
  methods:=case when jsonb_typeof(original)='array' then original else coalesce(original->'results',original->'resultados','[]'::jsonb) end;
  payload:=jsonb_build_object('caso',legacy.caso,'scenario',legacy.escenario,'inputs',legacy.entradas,
   'version',legacy.version_modelo,'methods',methods,'reference',coalesce(original->'_simtele_meta'->'reference',original->'ref'),
   'conclusions',coalesce(original->'_simtele_meta'->'conclusions',jsonb_build_object('numerical','Resultado histórico conservado sin recalcular.','problem','Interpretar según la versión original; puede diferir del modelo actual.')));
 end if;
 methods:=payload->'methods';
 if jsonb_typeof(payload->'inputs') is distinct from 'object' or jsonb_typeof(methods) is distinct from 'array' or
    jsonb_array_length(methods) not between 1 and 30 or length(coalesce(payload->>'version','')) not between 1 and 40 or
    octet_length(payload::text)>5000000 then raise exception 'Entradas, versión o métodos inválidos.' using errcode='22023'; end if;
 select e.id into scenario_id from public.escenario e join public.caso_estudio c on c.id=e.caso_id
 where c.codigo=payload->>'caso' and e.tipo=payload->>'scenario';
 if scenario_id is null then raise exception 'Caso o escenario desconocido.' using errcode='22023'; end if;
 insert into public.usuario(auth_uid,nombre) values(uid,'Participante') on conflict(auth_uid) do nothing;
 select u.id into profile_id from public.usuario u where u.auth_uid=uid;
 insert into public.simulacion(usuario_id,escenario_id,fecha,parametros_entrada_json,version_modelo,estado,solicitud_id,huella_solicitud,legacy_id,metadatos_json,resultado_original_json)
 values(profile_id,scenario_id,initial_date,payload->'inputs',payload->>'version',state,p_solicitud,fingerprint,legacy_uuid,
  jsonb_build_object('reference',payload->'reference','conclusions',payload->'conclusions','sensitivity',payload->'sensitivity'),original)
 on conflict(usuario_id,solicitud_id) do nothing returning id into simulation_id;
 if simulation_id is null then
  select s.id,s.huella_solicitud into simulation_id,previous_fingerprint from public.simulacion s where s.usuario_id=profile_id and s.solicitud_id=p_solicitud;
  if fingerprint is distinct from previous_fingerprint then raise exception 'La solicitud ya pertenece a otro contenido.' using errcode='22023'; end if;
  return simulation_id;
 end if;
 for method in select value from jsonb_array_elements(methods) loop
  if jsonb_typeof(method) is distinct from 'object' or length(coalesce(method->>'name','')) not between 1 and 200 or
     jsonb_typeof(coalesce(method->'history','[]'::jsonb)) is distinct from 'array' then raise exception 'Método inválido.' using errcode='22023'; end if;
  total_rows:=total_rows+jsonb_array_length(coalesce(method->'history','[]'::jsonb));
  if total_rows>30000 then raise exception 'Demasiadas iteraciones.' using errcode='22023'; end if;
  insert into public.ejecucion_metodo(simulacion_id,metodo,tolerancia,paso,max_iteraciones,convergio,tiempo_ms)
  values(simulation_id,method->>'name',public.simtele_numero(payload->'inputs'->'tolerance'),public.simtele_numero(payload->'inputs'->'h'),
   case when method->>'name'~'Jacobi|Gauss|Gradiente|Bisección|Newton \(tiempo\)|Secante' then 1000 end,
   coalesce((method->>'converged')::boolean,false),null) returning id into execution_id;
  insert into public.resultado_resumen(ejecucion_id,valor_json,referencia_json,metricas_error_json,interpretacion,metodo_snapshot_json)
  values(execution_id,coalesce(method->'value',method->'x',method->'valor','null'::jsonb),coalesce(method->'reference',payload->'reference','null'::jsonb),
   jsonb_build_object('absolute',coalesce(method->'errorAbs',method->'error'),'relative',coalesce(method->'errorRel',method->'relativeError'),
   'percent',method->'errorPct','residual',coalesce(method->'residuo',method->'residual')),
   coalesce(payload->'conclusions'->>'numerical','')||E'\n'||coalesce(payload->'conclusions'->>'problem',''),method-'history');
  position:=0;
  for history_row in select value from jsonb_array_elements(coalesce(method->'history','[]'::jsonb)) loop
   position:=position+1;
   if jsonb_typeof(history_row) is distinct from 'object' then raise exception 'Iteración inválida.' using errcode='22023'; end if;
   insert into public.iteracion_resultado(ejecucion_id,numero,aproximacion_json,residual,error_absoluto,error_relativo)
   values(execution_id,position,history_row,public.simtele_numero(history_row->'residual'),public.simtele_numero(history_row->'error'),public.simtele_numero(history_row->'relativeError'));
  end loop;
 end loop;
 return simulation_id;
end $$;
revoke all on function public.simtele_guardar(jsonb,uuid) from public,anon;
grant execute on function public.simtele_guardar(jsonb,uuid) to authenticated;

-- Sincroniza registros hechos desde la aplicación anterior, sin tocar el original.
create function public.simtele_importar_anteriores() returns integer
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); row_id uuid; imported integer:=0;
begin
 if uid is null then raise exception 'Inicia sesión para consultar el historial.' using errcode='42501'; end if;
 for row_id in select s.id from public.simulaciones s where s.user_id=uid and not exists(select 1 from public.simulacion n where n.legacy_id=s.id) order by s.creado_en loop
  perform public.simtele_guardar(jsonb_build_object('legacy_id',row_id),row_id); imported:=imported+1;
 end loop;
 return imported;
end $$;
revoke all on function public.simtele_importar_anteriores() from public,anon;
grant execute on function public.simtele_importar_anteriores() to authenticated;

create function public.simtele_listar(p_caso text default null,p_limite integer default 30)
returns table(id integer,caso text,escenario text,entradas jsonb,creado_en timestamptz,version_modelo text,estado text,legacy_id uuid,metodos bigint)
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión para consultar el historial.' using errcode='42501'; end if;
 if p_limite not between 1 and 100 or p_limite is null then raise exception 'Límite inválido.' using errcode='22023'; end if;
 return query select s.id,c.codigo,e.tipo,s.parametros_entrada_json,s.fecha,s.version_modelo,s.estado,s.legacy_id,
  (select count(*) from public.ejecucion_metodo m where m.simulacion_id=s.id)
 from public.simulacion s join public.escenario e on e.id=s.escenario_id join public.caso_estudio c on c.id=e.caso_id
 where p_caso is null or c.codigo=p_caso order by s.fecha desc,s.id desc limit p_limite;
end $$;
revoke all on function public.simtele_listar(text,integer) from public,anon;
grant execute on function public.simtele_listar(text,integer) to authenticated;

create function public.simtele_recuperar(p_id integer) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión para recuperar el experimento.' using errcode='42501'; end if;
 select jsonb_build_object('id',s.id,'caso',c.codigo,'scenario',e.tipo,'inputs',s.parametros_entrada_json,'version',s.version_modelo,
  'createdAt',s.fecha,'state',s.estado,'legacy_id',s.legacy_id,'reference',s.metadatos_json->'reference','conclusions',s.metadatos_json->'conclusions',
  'original',s.resultado_original_json,'methods',coalesce((select jsonb_agg(r.metodo_snapshot_json||jsonb_build_object('history',
   coalesce((select jsonb_agg(i.aproximacion_json order by i.numero) from public.iteracion_resultado i where i.ejecucion_id=m.id),'[]'::jsonb)) order by m.id)
   from public.ejecucion_metodo m join public.resultado_resumen r on r.ejecucion_id=m.id where m.simulacion_id=s.id),'[]'::jsonb))
 into snapshot from public.simulacion s join public.escenario e on e.id=s.escenario_id join public.caso_estudio c on c.id=e.caso_id where s.id=p_id;
 if snapshot is null then raise exception 'Experimento no disponible.' using errcode='42501'; end if;
 return snapshot;
end $$;
revoke all on function public.simtele_recuperar(integer) from public,anon;
grant execute on function public.simtele_recuperar(integer) to authenticated;

insert into public.caso_estudio(codigo,nombre,version_modelo) values('detencion','Detención de emergencia','3.0.0');
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'normal','Reacción a velocidad constante y frenado hasta v = 0.','{"v0":10,"tr":1,"a":2,"tolerance":0.000001,"h":0.1,"scenario":"normal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='detencion';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'estres','Más velocidad, mayor reacción y menor desaceleración.','{"v0":15,"tr":1.5,"a":1.5,"tolerance":0.000001,"h":0.1,"scenario":"estres"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='detencion';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'mal','Misma dinámica normal. Identificación sensible del frenado con dos velocidades casi iguales; véase Validación.','{"v0":10,"tr":1,"a":2,"tolerance":0.000001,"h":0.1,"scenario":"mal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='detencion';
insert into public.caso_estudio(codigo,nombre,version_modelo) values('deterioro','Deterioro mecánico','3.0.0');
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'normal','Curva D = 10 + 2t + 0,5t²; mediciones en 0, 1 y 2 meses.','{"y0":13,"y1":15.5,"y2":19,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"normal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='deterioro';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'estres','Curva D = 15 + 4t + t²; crecimiento más rápido.','{"y0":18,"y1":23,"y2":30,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"estres"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='deterioro';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'mal','La misma curva normal, medida en 0, 0,02 y 0,04 meses. Se aísla la sensibilidad.','{"y0":13,"y1":13.0402,"y2":13.0808,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"mal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='deterioro';
insert into public.caso_estudio(codigo,nombre,version_modelo) values('viento','Oscilaciones por viento','3.0.0');
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'normal','Oscilador amortiguado con fuerza constante de 100 N.','{"m":500,"c":50,"k":200,"F":100,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"normal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='viento';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'estres','Mayor fuerza y menor amortiguamiento.','{"m":500,"c":20,"k":200,"F":200,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"estres"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='viento';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'mal','Misma dinámica normal. Identificación de c y k con observaciones casi dependientes; véase Validación.','{"m":500,"c":50,"k":200,"F":100,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"mal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='viento';
insert into public.caso_estudio(codigo,nombre,version_modelo) values('sensores','Reconstrucción de sensores','3.0.0');
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'normal','Se retiran dos observaciones antes de construir los interpolantes.','{"funcion":"sin","nNodos":7,"a":0,"b":6.283185307179586,"ruido":0,"puntosOcultar":2,"umbral":0.5,"tolerance":0.000001,"scenario":"normal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='sensores';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'estres','Tres observaciones ausentes y ruido determinista de amplitud 0,08.','{"funcion":"sin","nNodos":7,"a":0,"b":6.283185307179586,"ruido":0.08,"puntosOcultar":3,"umbral":0.5,"tolerance":0.000001,"scenario":"estres"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='sensores';
insert into public.escenario(caso_id,tipo,descripcion,parametros_base_json,fuente_datos) select id,'mal','Nodos agrupados hacia el inicio (t = a + (b−a)u⁵). Se cuantifica la amplificación de una perturbación.','{"funcion":"sin","nNodos":9,"a":0,"b":6.283185307179586,"ruido":0,"puntosOcultar":2,"umbral":0.5,"tolerance":0.000001,"scenario":"mal"}'::jsonb,'Datos sintéticos SIMTELE-RISK' from public.caso_estudio where codigo='sensores';


-- Copia todos los registros existentes, conservando fecha, versión y snapshot original.
do $$ declare owner_id uuid; begin
 for owner_id in select distinct s.user_id from public.simulaciones s loop
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.simtele_importar_anteriores();
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
 if (select count(*) from public.simulacion where legacy_id is not null)<>(select count(*) from public.simulaciones) then raise exception 'La copia histórica no está completa.'; end if;
 if exists(select 1 from public.simulaciones old left join public.simulacion n on n.legacy_id=old.id where n.resultado_original_json is distinct from old.resultados or n.parametros_entrada_json is distinct from old.entradas or n.version_modelo is distinct from old.version_modelo or n.fecha is distinct from old.creado_en) then raise exception 'El snapshot histórico no coincide.'; end if;
end $$;
