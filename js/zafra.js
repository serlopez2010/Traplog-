/**
 * TRAPLOG - MODULO ZAFRA (zafra.js)
 * Gestiona el periodo de actividad productiva para calculos de KPI.
 * v1.0 - Compatible con TRAPLOG v0.6
 */
const TrapZafra = (function() {
  const STORAGE_KEY = 'traplog_zafra_config';
  const DEFAULT_INICIO = { mes: 5, dia: 1 };   // 1 de mayo
  const DEFAULT_FIN    = { mes: 12, dia: 31 };  // 31 de diciembre

  // ======= GET / SET CONFIG =======
  function getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) { console.warn('Error leyendo config zafra:', e); }
    return {
      anio: new Date().getFullYear(),
      inicio: { ...DEFAULT_INICIO },
      fin: { ...DEFAULT_FIN },
      habilitado: true
    };
  }

  function setConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  // ======= FECHAS DE ZAFRA (formato ISO YYYY-MM-DD) =======
  function getFechasZafra(anio = null) {
    const cfg = getConfig();
    const year = anio || cfg.anio || new Date().getFullYear();
    const inicio = `${year}-${String(cfg.inicio.mes).padStart(2,'0')}-${String(cfg.inicio.dia).padStart(2,'0')}`;
    const fin = `${year}-${String(cfg.fin.mes).padStart(2,'0')}-${String(cfg.fin.dia).padStart(2,'0')}`;
    return { inicio, fin, year };
  }

  // ======= VALIDAR SI UNA FECHA ESTA DENTRO DE LA ZAFRA =======
  function estaEnZafra(fechaStr, anio = null) {
    const cfg = getConfig();
    if (!cfg.habilitado) return true;
    const { inicio, fin } = getFechasZafra(anio);
    const f = TrapUtils.normalizarFecha(fechaStr);
    if (!f) return false;
    return f >= inicio && f <= fin;
  }

  // ======= FILTRAR EVENTOS POR ZAFRA =======
  function filtrarEventos(eventos, anio = null) {
    return eventos.filter(e => estaEnZafra(e.fecha_fabrica, anio));
  }

  // ======= RESUMEN DE ZAFRA PARA UI =======
  function getResumen(anio = null) {
    const { inicio, fin, year } = getFechasZafra(anio);
    const ini = new Date(inicio);
    const end = new Date(fin);
    const dias = Math.round((end - ini) / 86400000) + 1;
    return {
      periodo: `${ini.toLocaleDateString('es-AR')} → ${end.toLocaleDateString('es-AR')}`,
      dias,
      year,
      habilitado: getConfig().habilitado
    };
  }

  // ======= DETECTAR ANIO DE ZAFRA ACTUAL =======
  function getAnioZafraActual() {
    const hoy = new Date();
    const cfg = getConfig();
    if (hoy.getMonth() + 1 < cfg.inicio.mes) {
      return hoy.getFullYear() - 1;
    }
    return hoy.getFullYear();
  }

  // ======= FORMATO CORTO PARA BADGE =======
  function getBadgeText() {
    const cfg = getConfig();
    if (!cfg.habilitado) return 'ZAFRA: OFF';
    const { inicio, fin, year } = getFechasZafra();
    return `ZAFRA ${year}: ${inicio.slice(8,10)}/${inicio.slice(5,7)} → ${fin.slice(8,10)}/${fin.slice(5,7)}`;
  }

  // ======= SYNC CON DB (opcional) =======
  async function syncFromDB() {
    try {
      if (typeof db_getZafraConfig === 'function') {
        const res = await db_getZafraConfig();
        if (res.ok && res.config) {
          setConfig(res.config);
          return true;
        }
      }
    } catch(e) { console.warn('Sync zafra desde DB fallo:', e); }
    return false;
  }

  async function syncToDB() {
    try {
      if (typeof db_saveZafraConfig === 'function') {
        await db_saveZafraConfig(getConfig());
        return true;
      }
    } catch(e) { console.warn('Sync zafra a DB fallo:', e); }
    return false;
  }

  return {
    getConfig,
    setConfig,
    getFechasZafra,
    estaEnZafra,
    filtrarEventos,
    getResumen,
    getAnioZafraActual,
    getBadgeText,
    syncFromDB,
    syncToDB
  };
})();
