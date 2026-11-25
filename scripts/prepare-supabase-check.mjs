// Genera la suite de regresión para el DER instalado. Ver evidencia/verificacion-supabase.json para el resultado registrado.
// Usa los dos usuarios existentes como contextos RLS; no crea cuentas ni usa sus claves.
// Todas las simulaciones de prueba se revierten. No equivale a una prueba de login en navegador.
import {writeFile} from 'node:fs/promises';
import {allExperiments} from '../experiments.js';
import {cloudPayload} from '../cloud-history.js';
const payloads=JSON.stringify(allExperiments().map(cloudPayload)).replaceAll("'","''");
const sql=`-- Suite de regresión para el DER instalado. El resultado registrado está en evidencia/verificacion-supabase.json.
begin;
do $$ begin
 if (select count(*) from auth.users)<2 then raise exception 'Se necesitan dos usuarios existentes para comprobar RLS.'; end if;
 perform set_config('simtele.test_user1',(select id::text from auth.users order by id limit 1),true);
 perform set_config('simtele.test_user2',(select id::text from auth.users order by id offset 1 limit 1),true);
 perform set_config('request.jwt.claim.sub',current_setting('simtele.test_user1'),true);
 perform set_config('simtele.test_payloads','${payloads}',true);
end $$;
set local role authenticated;
do $$ declare p jsonb; sid integer; second_id integer; request_id uuid; saved jsonb; previous_count bigint; failed jsonb; checked integer:=0; begin
 for p in select value from jsonb_array_elements(current_setting('simtele.test_payloads')::jsonb) loop
  request_id:=gen_random_uuid();
  select count(*) into previous_count from public.simulacion;
  sid:=public.simtele_guardar(p,request_id);
  saved:=public.simtele_recuperar(sid);
  if saved->'methods' is distinct from p->'methods' or saved->'inputs' is distinct from p->'inputs' or saved->>'version' is distinct from p->>'version' then raise exception 'El snapshot no se recuperó sin pérdidas.'; end if;
  second_id:=public.simtele_guardar(p,request_id);
  if second_id<>sid or (select count(*) from public.simulacion)<>previous_count+1 then raise exception 'El reintento duplicó la simulación.'; end if;
  begin
   perform public.simtele_guardar(p||jsonb_build_object('version','otra-version'),request_id);
   raise exception 'Se permitió reutilizar una solicitud con contenido distinto.';
  exception when sqlstate '22023' then null; end;
  failed:=p||jsonb_build_object('methods',(p->'methods')||jsonb_build_array(jsonb_build_object('name','Fallo de prueba deliberado','history',jsonb_build_array('iteración inválida'))));
  select count(*) into previous_count from public.simulacion;
  begin
   perform public.simtele_guardar(failed,gen_random_uuid());
   raise exception 'Se aceptó una iteración inválida.';
  exception when sqlstate '22023' then null; end;
  if (select count(*) from public.simulacion)<>previous_count then raise exception 'Quedó un experimento guardado parcialmente.'; end if;
  if checked=0 then
   perform set_config('simtele.test_id',sid::text,true);
   perform set_config('simtele.test_execution',(select id::text from public.ejecucion_metodo where simulacion_id=sid order by id limit 1),true);
  end if;
  checked:=checked+1;
 end loop;
 if checked<>12 then raise exception 'No se probaron los 12 escenarios.'; end if;
end $$;
-- Segundo usuario: ni recuperación por ID ni escritura de iteraciones ajenas.
do $$ begin perform set_config('request.jwt.claim.sub',current_setting('simtele.test_user2'),true); end $$;
do $$ begin
 begin
  perform public.simtele_recuperar(current_setting('simtele.test_id')::integer);
  raise exception 'El segundo usuario recuperó datos ajenos.';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.ejecucion_metodo where id=current_setting('simtele.test_execution')::integer) then raise exception 'RLS expone una ejecución ajena.'; end if;
 begin
  insert into public.iteracion_resultado(ejecucion_id,numero,aproximacion_json) values(current_setting('simtele.test_execution')::integer,99999,'{}');
  raise exception 'Se permitió insertar en una ejecución ajena.';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub','',true); end $$;
set local role anon;
do $$ begin
 begin perform public.simtele_listar(null,30); raise exception 'Una sesión anónima ejecutó la RPC.';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select jsonb_build_object('estado','PASS: todas las aserciones previas se completaron y las escrituras se revirtieron','escenarios',12,'aislamiento','dos usuarios y anon','nota','La prueba real de sesión en navegador es independiente.');
`;
await writeFile('pruebas_supabase_der.sql',sql);
console.log('Suite de regresión generada. Su generación no ejecuta consultas en Supabase.');
