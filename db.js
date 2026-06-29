// ============================================================
// db.js — TRAPLOG v0.4
// Capa de abstracción de datos → Google Sheets via Apps Script
// Para migrar a Firebase en v0.5: reescribir solo este archivo
// ============================================================

<<<<<<< Updated upstream
const DB_URL = 'https://script.google.com/macros/s/AKfycbxdsUEiNCgkVFxWW07i27nyP7YJKwaqx5vhlwDhYknK35hxWFzpm910Lc3vQYJfyc3F5A/exec';
=======
// const DB_URL = 'https://script.google.com/macros/s/AKfycbxytXvtGZ8C8d2TiJCcn8kLjsxQR-flsbw1UtmYoQZfVqz4paS9okLurn8ervFW1Fyf/exec';
const DB_URL = 'https://script.google.com/macros/s/AKfycbwFK4A8I3Iy2LPk9nQa6gHr2sdVxIMEjsvuClG-zvdPGznp4EFiz-mnx20Vb_Q_arArsw/exec';
>>>>>>> Stashed changes

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

// ======= FUNCIONES PARA DATOS DE PROCESO =======

async function db_guardarDatosProceso(datos) {
  try {
    let historial = JSON.parse(localStorage.getItem('traplog_datos_proceso') || '[]');
    // Sobrescribe si ya existe ese turno y día
    historial = historial.filter(h => !(h.fecha_fabrica === datos.fecha_fabrica && h.turno === datos.turno));
    historial.push(datos);
    localStorage.setItem('traplog_datos_proceso', JSON.stringify(historial));
    return { ok: true };
  } catch(e) {
    console.warn('Error guardando datos de proceso:', e);
    return { ok: false, error: e.message };
  }
}

async function db_getDatosProceso(fecha, turno) {
  try {
    const historial = JSON.parse(localStorage.getItem('traplog_datos_proceso') || '[]');
    const datos = historial.find(h => h.fecha_fabrica === fecha && h.turno === turno);
    return { ok: true, datos: datos || null };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// Nueva: Obtener el último registro sin importar cuál sea (para la precarga)
async function db_getUltimoRegistroProceso() {
  try {
    const historial = JSON.parse(localStorage.getItem('traplog_datos_proceso') || '[]');
    if (historial.length === 0) return { ok: true, datos: null };
    
    // Ordenar por timestamp descendente y agarrar el primero
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { ok: true, datos: historial[0] };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

async function db_getHistorialProceso(limite = 20) {
  try {
    let historial = JSON.parse(localStorage.getItem('traplog_datos_proceso') || '[]');
    historial.sort((a, b) => {
      const dateCompare = (b.fecha_fabrica || '').localeCompare(a.fecha_fabrica || '');
      if (dateCompare !== 0) return dateCompare;
      const turnos = { 'Mañana': 1, 'Tarde': 2, 'Noche': 3 };
      return (turnos[b.turno] || 0) - (turnos[a.turno] || 0);
    });
    return { ok: true, datos: historial.slice(0, limite) };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}