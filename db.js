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
  return await dbCall({ action: 'getEventos' });
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
