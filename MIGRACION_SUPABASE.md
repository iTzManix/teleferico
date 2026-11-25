# Migración de SIMTELE RISK al DER

## Estado real

La migración fue **autorizada y aplicada el 25 de noviembre de 2026** en el proyecto **Metodos**, referencia `ucgkylgsvcymepplvias`.

Migración registrada: `20261125145755_simtele_der_normalizado_conserva_historial`.

Se crearon las siete tablas del DER, cuatro casos y doce escenarios. Se importaron **18 simulaciones, 86 ejecuciones, 8.326 iteraciones y 86 resultados resumidos**. Las dos cuentas existentes se vinculan mediante perfiles; no se cambiaron contraseñas ni credenciales.

La tabla original `public.simulaciones` conserva sus 18 registros y la huella `f843afa8c84543c6415795c404e8501f`, idéntica a la anterior. La comparación de entradas, fechas, versiones y JSON originales encontró **cero diferencias**.

La revisión automática inicial había bloqueado la operación; se aplicó únicamente después de la autorización expresa del usuario. No se utilizó una vía alternativa para evitar esa revisión.

## Migración aplicada

Se aplicó `schema_der.sql` como una única migración transaccional denominada `simtele_der_normalizado_conserva_historial` en ese proyecto.

| Entidad nueva | Relación |
| --- | --- |
| usuario | Vincula un ID entero con el UUID existente de Supabase Auth. |
| caso_estudio | Cuatro casos con código estable, nombre y versión. |
| escenario | Tres escenarios por caso; entradas base y fuente. |
| simulacion | Pertenece a usuario y escenario; conserva entradas, fecha, versión y procedencia. |
| ejecucion_metodo | Métodos de cada simulación y sus parámetros numéricos. |
| iteracion_resultado | Aproximación y errores por iteración o refinamiento. |
| resultado_resumen | Relación 1 a 1 con ejecución; valor, referencia, errores e interpretación. |

Las relaciones y las siete entidades corresponden al DER propuesto. Se utilizan `jsonb`, `timestamptz` y `boolean` en lugar de texto para sus valores respectivos. Se añaden metadatos de compatibilidad: referencia al registro anterior, snapshot original y solicitud idempotente. Los tiempos por método que no se han medido quedan nulos.

## Permisos y alcance

| Recurso | Anónimo | Usuario autenticado |
| --- | --- | --- |
| Catálogo de casos y escenarios | Sin acceso nuevo | Solo lectura |
| Perfil de usuario | Sin acceso | Lectura e inserción del perfil propio |
| Simulación | Sin acceso | Lectura e inserción de simulaciones propias |
| Ejecución, iteración y resumen | Sin acceso | Lectura e inserción solo bajo una simulación propia |
| RPC nuevas | Sin ejecución | Ejecutables respetando RLS y propietario |

No se conceden permisos de UPDATE o DELETE sobre las tablas nuevas. Las funciones usan **SECURITY INVOKER**, `search_path` vacío y nombres de esquema explícitos. No se introduce ninguna función SECURITY DEFINER ni se usan claves privilegiadas en el navegador. La identidad se obtiene con `auth.uid()`, no del JSON enviado por el cliente.

Las funciones son `simtele_guardar`, `simtele_importar_anteriores`, `simtele_listar`, `simtele_recuperar` y el auxiliar numérico `simtele_numero`. Se revoca su ejecución a PUBLIC/anon y se habilita para authenticated. Guardar realiza toda la escritura en una transacción; una solicitud repetida con el mismo contenido devuelve el mismo ID, y con contenido distinto produce error.

## Conservación de datos y compatibilidad

- Se conserva `public.simulaciones`, sus políticas y sus datos. La versión publicada sigue funcionando.
- Se copian las 18 simulaciones anteriores **sin recalcularlas**, conservando fecha, versión, entradas y JSON original.
- La copia verificada contiene 86 ejecuciones, 8.326 iteraciones y 86 resultados resumidos. Las aserciones de la migración comprueban correspondencia del snapshot con el origen antes de completar la transacción.
- Las nuevas lecturas pueden sincronizar registros que se guarden posteriormente desde la aplicación anterior, de forma idempotente y por propietario.
- Se añade un índice sobre usuario y fecha de la tabla anterior. No cambia sus valores ni sus permisos.
- Si cualquier parte de la migración falla, la transacción debe revertirse. Ante un problema posterior de interfaz, la aplicación puede continuar utilizando la tabla original, conservada.

## Integración de la aplicación

`cloud-history.js` ofrece guardado, listado y recuperación del snapshot original. Los cuatro módulos lo utilizan. La interfaz distingue **Ver guardado** y **Repetir entradas** y avisa si cambia la versión del modelo.

Mientras las RPC no existan, el adaptador utiliza el esquema anterior. Solo activa esta compatibilidad ante función ausente; no intenta una segunda escritura tras un timeout o un error de permisos. Los reintentos del esquema anterior usan el mismo UUID y verifican que el contenido coincida.

## Pruebas y resultados

`npm test` cubre 29 pruebas locales de modelos, renderizado, empaquetado y contrato del adaptador. Las pruebas del adaptador utilizan respuestas simuladas y se complementan con la ejecución real de SQL descrita a continuación.

La suite `pruebas_supabase_der.sql` se ejecutó sobre las funciones instaladas y obtuvo **PASS** para:

- Guardar y recuperar los doce escenarios, con igualdad exacta de entradas, métodos e historiales.
- Reintentar una solicitud sin duplicar la simulación y rechazar el mismo ID con contenido diferente.
- Revertir toda la escritura ante una iteración inválida; no quedan experimentos parciales.
- Impedir que el segundo usuario lea un experimento ajeno o agregue iteraciones a una ejecución ajena.
- Impedir la ejecución de las funciones por el rol anónimo.

Todas las escrituras de prueba se revirtieron con ROLLBACK. La verificación posterior confirmó que los conteos siguen en 18 simulaciones, 86 ejecuciones, 8.326 iteraciones y 86 resúmenes. Las secuencias pueden tener huecos normales por las pruebas revertidas.

Las siete tablas tienen RLS activo. Las cinco funciones nuevas son SECURITY INVOKER, no son ejecutables por anon y están habilitadas para authenticated. No se detectaron avisos de seguridad nuevos de este DER; los avisos previos se documentan debajo.

La evidencia está en `evidencia/verificacion-supabase.json`. La suite SQL utiliza contextos de rol/JWT en base de datos; **no reemplaza iniciar sesión, cerrar la pestaña y volver a entrar en un navegador**. Ese último ensayo presencial sigue pendiente y no requiere modificar el esquema.

## Estado de cierre

- Migración, importación y conservación de originales: comprobadas.
- Guardado, recuperación, reintentos, atomicidad y aislamiento en la base: comprobados.
- Adaptador local y paquetes de la aplicación: preparados para usar las funciones instaladas.
- Ciclo completo de sesión en navegador y revisión visual: pendientes de ensayo.
- GitHub: el avance de semana 3 se entrega desde la rama main después de la revisión local autorizada.

## Avisos anteriores a esta migración

La revisión inicial encontró avisos ya existentes, ajenos a estas siete tablas: ejecución pública de la función de evento `rls_auto_enable` y protección de contraseñas filtradas desactivada. No se modificaron funciones compartidas ni ajustes de Auth para evitar afectar otras funcionalidades del proyecto.

Referencias para revisarlos: [permisos de funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Los privilegios por defecto se revocan solo sobre las tablas y secuencias nuevas antes de conceder el acceso indicado. Se añade un índice de propietario y fecha sobre la tabla anterior; sus políticas y permisos no cambian.
