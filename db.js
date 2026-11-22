// db.js — Conexión compartida a Supabase (reutilizable por todos los módulos)
let dbPromise;

export function database() {
  return dbPromise ||= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.89.0/+esm')
    .then(({ createClient }) => createClient(
      'https://ucgkylgsvcymepplvias.supabase.co',
      'sb_publishable_-j_8z-D6DpdNgsVxvqOZug_Ob2eUvtx'
    ))
    .catch(() => { dbPromise = null; throw Error('No se pudo conectar con el servicio de historial. Comprueba tu conexión.') })
}