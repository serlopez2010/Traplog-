/**
 * TRAPLOG - MÓDULO DE ADMINISTRACIÓN (admin.js)
 * Gestión de usuarios, roles y permisos.
 */
const TrapAdmin = (function() {
  
  let usuarios = [];

  // ------- CARGA INICIAL -------
  async function init() {
    const list = document.getElementById('user-list');
    if (!list) return;
    
    list.innerHTML = '<div style="color:var(--text2);font-size:12px;padding:12px">Cargando usuarios...</div>';
    
    // Intentar traer de Google Sheets, si falla usar caché local
    try {
      const res = await db_getUsuarios();
      if (res.ok) {
        usuarios = res.usuarios;
        saveUsersCache(usuarios);
      } else {
        usuarios = JSON.parse(localStorage.getItem('vt_users_cache') || '[]');
      }
    } catch (err) {
      usuarios = JSON.parse(localStorage.getItem('vt_users_cache') || '[]');
    }
    
    renderList();
  }

  function saveUsersCache(u) {
    localStorage.setItem('vt_users_cache', JSON.stringify(u));
  }

  // ------- CREAR USUARIO -------
  async function addUser() {
    const n = document.getElementById('nu-name').value.trim();
    const p = document.getElementById('nu-pass').value.trim();
    const r = document.getElementById('nu-role').value;

    if (!n || !p) { toast('⚠️ Completá nombre y contraseña'); return; }
    if (usuarios.find(u => u.name === n)) { toast('⚠️ Ese usuario ya existe'); return; }

    const nuevoUser = { name: n, pass: p, role: r, activo: true };
    usuarios.push(nuevoUser);
    saveUsersCache(usuarios);
    
    // Limpiar formulario
    document.getElementById('nu-name').value = '';
    document.getElementById('nu-pass').value = '';

    toast('⏳ Guardando usuario...');
    renderList();

    const res = await db_saveUsuario(nuevoUser);
    toast(res.ok ? '✅ Usuario creado' : '⚠️ Error al guardar en Sheets: ' + res.error);
  }

  // ------- ELIMINAR USUARIO -------
  async function delUser(name) {
    if (name === 'admin') { toast('⚠️ No podés eliminar el admin principal'); return; }
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return;

    usuarios = usuarios.filter(u => u.name !== name);
    saveUsersCache(usuarios);
    renderList();

    const res = await db_deleteUsuario(name);
    toast(res.ok ? '✅ Eliminado' : '⚠️ Error al eliminar en Sheets: ' + res.error);
  }

  // ------- EDITAR USUARIO (Toggle formulario) -------
  function toggleEdit(name) {
    const form = document.getElementById('edit-user-form-' + name);
    if (form) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
  }

  // ------- GUARDAR EDICIÓN -------
  async function saveEditUser(name) {
    const newPass = document.getElementById('edit-pass-' + name).value.trim();
    const newRole = document.getElementById('edit-role-sel-' + name).value;
    const u = usuarios.find(x => x.name === name);
    if (!u) return;

    if (newPass) u.pass = newPass;
    u.role = newRole;

    saveUsersCache(usuarios);
    toast('⏳ Actualizando usuario...');
    renderList();

    const cambios = { name, role: newRole, activo: u.activo };
    if (newPass) cambios.pass = newPass;

    const res = await db_saveUsuario(cambios);
    toast(res.ok ? '✅ Usuario actualizado' : '⚠️ Error al actualizar en Sheets: ' + res.error);
  }

  // ------- RENDERIZADO DE LISTA -------
  function renderList() {
    const list = document.getElementById('user-list');
    if (!list) return;

    const rl = { admin: '👑 ADMIN', editor: '✏️ EDITOR', viewer: '👁 LECTOR' };
    const rc = { admin: 'role-admin', editor: 'role-editor', viewer: 'role-viewer' };

    list.innerHTML = usuarios.map(u => `
      <div class="admin-card">
        <div class="admin-card-top">
          <div style="flex:1">
            <div class="admin-name">${u.name}</div>
            <div class="admin-role ${rc[u.role]}">${rl[u.role]}</div>
          </div>
          <div class="admin-actions">
            <button class="btn-edit-user" onclick="TrapAdmin.toggleEdit('${u.name}')">✏️ EDITAR</button>
            <button class="btn-del" onclick="TrapAdmin.delUser('${u.name}')">🗑</button>
          </div>
        </div>
        <div class="user-edit-form" id="edit-user-form-${u.name}">
          <div class="field-group" style="margin-bottom:8px">
            <label>NUEVA CONTRASEÑA (dejar vacío para no cambiar)</label>
            <input type="password" id="edit-pass-${u.name}" placeholder="nueva contraseña...">
          </div>
          <div class="field-group" style="margin-bottom:8px">
            <label>ROL</label>
            <select id="edit-role-sel-${u.name}" style="font-size:13px;padding:8px">
              <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
              <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Lector</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <button class="btn btn-ok" onclick="TrapAdmin.saveEditUser('${u.name}')" style="margin-top:0;padding:10px;font-size:15px">GUARDAR CAMBIOS</button>
        </div>
      </div>
    `).join('');
  }

  // Devolvemos solo lo que necesita interactuar con el HTML
  return { init, addUser, delUser, toggleEdit, saveEditUser };

})();
