/**
 * TRAPLOG - MÓDULO DE UTILIDADES (utils.js)
 * Cálculos de tiempo, turnos y normalización de datos.
 */
const TrapUtils = (function() {

  // ======= CÁLCULO DE TURNO Y DÍA DE FÁBRICA =======
  // Regla de negocio: La noche (21:00 a 04:59) pertenece al día anterior.
  function getTurnoInfo(d) {
    const h = d.getHours(), m = d.getMinutes(), tot = h * 60 + m;
    let turno = tot >= 5 * 60 && tot < 13 * 60 ? 'Mañana' : 
                tot >= 13 * 60 && tot < 21 * 60 ? 'Tarde' : 'Noche';
    
    const base = new Date(d);
    if (tot < 6 * 60) base.setDate(base.getDate() - 1); // Ajuste de día para la noche
    
    const dia = base.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { turno, dia };
  }

  function nowTurno() {
    return getTurnoInfo(new Date());
  }

  // ======= ÍNDICE DE TURNOS (Para lógica de Pendientes) =======
  const TURNO_SEQ = ['Mañana', 'Tarde', 'Noche'];
  function turnoIndex(dia, turno) {
    if (!dia || !turno) return 0;
    const partes = dia.split('/');
    if (partes.length !== 3) return 0;
    // Usar UTC para evitar offsets de timezone
    const d = new Date(Date.UTC(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0])));
    const daysFrom = Math.floor(d.getTime() / 86400000);
    const tIdx = TURNO_SEQ.indexOf(turno);
    return daysFrom * 3 + (tIdx >= 0 ? tIdx : 0);
  }

  // ======= NORMALIZACIÓN DE FECHAS (Para filtros y comparaciones) =======
  // Convierte "dd/mm/yyyy" o "YYYY-mm-ddTHH:mm:ss" a "YYYY-mm-dd"
  function normalizarFecha(fecha) {
    if (!fecha) return null;
    if (fecha.includes('T')) return fecha.split('T')[0]; // Formato ISO
    if (fecha.includes('/')) {
      const p = fecha.split('/');
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    return fecha;
  }

  // ======= FORMATEO VISUAL =======
  function fmtHora(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // ======= DEVOLVER SOLO LO NECESARIO =======
  return {
    getTurnoInfo,
    nowTurno,
    turnoIndex,
    normalizarFecha,
    fmtHora,
    TURNO_SEQ
  };

})();
