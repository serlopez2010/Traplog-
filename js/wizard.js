/**
 * TRAPLOG - MÓDULO WIZARD INTELIGENTE (wizard.js)
 * Gestiona el flujo dinámico de creación de eventos.
 */
const TrapWizard = (function() {
  let ev = {}; // Almacena las selecciones del usuario temporalmente
  let currentStepId = 'impacto'; // Identificador del paso actual

  // Definición de los pasos y su orden lógico
  const STEPS = {
    impacto: { title: 'PASO 1 — ¿PARA LA PRODUCCIÓN?', next: 'sector-tipo' },
    'sector-tipo': { title: 'PASO 2 — SECTOR Y TIPO', next: 'linea' },
    motivo: { title: 'PASO 2 — MOTIVO DE LA PARADA', next: 'linea' },
    identificacion: { title: 'PASO 3 — IDENTIFICACIÓN', next: 'tiempos' },
    linea: { title: 'PASO 3 — LÍNEA / TRAPICHE', next: 'identificacion' },
    tiempos: { title: 'PASO 4 — DESCRIPCIÓN Y TIEMPOS', next: 'resumen' },
    resumen: { title: 'PASO 5 — CONFIRMAR', next: null }
  };

  function init() {
    ev = {};
    currentStepId = 'impacto';
    render();
  }

  function render() {
    const container = document.getElementById('wizard-content');
    if (!container) return;
    
    // Actualizamos título y botones
    document.getElementById('wizard-title').textContent = STEPS[currentStepId].title;
    document.getElementById('wizard-back').style.display = currentStepId === 'impacto' ? 'none' : '';
    document.getElementById('wizard-next').textContent = currentStepId === 'resumen' ? '✔ GUARDAR' : 'CONTINUAR →';
    document.getElementById('wizard-next').className = currentStepId === 'resumen' ? 'btn btn-ok' : 'btn btn-primary';

    // Inyectamos el HTML del paso correspondiente
    container.innerHTML = getStepHTML(currentStepId);
  }

  function next() {
    if (!validate()) return;

    if (currentStepId === 'resumen') {
      save();
      return;
    }

    // LÓGICA DEL EMBUDO: Decidir cuál es el próximo paso real
    let nextStep = STEPS[currentStepId].next;

    if (currentStepId === 'impacto') {
      if (ev.origen === 'Operativo') {
        // Siempre pregunta la línea primero, sea parada o sin parada
        nextStep = ev.impacto === 'parada' ? 'motivo' : 'linea'; 
      } else { // Falla Física
        nextStep = 'sector-tipo';
      }
    }
    else if (currentStepId === 'linea') {
      // Solo saltamos equipo si es una PARADA OPERATIVA. 
      // Las fallas físicas y los ajustes (sin parada) SIEMPRE preguntan equipo.
      if (ev.origen === 'Operativo' && ev.impacto === 'parada') {
        nextStep = 'tiempos'; 
      } else {
        nextStep = 'identificacion';
      }
    }

    currentStepId = nextStep;
    render();
    // Scroll al inicio del wizard
    document.getElementById('screen-wizard').scrollTo(0,0);
  }

  function back() {
    // Lógica para ir hacia atrás (simplificada, vuelve al inicio si se corta)
    if (currentStepId === 'motivo') currentStepId = 'impacto';
    else if (currentStepId === 'linea') currentStepId = ev.origen === 'Operativo' ? 'motivo' : 'sector-tipo';
    else if (currentStepId === 'identificacion') currentStepId = 'linea';
    else if (currentStepId === 'tiempos') currentStepId = (ev.origen === 'Falla Física' && ev.sector === 'Trapiches') ? 'identificacion' : 'linea';
    else if (currentStepId === 'resumen') currentStepId = 'tiempos';
    else currentStepId = 'impacto';
    
    render();
  }

    function validate() {
    if (currentStepId === 'impacto' && (!ev.impacto || !ev.origen)) { toast('⚠️ Completá Impacto y Origen'); return false; }
    if (currentStepId === 'sector-tipo' && (!ev.sector || !ev.tipo)) { toast('⚠️ Completá Sector y Tipo'); return false; }
    if (currentStepId === 'motivo' && !ev.motivo) { toast('⚠️ Seleccioná un Motivo'); return false; }
    if (currentStepId === 'linea' && !ev.linea) { toast('⚠️ Seleccioná la Línea'); return false; }
    if (currentStepId === 'identificacion' && (!ev.equipo)) { toast('⚠️ Seleccioná el Equipo'); return false; }
    
    // LA SOLUCIÓN: Leemos directamente lo que haya escrito en la pantalla en este momento preciso
    if (currentStepId === 'tiempos') {
      const textoEscrito = document.getElementById('wiz-desc')?.value.trim();
      ev.descripcion = textoEscrito; // Lo guardamos en la variable
      if (!textoEscrito) { toast('⚠️ Escribí una descripción'); return false; }
    }
    
    return true;
  }

  function save() {
    const { turno, dia } = TrapUtils.nowTurno();
    const saved = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      fecha_fabrica: dia,
      turno: turno,
      linea: ev.linea,
      equipo: ev.equipo || ev.motivo || 'General',
      componente: ev.componente || '',
      sector: ev.sector || ev.motivo || 'General',
      tipo_evento: ev.tipo || 'Operativo',
      descripcion: ev.descripcion,
      inicio_evento: ev.inicio_evento,
      fin_evento: ev.impacto === 'parada' ? (ev.fin_evento || '') : '',
      duracion_min: ev.impacto === 'parada' && ev.inicio_evento && ev.fin_evento ? Math.round((new Date(ev.fin_evento) - new Date(ev.inicio_evento)) / 60000) : '',
      estado: (ev.impacto === 'parada' && !ev.fin_evento) ? 'Abierto' : 'Cerrado',
      responsable: currentUser ? currentUser.name : '',
      impacto: ev.impacto,
      pendiente: (ev.impacto === 'parada' && !ev.fin_evento) || ev.estado === 'Oportunamente',
      _exported: false
    };

    eventos.push(saved);
    localStorage.setItem('vitacora_trapiches', JSON.stringify(eventos));
    toast('✅ Evento registrado');
    db_saveEvento(saved); // Background sync
    showScreen('home');
  }

  // --- GENERADORES DE HTML ---

  function getStepHTML(step) {
    switch (step) {
      case 'impacto': return htmlImpacto();
      case 'sector-tipo': return htmlSectorTipo();
      case 'motivo': return htmlMotivo();
      case 'linea': return htmlLinea();
      case 'identificacion': return htmlIdentificacion();
      case 'tiempos': return htmlTiempos();
      case 'resumen': return htmlResumen();
      default: return '';
    }
  }

  function sel(group, val, el) {
    ev[group] = val;
    el.parentElement.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected', 'sel-danger', 'sel-ok'));
    el.classList.add('selected');
    if (val === 'parada') el.classList.add('sel-danger');
    if (val === 'sin-parada') el.classList.add('sel-ok');
  }

  function htmlImpacto() {
    return `
      <div class="choice-grid">
        <div class="choice-card" onclick="TrapWizard.sel('impacto','parada',this)"><span class="choice-icon">🛑</span><div class="choice-title">PARADA DE PRODUCCIÓN</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('impacto','sin-parada',this)"><span class="choice-icon">⚙️</span><div class="choice-title">SIN PARADA</div></div>
      </div>
      <div class="section-label">ORIGEN DEL EVENTO</div>
      <div class="choice-grid">
        <div class="choice-card" onclick="TrapWizard.sel('origen','Operativo',this)"><span class="choice-icon">👷</span><div class="choice-title">OPERATIVA</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('origen','Falla Física',this)"><span class="choice-icon">🔧</span><div class="choice-title">FALLA FÍSICA</div></div>
      </div>`;
  }

  function htmlSectorTipo() {
    // REGLA DE NEGOCIO CORREGIDA: 
    // Una Falla Física en Trapiche solo puede ser de sectores propios de la línea.
    // Si se paró por Caldera/Usina/Fábrica, es una Parada Operativa, no Falla Física.
    const sectores = ['Mecánica', 'Trapiches', 'Electrónico', 'Lubricación', 'Electrico'];
    const tipos = ['Rotura', 'Mantenimiento'];
    return `
      <div class="section-label">SECTOR RESPONSABLE</div>
      <div class="choice-grid cols-3">${sectores.map(s => `<div class="choice-card" onclick="TrapWizard.sel('sector','${s}',this)"><span class="choice-icon">🔩</span><div class="choice-title">${s.toUpperCase()}</div></div>`).join('')}</div>
      <div class="section-label">TIPO DE PROBLEMA</div>
      <div class="choice-grid">${tipos.map(t => `<div class="choice-card" onclick="TrapWizard.sel('tipo','${t}',this)"><span class="choice-icon">💥</span><div class="choice-title">${t.toUpperCase()}</div></div>`).join('')}</div>`;
  }

  function htmlMotivo() {
    const motivos = ['Fábrica', 'Caldera', 'Caña', 'Eléctrico general', 'Orden de coordinador', 'Orden superior', 'Otro'];
    return `
      <div class="choice-grid cols-2">${motivos.map(m => `<div class="choice-card" onclick="TrapWizard.selMotivo('${m}', this)"><span class="choice-icon">🏭</span><div class="choice-title">${m.toUpperCase()}</div></div>`).join('')}</div>
      <div class="field-group" id="motivo-otro-wrap" style="display:${ev.motivo==='Otro'?'block':'none'};margin-top:10px"><label>ESPECIFICAR MOTIVO</label><input type="text" id="inp-motivo" placeholder="Describir..." oninput="TrapWizard.ev.motivo=this.value"></div>`;
  }

  function htmlLinea() {
    return `
      <div class="info-box"><span style="font-size:20px">🕐</span><div class="info-box-text">${TrapUtils.nowTurno().turno.toUpperCase()} · ${TrapUtils.nowTurno().dia}</div></div>
      <div class="choice-grid cols-3" style="margin-top:0">
        <div class="choice-card" onclick="TrapWizard.sel('linea','T1',this)" style="border-bottom:3px solid var(--t1)"><span class="choice-icon" style="color:var(--t1);font-size:20px;font-family:var(--display)">T1</span><div class="choice-title" style="color:var(--t1)">TRAPICHE 1</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('linea','T2',this)" style="border-bottom:3px solid var(--t2)"><span class="choice-icon" style="color:var(--t2);font-size:20px;font-family:var(--display)">T2</span><div class="choice-title" style="color:var(--t2)">TRAPICHE 2</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('linea','T3',this)" style="border-bottom:3px solid var(--t3)"><span class="choice-icon" style="color:var(--t3);font-size:20px;font-family:var(--display)">T3</span><div class="choice-title" style="color:var(--t3)">TRAPICHE 3</div></div>
      </div>`;
  }

  function htmlIdentificacion() {
    const esParametro = ev.impacto === 'sin-parada' && ev.origen === 'Operativo';
    const label = esParametro ? '¿QUÉ AJUSTASTE? (EQUIPO)' : 'EQUIPO';
    const equipos = TrapData.EQUIPOS[ev.linea] || [];
    const comps = ev.equipo ? TrapData.getCompsOrdenados(ev.linea, ev.equipo, eventos) : [];

    return `
      <div class="field-group"><label>${label}</label>
        <select id="wiz-eq" onchange="TrapWizard.onEqChange(this.value)">
          <option value="">— Seleccionar —</option>
          ${equipos.map(e => `<option value="${e}" ${ev.equipo===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="field-group" id="wiz-comp-wrap" style="display:${ev.equipo?'block':'none'}"><label>COMPONENTE</label>
        <select id="wiz-comp" onchange="TrapWizard.sel('componente', this.value)">
          <option value="">— Seleccionar —</option>
          ${comps.map(c => `<option value="${c}" ${ev.componente===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>`;
  }

  function htmlTiempos() {
    const mostrarFin = ev.impacto === 'parada';
    return `
      <div class="field-group"><label>DESCRIPCIÓN</label><textarea id="wiz-desc" placeholder="Detalle lo ocurrido..." style="min-height:80px" oninput="TrapWizard.ev.descripcion=this.value">${ev.descripcion||''}</textarea></div>
      <div class="section-label">INICIO DEL EVENTO</div>
      <button class="btn btn-secondary" onclick="TrapWizard.setNow('inicio_evento')" style="width:100%">🕒 REGISTRAR HORA AHORA: <span id="wiz-time-ini">${TrapUtils.fmtHora(ev.inicio_evento) !== '—' ? TrapUtils.fmtHora(ev.inicio_evento) : '--- : ---'}</span></button>
      ${mostrarFin ? `
        <div class="section-label" style="margin-top:15px">FIN DEL EVENTO (Dejar vacío = Parada en curso)</div>
        <button class="btn btn-secondary" onclick="TrapWizard.setNow('fin_evento')" style="width:100%">🕒 REGISTRAR HORA AHORA: <span id="wiz-time-fin">${TrapUtils.fmtHora(ev.fin_evento) !== '—' ? TrapUtils.fmtHora(ev.fin_evento) : '--- : ---'}</span></button>
      ` : ''}`;
  }

  function htmlResumen() {
    ev.descripcion = document.getElementById('wiz-desc')?.value || ev.descripcion;
    const estadoStr = (ev.impacto === 'parada' && !ev.fin_evento) ? '<span style="color:var(--danger)">🔴 ABIERTO (QUEDARÁ EN PENDIENTES)</span>' : '<span style="color:var(--ok)">✅ CERRADO</span>';
    
    return `
      <div class="hl-box">
        <div class="hl-row"><span class="hl-key">IMPACTO</span><span class="hl-val">${ev.impacto === 'parada' ? '🛑 PARADA' : '⚙️ SIN PARADA'}</span></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:5px 0">
        <div class="hl-row"><span class="hl-key">LÍNEA</span><span class="hl-val" style="color:${lineaColor(ev.linea)};font-weight:700">${ev.linea||'—'}</span></div>
        <div class="hl-row"><span class="hl-key">EQUIPO</span><span class="hl-val">${ev.equipo || ev.motivo || '—'}</span></div>
        <div class="hl-row"><span class="hl-key">COMPONENTE</span><span class="hl-val">${ev.componente || '—'}</span></div>
        <div class="hl-row"><span class="hl-key">INICIO</span><span class="hl-val">${TrapUtils.fmtHora(ev.inicio_evento)}</span></div>
        <div class="hl-row"><span class="hl-key">FIN</span><span class="hl-val">${ev.fin_evento ? TrapUtils.fmtHora(ev.fin_evento) : 'NO ASIGNADO'}</span></div>
        <div class="hl-row"><span class="hl-key">ESTADO FINAL</span><span class="hl-val">${estadoStr}</span></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
        <div class="hl-key" style="margin-bottom:4px">DESCRIPCIÓN</div>
        <div style="font-size:12px;color:var(--text);line-height:1.5">${ev.descripcion}</div>
      </div>`;
  }

  // --- HELPERS DINÁMICOS ---
  function selMotivo(motivo, el) {
    ev.motivo = motivo;
    el.parentElement.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected', 'sel-ok'));
    el.classList.add('selected', 'sel-ok');
    const wrap = document.getElementById('motivo-otro-wrap');
    if (wrap) wrap.style.display = motivo === 'Otro' ? 'block' : 'none';
  }

  function onEqChange(val) {
    ev.equipo = val;
    ev.componente = ''; // Reset componente al cambiar equipo
    const wrap = document.getElementById('wiz-comp-wrap');
    if (!wrap) return;
    if (!val) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    const comps = TrapData.getCompsOrdenados(ev.linea, val, eventos);
    const sel = document.getElementById('wiz-comp');
    sel.innerHTML = '<option value="">— Seleccionar —</option>' + comps.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  function setNow(key) {
    const now = new Date();
    const localISO = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    ev[key] = localISO;
    const spanId = key === 'inicio_evento' ? 'wiz-time-ini' : 'wiz-time-fin';
    const span = document.getElementById(spanId);
    if (span) span.textContent = TrapUtils.fmtHora(localISO);
  }

  return { init, next, back, render, sel, selMotivo, onEqChange, setNow, ev };
})();
