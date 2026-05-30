/**
 * TRAPLOG - MÓDULO WIZARD INTELIGENTE (wizard.js)
 */
const TrapWizard = (function() {
  let ev = {}; 
  let currentStepId = 'impacto'; 
  let longPressTimer = null;
  let longPressFired = false;

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
    
    document.getElementById('wizard-title').textContent = STEPS[currentStepId].title;
    document.getElementById('wizard-back').style.display = currentStepId === 'impacto' ? 'none' : '';
    document.getElementById('wizard-next').textContent = currentStepId === 'resumen' ? '✔ GUARDAR' : 'CONTINUAR';
    document.getElementById('wizard-next').className = currentStepId === 'resumen' ? 'btn btn-ok' : 'btn btn-primary';

    container.innerHTML = getStepHTML(currentStepId);
  }

  function next() {
    if (!validate()) return;

    if (currentStepId === 'resumen') {
      save();
      return;
    }

    let nextStep = STEPS[currentStepId].next;

    if (currentStepId === 'impacto') {
      if (ev.origen === 'Operativo') {
        nextStep = ev.impacto === 'parada' ? 'motivo' : 'linea'; 
      } else { 
        nextStep = 'sector-tipo';
      }
    } 
    else if (currentStepId === 'linea') {
      if (ev.origen === 'Operativo' && ev.impacto === 'parada') {
        nextStep = 'tiempos'; 
      } else {
        nextStep = 'identificacion';
      }
    }

    currentStepId = nextStep;
    render();
    document.getElementById('screen-wizard').scrollTo(0,0);
  }

  function back() {
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
    
    if (currentStepId === 'tiempos') {
      const textoEscrito = document.getElementById('wiz-desc')?.value.trim();
      ev.descripcion = textoEscrito; 
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
      estado: (ev.impacto === 'sin-parada' && ev.origen === 'Falla Física') ? 'Oportunamente' : 
              (ev.impacto === 'parada' && !ev.fin_evento) ? 'Abierto' : 'Cerrado',
      responsable: currentUser ? currentUser.name : '',
      impacto: ev.impacto,
      pendiente: (ev.impacto === 'parada' && !ev.fin_evento) || 
                 (ev.impacto === 'sin-parada' && ev.estado === 'Oportunamente'),
      _exported: false
    };

    eventos.push(saved);
    localStorage.setItem('vitacora_trapiches', JSON.stringify(eventos));
    toast('✅ Evento registrado');
    db_saveEvento(saved); 
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
        <div class="choice-card" onclick="TrapWizard.sel('impacto','parada',this)"><span class="choice-icon">🛑</span><div class="choice-title">PARADA DE PRODUCCIÓN</div><div class="choice-desc">La producción se detiene</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('impacto','sin-parada',this)"><span class="choice-icon">⚙️</span><div class="choice-title">SIN PARADA</div><div class="choice-desc">Ajustes y otras acciones</div></div>
      </div>
      <div class="section-label">ORIGEN DEL EVENTO</div>
      <div class="choice-grid">
        <div class="choice-card" onclick="TrapWizard.sel('origen','Operativo',this)"><span class="choice-icon">👷</span><div class="choice-title">ORDEN OPERATIVA</div><div class="choice-desc">Decisión de operación</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('origen','Falla Física',this)"><span class="choice-icon">🔧</span><div class="choice-title">FALLA FÍSICA</div><div class="choice-desc">Problema en equipo</div></div>
      </div>`;
  }

  function htmlSectorTipo() {
    const sectores = [
      { nombre: 'Mecánica', icono: '🔩' },
      { nombre: 'Trapiches', icono: '⚙️' },
      { nombre: 'Electrico', icono: '⚡' },
      { nombre: 'Electrónico', icono: '📟' },
      { nombre: 'Lubricación', icono: '💧' }
    ];
    const tipos = [
      { nombre: 'Rotura', icono: '💥' },
      { nombre: 'Mantenimiento', icono: '🛠️' }
    ];
    
    return `
      <div class="section-label">SECTOR RESPONSABLE</div>
      <div class="choice-grid cols-3">${sectores.map(s => `<div class="choice-card" onclick="TrapWizard.sel('sector','${s.nombre}',this)"><span class="choice-icon">${s.icono}</span><div class="choice-title">${s.nombre}</div></div>`).join('')}
      </div>
      <div class="section-label">TIPO DE PROBLEMA</div>
      <div class="choice-grid">${tipos.map(t => `<div class="choice-card" onclick="TrapWizard.sel('tipo','${t.nombre}',this)"><span class="choice-icon">${t.icono}</span><div class="choice-title">${t.nombre}</div></div>`).join('')}
      </div>`;
  }

  function htmlMotivo() {
    const motivos = [
      { nombre: 'Fábrica', icono: '🏭', desc: 'Lleno de jugo o mieles' },
      { nombre: 'Caldera', icono: '🔥', desc: 'Falta de vapor' },
      { nombre: 'Caña', icono: '🌿', desc: 'Falta de materia prima' },
      { nombre: 'Eléctrico general', icono: '⚡', desc: 'Corte o subestación' },
      { nombre: 'Orden de coordinador', icono: '👷', desc: 'Orden del coordinador' },
      { nombre: 'Orden superior', icono: '👔', desc: 'Jefe, gerente o director' },
      { nombre: 'Otro', icono: '✏️', desc: '' }
    ];
    
    return `
      <div class="choice-grid cols-2">${motivos.map(m => `<div class="choice-card" onclick="TrapWizard.selMotivo('${m.nombre}', this)"><span class="choice-icon">${m.icono}</span><div class="choice-title">${m.nombre}</div><div class="choice-desc">${m.desc}</div></div>`).join('')}
      </div>
      <div class="field-group" id="motivo-otro-wrap" style="display:${ev.motivo==='Otro'?'block':'none'};margin-top:10px"><label>ESPECIFICAR MOTIVO</label><input type="text" id="inp-motivo" placeholder="Escribí el motivo..." oninput="ev.motivo=this.value"></div>`;
  }

  function htmlLinea() {
    return `
      <div class="info-box"><span style="font-size:20px">🕐</span><div class="info-box-text">${TrapUtils.nowTurno().turno.toUpperCase()} · ${TrapUtils.nowTurno().dia}</div></div>
      <div class="choice-grid cols-3" style="margin-top:0">
        <div class="choice-card" onclick="TrapWizard.sel('linea','T1',this)" style="border-bottom:3px solid var(--t1)"><span class="choice-icon" style="color:var(--t1);font-size:20px;font-family:var(--display)">T1</span><div class="choice-title">TRAPICHE 1</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('linea','T2',this)" style="border-bottom:3px solid var(--t2)"><span class="choice-icon" style="color:var(--t2);font-size:20px;font-family:var(--display)">T2</span><div class="choice-title">TRAPICHE 2</div></div>
        <div class="choice-card" onclick="TrapWizard.sel('linea','T3',this)" style="border-bottom:3px solid var(--t3)"><span class="choice-icon" style="color:var(--t3);font-size:20px;font-family:var(--display)">T3</span><div class="choice-title">TRAPICHE 3</div></div>
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
    const inputHiddenStyle = "display:none;visibility:hidden;width:0;height:0;position:absolute;";

    return `
      <div class="field-group"><label>DESCRIPCIÓN</label><textarea id="wiz-desc" placeholder="Detalle lo ocurrido..." style="min-height:80px">${ev.descripcion||''}</textarea></div>
      
      <div class="section-label">INICIO DEL EVENTO</div>
      <div class="time-card" id="time-card-ini"
        onclick="TrapWizard.tapTiempo('inicio')"
        oncontextmenu="TrapWizard.openNativePicker('inicio');event.preventDefault()"
        onmousedown="TrapWizard.startLongPress('inicio')" onmouseup="TrapWizard.cancelLongPress()" onmouseleave="TrapWizard.cancelLongPress()"
        ontouchstart="TrapWizard.startLongPress('inicio')" ontouchend="TrapWizard.cancelLongPress()" ontouchmove="TrapWizard.cancelLongPress()">
        <div class="time-card-label">TOQUE PARA REGISTRAR AHORA</div>
        <div class="time-card-val" id="wiz-time-ini-display">— : —</div>
        <div class="time-card-hint">mantené presionado para elegir hora</div>
        <button class="time-card-edit" onclick="TrapWizard.openNativePicker('inicio');event.stopPropagation()">✏️</button>
      </div>
      <input type="datetime-local" id="wiz-ini" style="${inputHiddenStyle}" onchange="TrapWizard.onPickerChange('inicio')">

      ${mostrarFin ? `
      <div class="section-label" style="margin-top:15px">FIN DEL EVENTO</div>
      <div class="time-card fin" id="time-card-fin"
        onclick="TrapWizard.tapTiempo('fin')"
        oncontextmenu="TrapWizard.openNativePicker('fin');event.preventDefault()"
        onmousedown="TrapWizard.startLongPress('fin')" onmouseup="TrapWizard.cancelLongPress()" onmouseleave="TrapWizard.cancelLongPress()"
        ontouchstart="TrapWizard.startLongPress('fin')" ontouchend="TrapWizard.cancelLongPress()" ontouchmove="TrapWizard.cancelLongPress()">
        <div class="time-card-label">TOQUE PARA REGISTRAR AHORA</div>
        <div class="time-card-val fin" id="wiz-time-fin-display">— : —</div>
        <div class="time-card-hint">mantené presionado para elegir hora</div>
        <button class="time-card-edit fin" onclick="TrapWizard.openNativePicker('fin');event.stopPropagation()">✏️</button>
      </div>
      <input type="datetime-local" id="wiz-fin" style="${inputHiddenStyle}" onchange="TrapWizard.onPickerChange('fin')">
      ` : ''}`;
  }

  function htmlResumen() {
    ev.descripcion = document.getElementById('wiz-desc')?.value || ev.descripcion;
    const estadoStr = (ev.impacto === 'parada' && !ev.fin_evento) ? '<span style="color:var(--danger)">ABIERTO (QUEDARÁ EN PENDIENTES)</span>' : 
                      (ev.impacto === 'sin-parada' && ev.origen === 'Falla Física') ? '<span style="color:var(--warn)">OPORTUNAMENTE (QUEDARÁ EN PENDIENTES HASTA CERRAR MANUALMENTE)</span>' :
                      '<span style="color:var(--ok)">CERRADO</span>';
    
    return `
      <div class="hl-box">
        <div class="hl-row"><span class="hl-key">IMPACTO</span><span class="hl-val">${ev.impacto === 'parada' ? 'PARADA' : 'SIN PARADA'}</span></div>
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
    ev.componente = ''; 
    const wrap = document.getElementById('wiz-comp-wrap');
    if (!wrap) return;
    if (!val) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    const comps = TrapData.getCompsOrdenados(ev.linea, val, eventos);
    const sel = document.getElementById('wiz-comp');
    sel.innerHTML = '<option value="">— Seleccionar —</option>' + comps.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // --- LÓGICA DE TIEMPOS (Toque rápido vs Click largo) ---
  function tapTiempo(tipo) {
    cancelLongPress();
    if (longPressFired) return;
    setTiempoAhora(tipo);
  }

  function startLongPress(tipo) {
    longPressFired = false;
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      longPressTimer = null;
      openNativePicker(tipo);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function setTiempoAhora(tipo) {
    const now = new Date();
    const localISO = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    const fmt = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    
    const key = tipo === 'inicio' ? 'inicio_evento' : 'fin_evento';
    ev[key] = localISO;
    
    const displayId = tipo === 'inicio' ? 'wiz-time-ini-display' : 'wiz-time-fin-display';
    const cardId = tipo === 'inicio' ? 'time-card-ini' : 'time-card-fin';
    const inputId = tipo === 'inicio' ? 'wiz-ini' : 'wiz-fin';
    
    document.getElementById(displayId).textContent = fmt;
    document.getElementById(cardId).classList.add('registered');
    document.getElementById(inputId).value = localISO;
  }

  function openNativePicker(tipo) {
    const inputId = tipo === 'inicio' ? 'wiz-ini' : 'wiz-fin';
    const inp = document.getElementById(inputId);
    
    if (!inp.value) {
      const now = new Date();
      inp.value = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    }
    
    try { inp.showPicker(); } catch(e) { inp.click(); }
  }

  function onPickerChange(tipo) {
    const inputId = tipo === 'inicio' ? 'wiz-ini' : 'wiz-fin';
    const displayId = tipo === 'inicio' ? 'wiz-time-ini-display' : 'wiz-time-fin-display';
    const cardId = tipo === 'inicio' ? 'time-card-ini' : 'time-card-fin';
    const val = document.getElementById(inputId).value;
    
    if (!val) return;
    const d = new Date(val);
    const fmt = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    
    const key = tipo === 'inicio' ? 'inicio_evento' : 'fin_evento';
    ev[key] = val;
    
    document.getElementById(displayId).textContent = fmt;
    document.getElementById(cardId).classList.add('registered');
  }

  return { 
    init, next, back, render, sel, selMotivo, onEqChange, ev, 
    tapTiempo, startLongPress, cancelLongPress, openNativePicker, onPickerChange 
  };
})();
