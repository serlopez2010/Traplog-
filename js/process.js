/**
 * TRAPLOG - MÓDULO DE DATOS DE PROCESO (process.js)
 * Estructura anidada por Línea (T1, T2, T3)
 */

const TrapProcess = (function() {
  
  // Estado local
  let datosActuales = null;
  let historialVisible = false;
  
  // Constantes de opciones
  const lineas = ['T1', 'T2', 'T3'];
  const molinos = ['Molino 1', 'Molino 2', 'Molino 3', 'Molino 4', 'Molino 5', 'Molino 6'];
  const cilindros = ['Cil. inf. Entrada', 'Cil. inf. Salida', 'Cil Superior', 'Pressroller'];

  // ==========================================
  // FUNCIONES PRINCIPALES
  // ==========================================

  async function init() {
    try {
      configurarEventos();
      await cargarDatosPrecarga();
    } catch(err) {
      console.error('Error al cargar datos de proceso, se abre formulario vacío:', err);
      limpiarFormulario();
    }
    
    // Abrir T1 por defecto
    const primerItem = document.querySelector('.proc-acordeon-item[data-linea="T1"]');
    if (primerItem) primerItem.classList.add('is-open');
    
    ocultarHistorial();
  }

  // Lógica inteligente de precarga
  async function cargarDatosPrecarga() {
    const { turno, dia } = TrapUtils.nowTurno();
    const banner = document.getElementById('proceso-turno-text');
    if (banner) banner.innerHTML = `📅 ${dia} · ${turno.toUpperCase()}`;
    
    try {
      // 1. Intentar cargar el turno actual
      let res = await db_getDatosProceso(dia, turno);
      if (res.ok && res.datos) {
        datosActuales = res.datos;
        volcarDatosAlFormulario(datosActuales);
        toast('📊 Datos del turno actual cargados');
        return;
      }

      // 2. Si no existe, buscar el último registro guardado
      res = await db_getUltimoRegistroProceso();
      if (res.ok && res.datos) {
        datosActuales = res.datos;
        volcarDatosAlFormulario(datosActuales);
        toast('🟡 ATENCIÓN: Precargado turno anterior. Modificá lo que cambió y guardá.');
      } else {
        limpiarFormulario();
      }
    } catch(err) {
      console.error('Error en precarga:', err);
      limpiarFormulario();
    }
  }

  async function guardar() {
    if (!currentUser || currentUser.role === 'viewer') {
      document.getElementById('ro-overlay').classList.add('show');
      return;
    }

    const { turno, dia } = TrapUtils.nowTurno();
    
    // Armado del objeto anidado por línea
    const datos = {
      fecha_fabrica: dia, 
      turno: turno,       
      timestamp: new Date().toISOString(),
      usuario: currentUser.name,
      obs: document.getElementById('proc-obs')?.value || null
    };

    lineas.forEach(linea => {
      // SIEMPRE pasamos a minúsculas para buscar los IDs del HTML
      const l = linea.toLowerCase();
      
      datos[linea] = {
        caudal_agua: document.getElementById(`proc-caudal-${l}`)?.value ? parseFloat(document.getElementById(`proc-caudal-${l}`).value) : null,
        ingreso_agua: document.getElementById(`proc-ingreso-${l}`)?.value || null,
        velocidades: {
          m1: document.getElementById(`proc-vel-${l}-m1`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m1`).value) : null,
          m2: document.getElementById(`proc-vel-${l}-m2`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m2`).value) : null,
          m3: document.getElementById(`proc-vel-${l}-m3`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m3`).value) : null,
          m4: document.getElementById(`proc-vel-${l}-m4`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m4`).value) : null,
          m5: document.getElementById(`proc-vel-${l}-m5`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m5`).value) : null,
          m6: document.getElementById(`proc-vel-${l}-m6`)?.value ? parseFloat(document.getElementById(`proc-vel-${l}-m6`).value) : null
        },
        aceite_transmision: document.getElementById(`proc-aceite-trans-${l}`)?.value ? parseFloat(document.getElementById(`proc-aceite-trans-${l}`).value) : null,
        aceite_molinos: document.getElementById(`proc-aceite-mol-${l}`)?.value ? parseFloat(document.getElementById(`proc-aceite-mol-${l}`).value) : null,
        kilos_electrodo: document.getElementById(`proc-electrodo-${l}`)?.value ? parseFloat(document.getElementById(`proc-electrodo-${l}`).value) : null,
        rellenos: obtenerRellenosDeDOM(l) // Paso 'l' (t1, t2, t3)
      };
    });

    const btn = document.getElementById('btn-guardar-proceso');
    const textoOriginal = btn?.textContent;
    if (btn) { btn.textContent = 'GUARDANDO...'; btn.disabled = true; }

    try {
      const res = await db_guardarDatosProceso(datos);
      if (res.ok) {
        toast('✅ Datos guardados correctamente para ' + dia + ' - ' + turno);
        datosActuales = datos;
        if (historialVisible) await verHistorial();
      } else {
        toast('❌ Error: ' + (res.error || 'No se pudieron guardar'));
      }
    } catch(err) {
      toast('❌ Error de red');
      console.error(err);
    } finally {
      if (btn) { btn.textContent = textoOriginal; btn.disabled = false; }
    }
  }

  // ==========================================
  // ACORDEÓN Y SUB-FORMULARIOS DINÁMICOS
  // ==========================================

  function toggleAcordeon(linea) {
    const item = document.querySelector(`.proc-acordeon-item[data-linea="${linea}"]`);
    if (!item) return;
    
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.proc-acordeon-item').forEach(i => i.classList.remove('is-open'));
    
    if (!isOpen) {
      item.classList.add('is-open');
    }
  }

  function addRelleno(linea, molinoVal = '', cilindroVal = '') {
    // Asegurar minúsculas porque viene desde el HTML como 'T1' o desde JS como 't1'
    const l = linea.toLowerCase(); 
    
    const container = document.getElementById(`proc-rellenos-${l}`);
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'relleno-row';
    
    let optsMol = '<option value="">Seleccionar...</option>' + molinos.map(m => `<option value="${m}" ${m===molinoVal?'selected':''}>${m}</option>`).join('');
    let optsCil = '<option value="">Seleccionar...</option>' + cilindros.map(c => `<option value="${c}" ${c===cilindroVal?'selected':''}>${c}</option>`).join('');

    row.innerHTML = `
      <div class="field-group" style="margin-bottom: 0;">
        <label>MOLINO</label>
        <select class="relleno-molino">${optsMol}</select>
      </div>
      <div class="field-group" style="margin-bottom: 0;">
        <label>CILINDRO</label>
        <select class="relleno-cilindro">${optsCil}</select>
      </div>
      <button type="button" class="btn-delete-relleno" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  }

  // ==========================================
  // HISTORIAL
  // ==========================================

  async function toggleHistorial() {
    const historialDiv = document.getElementById('historial-proceso');
    const btn = document.getElementById('btn-ver-historial');
    if (!historialDiv) return;
    
    if (historialDiv.style.display === 'none' || historialDiv.style.display === '') {
      historialDiv.style.display = 'block';
      if (btn) btn.textContent = 'OCULTAR HISTORIAL';
      historialVisible = true;
      await verHistorial();
    } else {
      historialDiv.style.display = 'none';
      if (btn) btn.textContent = '📈 VER HISTORIAL';
      historialVisible = false;
    }
  }

  async function verHistorial() {
    const listaDiv = document.getElementById('historial-lista');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Cargando...</div></div>';
    
    try {
      const res = await db_getHistorialProceso(20);
      if (res.ok && res.datos && res.datos.length) {
        listaDiv.innerHTML = res.datos.map(d => {
          let html = `<div class="historial-item"><div class="historial-fecha">📅 ${d.fecha_fabrica} · ${d.turno} | 👤 ${d.usuario || '—'}</div>`;
          
          lineas.forEach(linea => {
            const data = d[linea];
            if (!data) return;
            const color = linea === 'T1' ? '#1976D2' : (linea === 'T2' ? '#388E3C' : '#F57C00');
            let detalle = '';
            if (data.caudal_agua) detalle += `💧${data.caudal_agua}m³ | `;
            if (data.ingreso_agua) detalle += `📍${data.ingreso_agua} | `;
            if (data.aceite_transmision) detalle += `🛢️T:${data.aceite_transmision}L | `;
            if (data.kilos_electrodo) detalle += `⚡${data.kilos_electrodo}kg | `;
            
            if (data.rellenos && data.rellenos.length > 0) {
              detalle += `🔧 ${data.rellenos.map(r => `${r.molino}(${r.cilindro})`).join(', ')} | `;
            }

            if (detalle) {
              html += `<div class="historial-datos" style="border-left: 3px solid ${color}; padding-left: 8px; margin: 4px 0;">
                <strong>${linea}:</strong> ${detalle.slice(0, -3)}
              </div>`;
            }
          });

          if (d.obs) html += `<div class="historial-obs">📝 ${d.obs}</div>`;
          html += `</div>`;
          return html;
        }).join('');
      } else {
        listaDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No hay registros.</div></div>';
      }
    } catch(err) {
      listaDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Error al cargar.</div></div>';
    }
  }

  // ==========================================
  // FUNCIONES PRIVADAS DE FORMULARIO
  // ==========================================

  // Extraer los rellenos que el operario cargó en el DOM
  function obtenerRellenosDeDOM(l) {
    // 'l' ya viene en minúsculas desde guardar()
    const container = document.getElementById(`proc-rellenos-${l}`);
    if (!container) return [];
    const rows = container.querySelectorAll('.relleno-row');
    const res = [];
    rows.forEach(row => {
      const mol = row.querySelector('.relleno-molino')?.value;
      const cil = row.querySelector('.relleno-cilindro')?.value;
      if (mol && cil) res.push({ molino: mol, cilindro: cil });
    });
    return res;
  }

  function volcarDatosAlFormulario(datos) {
    document.getElementById('proc-obs').value = datos.obs || '';
    
    lineas.forEach(linea => {
      const l = linea.toLowerCase(); // Estandarización
      const data = datos[linea];
      if (!data) return;

      document.getElementById(`proc-caudal-${l}`).value = data.caudal_agua || '';
      document.getElementById(`proc-ingreso-${l}`).value = data.ingreso_agua || '';
      document.getElementById(`proc-aceite-trans-${l}`).value = data.aceite_transmision || '';
      document.getElementById(`proc-aceite-mol-${l}`).value = data.aceite_molinos || '';
      document.getElementById(`proc-electrodo-${l}`).value = data.kilos_electrodo || '';

      if (data.velocidades) {
        for (let i = 1; i <= 6; i++) {
          const input = document.getElementById(`proc-vel-${l}-m${i}`);
          if (input) input.value = data.velocidades[`m${i}`] || '';
        }
      }

      // Limpiar y regenerar rellenos existentes
      const container = document.getElementById(`proc-rellenos-${l}`);
      if (container) container.innerHTML = '';
      if (data.rellenos && data.rellenos.length > 0) {
        // Paso 'l' (minúscula) a addRelleno
        data.rellenos.forEach(r => addRelleno(l, r.molino, r.cilindro));
      }
    });
  }

  function limpiarFormulario() {
    document.getElementById('proc-obs').value = '';
    lineas.forEach(linea => {
      const l = linea.toLowerCase(); // Estandarización
      document.getElementById(`proc-caudal-${l}`).value = '';
      document.getElementById(`proc-ingreso-${l}`).value = '';
      document.getElementById(`proc-aceite-trans-${l}`).value = '';
      document.getElementById(`proc-aceite-mol-${l}`).value = '';
      document.getElementById(`proc-electrodo-${l}`).value = '';
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`proc-vel-${l}-m${i}`);
        if (input) input.value = '';
      }
      const container = document.getElementById(`proc-rellenos-${l}`);
      if (container) container.innerHTML = '';
    });
  }

  function ocultarHistorial() {
    const historialDiv = document.getElementById('historial-proceso');
    const btn = document.getElementById('btn-ver-historial');
    if (historialDiv) historialDiv.style.display = 'none';
    if (btn) btn.textContent = '📈 VER HISTORIAL';
    historialVisible = false;
  }

  function configurarEventos() {
    const btnGuardar = document.getElementById('btn-guardar-proceso');
    if (btnGuardar) btnGuardar.onclick = guardar;
    
    const btnHistorial = document.getElementById('btn-ver-historial');
    if (btnHistorial) btnHistorial.onclick = toggleHistorial;
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================
  return {
    init,
    guardar,
    toggleHistorial,
    toggleAcordeon,
    addRelleno 
  };

})();