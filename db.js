// ============================================================
// db.js — TRAPLOG v0.4
// Capa de abstracción de datos → Google Sheets via Apps Script
// Para migrar a Firebase en v0.5: reescribir solo este archivo
// ============================================================

const DB_URL = 'https://script.google.com/macros/s/AKfycbxdsUEiNCgkVFxWW07i27nyP7YJKwaqx5vhlwDhYknK35hxWFzpm910Lc3vQYJfyc3F5A/exec';

async function dbCall(payload) {
  try {
    const res = await fetch(DB_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('db error:', err);
    return { ok: false, error: err.message };
  }
}

// ======= AUTH =======
async function db_login(user, pass) {
  return await dbCall({ action: 'login', user, pass });
}

// ======= EVENTOS =======
async function db_getEventos() {
  const res = await dbCall({ action: 'getEventos' });
  if (!res.ok) return res;
  // Normalizar campos que Sheets puede convertir automáticamente
  res.eventos = res.eventos.map(e => {
    // fecha_fabrica: si viene como ISO (ej: 2026-03-26T03:00:00.000Z) → dd/mm/yyyy
    if (e.fecha_fabrica && String(e.fecha_fabrica).includes('T')) {
      const d = new Date(e.fecha_fabrica);
      e.fecha_fabrica = String(d.getDate()).padStart(2,'0') + '/' +
                        String(d.getMonth()+1).padStart(2,'0') + '/' +
                        d.getFullYear();
    }
    // inicio_evento y fin_evento: si Sheets los convirtió a fecha, normalizar a ISO local
    ['inicio_evento','fin_evento'].forEach(campo => {
      const val = e[campo];
      if (val && String(val).includes('T')) {
        const d = new Date(val);
        if (!isNaN(d)) {
          e[campo] = d.getFullYear() + '-' +
                     String(d.getMonth()+1).padStart(2,'0') + '-' +
                     String(d.getDate()).padStart(2,'0') + 'T' +
                     String(d.getHours()).padStart(2,'0') + ':' +
                     String(d.getMinutes()).padStart(2,'0');
        }
      }
    });
    // id siempre número
    e.id = Number(e.id);
    // pendiente siempre booleano
    e.pendiente = e.pendiente === true || e.pendiente === 'true';
    // _exported siempre booleano
    e._exported = e._exported === true || e._exported === 'true';
    // duracion_min siempre número o vacío
    e.duracion_min = e.duracion_min !== '' && e.duracion_min !== undefined ? Number(e.duracion_min) : '';
    return e;
  });
  return res;
}

async function db_saveEvento(evento) {
  return await dbCall({ action: 'saveEvento', evento });
}

async function db_updateEvento(id, campos) {
  return await dbCall({ action: 'updateEvento', id, campos });
}

async function db_deleteEvento(id) {
  return await dbCall({ action: 'deleteEvento', id });
}

// ======= USUARIOS =======
async function db_getUsuarios() {
  return await dbCall({ action: 'getUsuarios' });
}

async function db_saveUsuario(usuario) {
  return await dbCall({ action: 'saveUsuario', usuario });
}

async function db_deleteUsuario(name) {
  return await dbCall({ action: 'deleteUsuario', name });
}
