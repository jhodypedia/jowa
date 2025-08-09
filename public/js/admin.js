// public/js/admin.js
(async function(){
  await setNavUser();

  // sidebar toggle (mobile)
  const toggleBtn = document.getElementById('btnToggleSidebar');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const sb = document.getElementById('adminSidebar');
    if (!sb) return;
    sb.classList.toggle('show');
  });

  // logout handlers
  document.getElementById('btn-logout-top')?.addEventListener('click', ()=> { localStorage.removeItem('token'); location.href = '/'; });
  document.getElementById('btn-logout-side')?.addEventListener('click', ()=> { localStorage.removeItem('token'); location.href = '/'; });

  // socket io
  const socket = io();
  socket.on('qr', (data) => {
    const img = document.getElementById('qrImage');
    const pre = document.getElementById('qrRaw');
    if (img) { img.src = data; img.style.display = ''; }
    if (pre) pre.style.display = 'none';
  });
  socket.on('ready', ()=> {
    document.getElementById('waState').innerText = 'Connected';
    toastr.success('WhatsApp connected');
  });
  socket.on('connection.update', (u) => { document.getElementById('waState').innerText = u.connection || JSON.stringify(u); });
  socket.on('log', (m) => {
    const logsArea = document.getElementById('logsArea');
    if (logsArea) logsArea.insertAdjacentHTML('afterbegin', `<div class="border-bottom py-1 small text-muted">${new Date().toLocaleString()} • ${typeof m === 'string' ? m : JSON.stringify(m)}</div>`);
  });

  // left menu click
  document.getElementById('adminSidebar')?.addEventListener('click', async (ev) => {
    const a = ev.target.closest('a[data-page]');
    if (!a) return;
    ev.preventDefault();
    document.querySelectorAll('#adminSidebar a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const page = a.getAttribute('data-page');
    await loadAdminPage(page);
  });

  // initial load
  await loadAdminPage('dashboard');

  // modal instance
  const userModalEl = document.getElementById('userModal');
  const userModal = userModalEl ? new bootstrap.Modal(userModalEl) : null;

  async function loadAdminPage(page) {
    const area = document.getElementById('adminPages');
    if (!area) return;
    showLoading();
    try {
      if (page === 'dashboard') {
        area.innerHTML = `
          <div class="row g-3">
            <div class="col-md-4"><div class="card p-3"><h6>Koneksi</h6><div id="statConnection" class="fs-5 text-success">—</div></div></div>
            <div class="col-md-4"><div class="card p-3"><h6>Pesan tersimpan</h6><div id="statMessages" class="fs-5">—</div></div></div>
            <div class="col-md-4"><div class="card p-3"><h6>Kontak</h6><div id="statContacts" class="fs-5">—</div></div></div>
          </div>
        `;
        // optional stats load
        try {
          const msgs = await apiFetch('/api/messages');
          if (msgs && msgs.ok) document.getElementById('statMessages').innerText = msgs.messages.length;
          else document.getElementById('statMessages').innerText = '-';
          const contacts = await apiFetch('/api/contacts');
          if (contacts && contacts.ok) document.getElementById('statContacts').innerText = contacts.contacts.length;
        } catch(e){}
      }

      else if (page === 'send') {
        area.innerHTML = `
          <div class="card p-3">
            <h5>Kirim Pesan</h5>
            <form id="formSendText">
              <input name="jid" class="form-control mb-2" placeholder="62812...@s.whatsapp.net" required>
              <textarea name="text" class="form-control mb-2" rows="4" placeholder="Pesan..." required></textarea>
              <button class="btn btn-primary">Kirim</button>
            </form>
          </div>
        `;
        document.getElementById('formSendText').addEventListener('submit', async (e)=>{
          e.preventDefault();
          const jid = e.target.jid.value.trim(), text = e.target.text.value.trim();
          if (!jid || !text) return toastr.error('JID & pesan diperlukan');
          showLoading();
          try {
            const r = await apiFetch('/api/messages/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ jid, text }) });
            if (r.ok) { toastr.success('Terkirim'); e.target.reset(); } else toastr.error(r.error || r.message || 'Gagal');
          } catch (err) { toastr.error('Error'); }
          hideLoading();
        });
      }

      else if (page === 'send-media') {
        area.innerHTML = `
          <div class="card p-3">
            <h5>Kirim Media</h5>
            <form id="formSendMedia" enctype="multipart/form-data">
              <input name="jid" class="form-control mb-2" placeholder="62812...@s.whatsapp.net" required>
              <input type="file" name="file" class="form-control mb-2" required>
              <input name="caption" class="form-control mb-2" placeholder="Caption (opsional)">
              <button class="btn btn-primary">Kirim</button>
            </form>
          </div>
        `;
        document.getElementById('formSendMedia').addEventListener('submit', async (e)=>{
          e.preventDefault();
          const fd = new FormData(e.target);
          showLoading();
          try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/messages/sendmedia', { method:'POST', headers: { 'Authorization': 'Bearer '+token }, body: fd });
            const j = await res.json();
            if (j.ok) { toastr.success('Media terkirim'); e.target.reset(); } else toastr.error(j.error || j.message || 'Gagal');
          } catch (err) { toastr.error('Error upload'); }
          hideLoading();
        });
      }

      else if (page === 'contacts') {
        area.innerHTML = `<div class="card p-3"><h5>Kontak</h5><div id="contactsList" class="mt-2">Memuat...</div></div>`;
        try {
          const r = await apiFetch('/api/contacts');
          if (!r.ok) return document.getElementById('contactsList').innerHTML = `<div class="text-danger">Gagal: ${r.error||r.message}</div>`;
          const list = r.contacts || [];
          document.getElementById('contactsList').innerHTML = list.map(c => `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div><strong>${c.name||c.waId||c.id}</strong><div class="small text-muted">${c.waId||c.id}</div></div>
            <div><button data-jid="${c.waId||c.id}" class="btn btn-sm btn-outline-primary btn-send">Kirim</button></div>
          </div>`).join('');
          document.querySelectorAll('.btn-send').forEach(b => b.addEventListener('click', (ev)=>{
            const jid = ev.target.dataset.jid;
            document.querySelector('#adminSidebar a[data-page="send"]').click();
            setTimeout(()=> { document.querySelector('#formSendText input[name=jid]').value = jid; }, 300);
          }));
        } catch(e){ document.getElementById('contactsList').innerHTML = `<div class="text-danger">Error ambil kontak</div>`; }
      }

      else if (page === 'users') {
        area.innerHTML = `<div class="card p-3"><h5>Users</h5><div class="mb-2"><button id="btnAddUser" class="btn btn-success btn-sm">Buat User</button></div><div id="usersList">Memuat...</div></div>`;
        await loadUsers();
        document.getElementById('btnAddUser').addEventListener('click', ()=> openUserModal(null));
      }

      else if (page === 'logs') {
        area.innerHTML = `<div class="card p-3"><div class="d-flex justify-content-between align-items-center mb-2">
          <h5>Logs</h5>
          <div><input id="logsQuery" class="form-control form-control-sm" placeholder="Cari teks..." style="width:220px; display:inline-block;"/></div>
        </div><div id="logsArea" style="max-height:400px;overflow:auto;font-family:monospace;"></div></div>`;
        const loadLogs = async (q='') => {
          const url = '/api/logs' + (q ? '?q=' + encodeURIComponent(q) : '');
          const r = await apiFetch(url);
          if (!r.ok) return document.getElementById('logsArea').innerHTML = '<div class="text-danger">Gagal ambil logs</div>';
          document.getElementById('logsArea').innerHTML = r.logs.map(L => `<div class="border-bottom py-1"><small class="text-muted">${new Date(L.createdAt).toLocaleString()}</small><div>${L.type} — ${L.message}</div></div>`).join('');
        };
        await loadLogs();
        document.getElementById('logsQuery').addEventListener('input', (ev) => {
          const q = ev.target.value;
          if (window._logsTimer) clearTimeout(window._logsTimer);
          window._logsTimer = setTimeout(()=> loadLogs(q), 400);
        });
      }

    } catch (e) {
      area.innerHTML = `<div class="alert alert-danger">Gagal memuat halaman</div>`;
    } finally { hideLoading(); }
  }

  // user functions
  async function loadUsers() {
    const el = document.getElementById('usersList');
    el.innerHTML = 'Memuat...';
    try {
      const r = await apiFetch('/api/users');
      if (!r.ok) return el.innerHTML = `<div class="text-danger">Gagal: ${r.error||r.message}</div>`;
      el.innerHTML = r.users.map(u => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div>
            <b>${u.username}</b>
            <div class="small text-muted">${u.email}</div>
            <div class="small">role:${u.role} • premium:${u.premium}</div>
          </div>
          <div>
            <button data-id="${u.id}" class="btn btn-sm btn-outline-primary btn-edit">Edit</button>
            <button data-id="${u.id}" class="btn btn-sm btn-danger btn-del">Del</button>
          </div>
        </div>
      `).join('');
      document.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', async (ev)=> {
        if (!confirm('Hapus user?')) return;
        const id = ev.target.dataset.id;
        const res = await apiFetch('/api/users/' + id, { method: 'DELETE' });
        if (res.ok) { toastr.success('Dihapus'); loadUsers(); } else toastr.error('Gagal');
      }));
      document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async (ev)=> {
        const id = ev.target.dataset.id;
        const r = await apiFetch('/api/users/' + id);
        if (!r.ok) return toastr.error('Gagal ambil user');
        openUserModal(r.user);
      }));
    } catch(e) { el.innerHTML = `<div class="text-danger">Error</div>`; }
  }

  function openUserModal(user = null) {
    if (!user) {
      document.querySelector('#userModalLabel').innerText = 'Buat User Baru';
      document.querySelector('#userModalForm [name=id]').value = '';
      document.querySelector('#userModalForm [name=username]').value = '';
      document.querySelector('#userModalForm [name=email]').value = '';
      document.querySelector('#userModalForm [name=password]').value = '';
      document.querySelector('#userModalForm [name=role]').value = 'member';
      document.querySelector('#userModalForm [name=premium]').checked = false;
    } else {
      document.querySelector('#userModalLabel').innerText = 'Edit User';
      document.querySelector('#userModalForm [name=id]').value = user.id;
      document.querySelector('#userModalForm [name=username]').value = user.username;
      document.querySelector('#userModalForm [name=email]').value = user.email;
      document.querySelector('#userModalForm [name=password]').value = '';
      document.querySelector('#userModalForm [name=role]').value = user.role;
      document.querySelector('#userModalForm [name=premium]').checked = !!user.premium;
    }
    if (userModal) userModal.show();
  }

  document.getElementById('userModalForm')?.addEventListener('submit', async function(e){
    e.preventDefault();
    const id = this.id.value;
    const payload = {
      username: this.username.value.trim(),
      email: this.email.value.trim(),
      role: this.role.value,
      premium: this.premium.checked
    };
    if (this.password.value) payload.password = this.password.value;
    showLoading();
    try {
      let res;
      if (!id) {
        res = await apiFetch('/api/auth/register', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/users/' + id, {
          method: 'PUT',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        toastr.success('Sukses');
        loadUsers();
        if (userModal) userModal.hide();
      } else {
        toastr.error(res.error || res.message || 'Gagal');
      }
    } catch (e) { toastr.error('Error'); }
    hideLoading();
  });

})();
