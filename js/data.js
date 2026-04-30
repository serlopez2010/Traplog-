/**
 * TRAPLOG - MÓDULO DE DATOS (data.js)
 * Contiene las configuraciones estáticas de la fábrica y la lógica
 * de ordenamiento estadístico de componentes.
 */
const TrapData = (function() {
  
  // ======= COLORES DE LÍNEA =======
  const LINEA_COLOR = { T1: '#1976D2', T2: '#388E3C', T3: '#F57C00' };

  // ======= MAPA DE EQUIPOS POR LÍNEA =======
  const EQUIPOS = {
    T1: ['Volcador','Auxiliar nº1','Auxiliar nº2','Principal','Cuchilla 1','Cuchilla 2','Desfibrador','Cinta de goma','1er Molino','2do Molino','3er Molino','4to Molino','5to Molino','6to Molino','Zaranda','Gusano (th)','Bombas','Otro'],
    T2: ['Volcador','Auxiliar','Principal','Cuchilla 1','Cuchilla 2','Desfibrador','Cinta de goma','1er Molino','2do Molino','3er Molino','4to Molino','5to Molino','6to Molino','Zaranda','Gusano (th)','Bombas','Otro'],
    T3: ['Volcador','Auxiliar','Principal','Cuchilla 1','Cuchilla 2','Desfibrador','Cinta de goma','1er Molino','2do Molino','3er Molino','4to Molino','5to Molino','6to Molino','Zaranda','Gusano (th)','Bombas','Otro']
  };

  // ======= LISTA MAESTRA DE COMPONENTES =======
  // Nota: Se excluyen variables de proceso (ej: Agua de Imbibición) 
  // según acuerdo con gerencia para futura app de datos de proceso.
  const ALL_COMPS = [
    "Turbina","Reductor","Piñones","Virgen","Cabezal","Cilindros","Peines",
    "Bagacera","Donelly","Sensores/pick up","Llave/guardamotor","Motor",
    "Correas","Cadena","Rastrillos","Variador","Cable de acero","Cable eléctrico",
    "Bobinas de freno","Poleas","Bandas","Acople","Cañería","Espárragos",
    "Rodamiento","Intermediario","Transmision","Bronce","Lubricacion","Otro"
  ];

  // ======= MAPA ESTADÍSTICO HISTÓRICO =======
  const HIST_COMPS = {
    "T3|5to Molino":["Piñones","Donelly","Intermediario","Peines","Turbina","Bandas","Cilindros","Sensores/pick up"],
    "T1|3er Molino":["Transmision","Donelly","Bagacera","Acople","Peines","Intermediario","Cilindros","Cabezal"],
    "T3|6to Molino":["Cilindros","Bronce","Intermediario","Piñones","Cabezal","Peines","Lubricacion","Donelly","Cañeria"],
    "T1|5to Molino":["Donelly","Transmision","Intermediario","Turbina","Peines","Cilindros","Bronce","Cañeria"],
    "T3|4to Molino":["Peines","Donelly","Transmision","Intermediario","Cilindros","Correas","Cabezal"],
    "T3|3er Molino":["Intermediario","Transmision","Donelly","Bagacera"],
    "T3|2do Molino":["Donelly","Intermediario","Turbina","Cilindros"],
    "T2|4to Molino":["Cilindros","Bagacera","Cabezal","Turbina","Donelly","Intermediario"],
    "T1|2do Molino":["Donelly","Intermediario","Motor"],
    "T3|Volcador":["Cable de acero","Bobinas de freno","Motor"],
    "T2|Cuchilla 1":["Turbina","Rodamiento"],
    "T2|5to Molino":["Transmision","Cabezal","Bagacera","Turbina","Intermediario"],
    "T1|Desfibrador":["Acople","Turbina","Rodamiento"],
    "T2|6to Molino":["Turbina","Reductor","Cañeria","Cabezal","Piñones"],
    "T2|3er Molino":["Transmision","Intermediario"],
    "T1|Bombas":["Motor","Correas","Acople"],
    "T1|6to Molino":["Intermediario","Piñones","Bandas","Donelly","Turbina"],
    "T3|1er Molino":["Turbina","Cabezal","Lubricacion","Cilindros"],
    "T1|1er Molino":["Cabezal","Temperatura","Sensores/pick up","Turbina"],
    "T2|Cuchilla 2":["Rodamiento","Reductor","Turbina","Acople","Sensores/pick up"],
    "T3|Desfibrador":["Rodamiento","Lubricacion","Turbina"],
    "T1|Volcador":["Cable de acero","Bobinas de freno","Turbina","Motor"],
    "T1|4to Molino":["Transmision","Intermediario","Peines","Donelly"],
    "T2|1er Molino":["Bagacera","Turbina","Cilindros","Peines","Donelly"],
    "T3|Cinta de goma":["Rodamiento","Variador"],
    "T3|Principal":["Variador","Motor","Sensores/pick up"],
    "T1|Auxiliar":["Cadena","Variador"],
    "T3|Cuchilla 2":["Turbina","Sensores/pick up"],
    "T2|Desfibrador":["Rodamiento","Acople"],
    "T3|Cuchilla 1":["Motor"],
    "T2|Auxiliar":["Reductor","Cadena"],
    "T3|Auxiliar":["Transmision","Lubricacion"],
    "T1|Zaranda":["Cañeria"],
    "T2|Volcador":["Bobinas de freno","Llave/guardamotor"],
    "T1|Cuchilla 2":["Turbina"]
  };

  // ======= LÓGICA DE ORDENAMIENTO INTELIGENTE =======
  // Recibe la línea, el equipo, y opcionalmente los eventos actuales para mezclar historia con zafra actual.
  function getCompsOrdenados(linea, equipo, eventosActuales = []) {
    const clave = linea + '|' + equipo;
    const hist = HIST_COMPS[clave] || HIST_COMPS[equipo] || [];
    
    // Puntuación por zafra actual (peso x3)
    const actuals = {};
    eventosActuales.filter(e => e.linea === linea && e.equipo === equipo && e.componente).forEach(e => {
      actuals[e.componente] = (actuals[e.componente] || 0) + 2; 
    });

    // Puntuación por historia (peso descendente)
    const scores = {};
    hist.forEach((c, i) => { scores[c] = (scores[c] || 0) + (hist.length - i); });
    Object.entries(actuals).forEach(([c, n]) => { scores[c] = (scores[c] || 0) + n * 3; });

    // Incluir componentes sin score al final
    ALL_COMPS.forEach(c => { if (!scores[c]) scores[c] = 0; });

    // Ordenar
    const ordenados = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const EXCLUIR = ['Operativo', 'Temperatura']; // Excluidos de fallas mecánicas
    
    const conScore = ordenados.filter(c => scores[c] > 0 && !EXCLUIR.includes(c));
    const sinScore = ordenados.filter(c => scores[c] === 0 && !EXCLUIR.includes(c));
    
    return [...conScore, ...sinScore, 'Otro'];
  }

  // ======= DEVOLVER SOLO LO NECESARIO =======
  return {
    LINEA_COLOR,
    EQUIPOS,
    ALL_COMPS,
    HIST_COMPS,
    getCompsOrdenados
  };

})();
