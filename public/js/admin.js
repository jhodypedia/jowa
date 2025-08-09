// public/js/admin.js
(async function(){
  await setNavUser();

  const socket = io();
  const token = localStorage.getItem("token");
  if (!token) { location.href = '/'; return; }

  // sidebar click
  document.getElementById("left-menu").addEventListener("click", async (ev) => {
    const a = ev.target.closest('a[data-page]');
    if (!a) return;
    ev.preventDefault();
    document.querySelectorAll('#left-menu a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const page = a.getAttribute('data-page');
    await loadPage(page);
  });

  // initial
  await loadPage('dashboard');

  // socket events
  socket.on("qr", (dataUrl) => {
    const img = document.getElementById('qrImage');
    const pre = document.getElementById('qrRaw');
    if (img) { img.src = dataUrl; img.style.display = ''; }
    if (pre) { pre.style.display = 'none'; }
  });
  socket.on("ready", () => {
    document.getElementById('waState').innerText = 'Connected';
    toastr.success("WhatsApp connected");
  });
  socket.on("connection.update", (u) => {
    document.getElementById('waState').innerText = u.connection || JSON.stringify(u);
    addLog("connection.update " + JSON.stringify(u));
  });
  socket.on("log", (m) => addLog(m));
  socket.on("messages.upsert", (m) => addLog("message: " + JSON.stringify(m)));

  // utilities
  function addLog(txt) {
    const logs = document.getElementById('logs');
    if (!logs) return;
    const d = document.createElement('div');
    d.textContent = new Date().toLocaleString() + ' • ' + txt;
    logs.prepend(d);
  }

  async function loadPage(name) {
    const container = document.getElementById('pageArea');
    // keep QR area if dashboard
    if (name === 'dashboard') {
      container.innerHTML = document.querySelector('#qrContainer').outerHTML;
      return;
    }
    showLoading();
    try {
      if (name === 'send') {
        container.innerHTML = `
          <div class="card p-3">
            <h5>Kirim Pesan Teks</h5>
            <form id="form-send-text">
              <input name="jid" class="form-control mb-2" placeholder="628123...@s.whatsapp.net" required>
              <textarea name="text" class="form-control mb-2" rows="4" placeholder="Pesan..." required></textarea>
              <div class="d-flex gap-2">
                <button class="btn btn-primary">Kirim</button>
                <button id="btn-test-broadcast" class="btn btn-outline-secondary">Broadcast ke semua kontak</button>
              </div>
            </form>
          </div>`;
        document.getElementById('form-send-text').addEventListener('submit', async (e)=>{
          e.preventDefault();
          const jid = e.target.jid.value.trim(), text = e.target.text.value.trim();
          if (!jid || !text) return toastr.error("JID & text required");
          showLoading();
          try {
            const r = await apiFetch('/api/messages/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid, text }) });
            if (r.ok) { toastr.success('Terkirim'); e.target.reset(); addLog('sent text to '+jid); } else toastr.error(r.message || r.error || 'Gagal');
          } catch (err) { toastr.error('Error'); }
          hideLoading();
        });
        document.getElementById('btn-test-broadcast').addEventListener('click', async (ev)=>{
          ev.preventDefault();
          if (!confirm('Kirim broadcast simulasi ke semua kontak di DB?')) return;
          showLoading();
          try {
            const contacts = await apiFetch('/api/contacts', { headers: {} });
            if (!contacts.ok) { toastr.error('Gagal ambil kontak'); hideLoading(); return; }
            for (const c of contacts.contacts) {
              await apiFetch('/api/messages/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ jid: c.id || c.waId, text: 'Broadcast test' }) });
            }
            toastr.success('Broadcast selesai');
          } catch(e) { toastr.error('Error broadcast'); }
          hideLoading();
        });
      }

      else if (name === 'send-media') {
        container.innerHTML = `
          <div class="card p-3">
            <h5>Kirim Media</h5>
            <form id="form-send-media" enctype="multipart/form-data">
              <input name="jid" class="form-control mb-2" placeholder="628123...@s.whatsapp.net" required>
              <input type="file" name="file" class="form-control mb-2" required>
              <input name="caption" class="form-control mb-2" placeholder="Caption (opsional)">
              <button class="btn btn-primary">Kirim Media</button>
            </form>
          </div>`;
        document.getElementById('form-send-media').addEventListener('submit', async (e)=>{
          e.preventDefault();
          const form = e.target;
          const data = new FormData(form);
          showLoading();
          try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/messages/sendmedia', { method:'POST', headers: { 'Authorization': 'Bearer '+token }, body: data });
            const j = await res.json();
            if (j.ok) { toastr.success('Media terkirim'); form.reset(); addLog('sent media to '+data.get('jid')); }
            else toastr.error(j.error || j.message || 'Gagal');
          } catch (err) { toastr.error('Error upload'); }
          hideLoading();
        });
      }

      else if (name === 'contacts') {
        container.innerHTML = `<div class="card p-3"><h5>Kontak</h5><div id="contactsList" class="mt-2"></div></div>`;
        const list = document.getElementById('contactsList');
        showLoading();
        const r = await apiFetch('/api/contacts');
        hideLoading();
        if (!r.ok) return list.innerHTML = `<div class="text-danger">Gagal: ${r.error||r.message}</div>`;
        list.innerHTML = r.contacts.map(c => `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div><strong>${c.name || c.waId}</strong><div class="small text-muted">${c.waId || c.id}</div></div>
          <div><button data-jid="${c.waId || c.id}" class="btn btn-sm btn-outline-primary btn-send">Kirim</button></div>
        </div>`).join('');
        list.querySelectorAll('.btn-send').forEach(btn=>btn.addEventListener('click', (ev)=>{
          const jid = ev.target.dataset.jid;
          // open send page and populate
          document.querySelector('#left-menu a[data-page="send"]').click();
          setTimeout(()=> { document.querySelector('#form-send-text input[name=jid]').value = jid; }, 300);
        }));
      }

      else if (name === 'chats') {
        container.innerHTML = `<div class="card p-3"><h5>Chats</h5><div id="chatsList" class="mt-2 text-muted">Memuat...</div></div>`;
        showLoading();
        const r = await apiFetch('/api/wa/contacts'); // fallback: we used /api/contacts; if chats endpoint exists use it
        hideLoading();
        // if r.ok -> show otherwise show message
        if (!r.ok) document.getElementById('chatsList').innerHTML = `<div class="text-muted">Tidak ada data chat (backend mungkin belum expose chats).</div>`;
        else document.getElementById('chatsList').innerHTML = JSON.stringify(r);
      }

      else if (name === 'users') {
        container.innerHTML = `<div class="card p-3"><h5>Manage Users</h5>
          <div class="mb-3"><button id="btn-add-user" class="btn btn-success btn-sm">Buat User</button></div>
          <div id="usersList"></div></div>`;
        await loadUsers();
        document.getElementById('btn-add-user').addEventListener('click', ()=> openUserModal());
      }

      else if (name === 'logs') {
        container.innerHTML = `<div class="card p-3"><h5>Logs</h5><div id="logs" style="max-height:400px;overflow:auto;font-family:monospace;"></div></div>`;
      }

    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error load page</div>`;
    } finally { hideLoading(); }
  }

  // load users
  async function loadUsers() {
    showLoading();
    const r = await apiFetch('/api/users');
    hideLoading();
    if (!r.ok) { toastr.error('Gagal ambil users'); return; }
    const el = document.getElementById('usersList');
    el.innerHTML = '';
    r.users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'border p-2 mb-2 d-flex justify-content-between align-items-center';
      div.innerHTML = `<div><b>${u.username}</b> <div class="small text-muted">${u.email}</div><div class="small">role: ${u.role} • premium: ${u.premium}</div></div>
        <div>
          <button data-id="${u.id}" class="btn btn-sm btn-outline-primary btn-edit">Edit</button>
          <button data-id="${u.id}" class="btn btn-sm btn-danger btn-del">Del</button>
        </div>`;
      el.appendChild(div);
    });
    el.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', async (ev)=>{
      if (!confirm('Hapus user?')) return;
      const id = ev.target.dataset.id;
      showLoading();
      const res = await apiFetch('/api/users/' + id, { method:'DELETE' });
      hideLoading();
      if (res.ok) { toastr.success('Dihapus'); loadUsers(); } else toastr.error('Gagal');
    }));
    el.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', async (ev)=>{
      const id = ev.target.dataset.id;
      const r = await apiFetch('/api/users/' + id);
      if (!r.ok) return toastr.error('Gagal ambil user');
      openUserModal(r.user);
    }));
  }

  // simple user modal using prompt (quick)
  function openUserModal(user = null) {
    const isNew = !user;
    const username = prompt('Username', user?.username || '');
    if (!username) return;
    const email = prompt('Email', user?.email || '');
    if (!email) return;
    const role = prompt('Role (admin/member)', user?.role || 'member');
    const premium = confirm('Set premium? (OK = yes)');
    const pw = isNew ? prompt('Password (set for new user)', '') : (confirm('Ganti password?') ? prompt('Password baru') : null);
    (async ()=>{
      showLoading();
      const payload = { username, email, role, premium };
      if (pw) payload.password = pw;
      try {
        let res;
        if (isNew) res = await apiFetch('/api/auth/register', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        else res = await apiFetch('/api/users/' + user.id, { method:'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (res.ok) { toastr.success('Sukses'); loadUsers(); } else toastr.error(res.error || res.message || 'Gagal');
      } catch (e) { toastr.error('Error'); }
      hideLoading();
    })();
  }

})();
