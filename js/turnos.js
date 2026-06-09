/**
 * TRAPLOG - MÓDULO DE CONFIGURACIÓN DE TURNOS (turnos.js)
 * v2026 - Zafra con horarios corridos (+1h)
 * 
 * Antes: 05-13 / 13-21 / 21-05 (noche pertenecía al día anterior)
 * Ahora: 06-14 / 14-22 / 22-06 (coincide con día de fábrica)
 * 
 * Si se vuelve a horarios antiguos, cambiar solo los números de HORARIOS.
 */
const TrapTurnos = (function() {
  // Configuración de horarios por turno [horaInicio, horaFin)
  const HORARIOS = {
    Mañana:   { inicio: 6,  fin: 14 },
    Tarde:    { inicio: 14, fin: 22 },
    Noche:    { inicio: 22, fin: 6  }  // cruza medianoche
  };

  const TURNO_SEQ = ['Mañana', 'Tarde', 'Noche'];

  // Detectar turno actual según hora del día
  function getTurnoActual(fecha) {
    const h = fecha.getHours();
    if (h >= 6 && h < 14) return 'Mañana';
    if (h >= 14 && h < 22) return 'Tarde';
    return 'Noche'; // 22-24 y 00-6
  }

  // Detectar día de fábrica según fecha/hora
  // Noche (22-06) pertenece al día en que empezó el turno (22:00)
  // Ej: 03:20 del 16/06 -> turno noche del 15/06
  function getDiaFabrica(fecha) {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    const dia = fecha.getDate();
    const hora = fecha.getHours();

    // Si es noche (00:00-05:59), el turno empezó ayer a las 22:00
    if (hora < 6) {
      const ayer = new Date(año, mes, dia - 1);
      return `${String(ayer.getDate()).padStart(2,'0')}/${String(ayer.getMonth()+1).padStart(2,'0')}/${ayer.getFullYear()}`;
    }

    // Mañana y tarde: día actual
    return `${String(dia).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}/${año}`;
  }

  // Obtener turno anterior
  function getTurnoAnterior(turnoActual) {
    const idx = TURNO_SEQ.indexOf(turnoActual);
    return TURNO_SEQ[(idx - 1 + 3) % 3];
  }

  // Obtener fecha del turno anterior (para filtro "turno anterior")
  // Si turno actual es Mañana, el anterior es Noche del día anterior
  // Si turno actual es Tarde, el anterior es Mañana del mismo día
  // Si turno actual es Noche, el anterior es Tarde del mismo día
  function getFechaTurnoAnterior(turnoActual, diaActual) {
    const [d, m, y] = diaActual.split('/').map(Number);
    const fecha = new Date(y, m - 1, d);

    if (turnoActual === 'Mañana') {
      // Turno anterior: Noche del día anterior
      fecha.setDate(fecha.getDate() - 1);
      return {
        turno: 'Noche',
        dia: `${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')}/${fecha.getFullYear()}`
      };
    }

    // Tarde -> Mañana mismo día, Noche -> Tarde mismo día
    return {
      turno: getTurnoAnterior(turnoActual),
      dia: diaActual
    };
  }

  // Info completa del turno actual
  function now() {
    const fecha = new Date();
    const turno = getTurnoActual(fecha);
    const dia = getDiaFabrica(fecha);
    return { turno, dia, fecha };
  }

  // Índice de turno para lógica de pendientes
  // Día "dd/mm/yyyy" + turno -> índice numérico
  function turnoIndex(dia, turno) {
    if (!dia || !turno) return 0;
    const partes = dia.split('/');
    if (partes.length !== 3) return 0;
    const d = new Date(Date.UTC(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0])));
    const daysFrom = Math.floor(d.getTime() / 86400000);
    const tIdx = TURNO_SEQ.indexOf(turno);
    return daysFrom * 3 + (tIdx >= 0 ? tIdx : 0);
  }

  return {
    HORARIOS,
    TURNO_SEQ,
    getTurnoActual,
    getDiaFabrica,
    getTurnoAnterior,
    getFechaTurnoAnterior,
    now,
    turnoIndex
  };
})();
