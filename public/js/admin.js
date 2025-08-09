// public/js/admin.js
(async function(){
  await setNavUser();

  // Sidebar toggle (mobile)
  const toggleBtn = document.getElementById('btnToggleSidebar');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const sb = document.getElementById('adminSidebar');
    if (!sb) return;
    sb.classList.toggle('show');
  });

  // Logout
  document.getElementById('btn-logout-top')?.addEventListener('click', ()=> { localStorage.removeItem('token'); location.href = '/'; });
  document.getElementById('btn-logout-side')?.addEventListener('click', ()=> { localStorage.removeItem('token'); location.href = '/'; });

  // Socket.io
  const socket = io();

  // === WA Events ===
  socket.on('qr', (qr) => {
    const img = document.getElementById('qrImage');
    const pre = document.getElementById('qrRaw');
    if (img) {
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURIComponent(qr);
      img.style.display = '';
    }
    if (pre) {
      pre.innerText = qr;
      pre.style.display = '';
    }
    document.getElementById('waState').innerText = 'Scan QR untuk login';
    toastr.info('QR Code diperbarui, silakan scan di WhatsApp');
  });

  socket.on('ready', ()=> {
    document.getElementById('waState').innerText = 'Connected';
    toastr.success('WhatsApp berhasil terhubung');
    document.getElementById('qrImage').style.display = 'none';
    document.getElementById('qrRaw').style.display = 'none';
  });

  socket.on('connection.update', (u) => {
    document.getElementById('waState').innerText = u.connection || JSON.stringify(u);
    if (u.connection === 'close') {
      toastr.warning('Koneksi terputus, mencoba reconnect...');
    }
  });

  socket.on('message.new', (msg) => {
    toastr.info(`Pesan baru dari ${msg.from}: ${msg.text}`);
    const logsArea = document.getElementById('logsArea');
    if (logsArea) logsArea.insertAdjacentHTML('afterbegin', `<div class="border-bottom py-1 small">${new Date().toLocaleString()} • Message from ${msg.from}: ${msg.text}</div>`);
  });

  socket.on('log', (m) => {
    const logsArea = document.getElementById('logsArea');
    if (logsArea) logsArea.insertAdjacentHTML('afterbegin', `<div class="border-bottom py-1 small text-muted">${new Date().toLocaleString()} • ${typeof m === 'string' ? m : JSON.stringify(m)}</div>`);
  });

  // Left menu click
  document.getElementById('adminSidebar')?.addEventListener('click', async (ev) => {
    const a = ev.target.closest('a[data-page]');
    if (!a) return;
    ev.preventDefault();
    document.querySelectorAll('#adminSidebar a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const page = a.getAttribute('data-page');
    await loadAdminPage(page);
  });

  // Initial load
  await loadAdminPage('dashboard');

  // Modal instance
  const userModalEl = document.getElementById('userModal');
  const userModal = userModalEl ? new bootstrap.Modal(userModalEl) : null;

  // Load admin pages
  async function loadAdminPage(page) {
    const area = document.getElementById('adminPages');
    if (!area) return;
    showLoading();
    try {
      if (page === 'dashboard') {
        area.innerHTML = `
          <div class="row g-3">
            <div class="col-md-4"><div class="card p-3"><h6>Status WA</h6><div id="waState" class="fs-5 text-success">—</div></div></div>
            <div class="col-md-4"><div class="card p-3"><h6>Pesan tersimpan</h6><div id="statMessages" class="fs-5">—</div></div></div>
            <div class="col-md-4"><div class="card p-3"><h6>Kontak</h6><div id="statContacts" class="fs-5">—</div></div></div>
          </div>
          <div class="mt-3 text-center">
            <img id="qrImage" style="max-width:250px; display:none;">
            <pre id="qrRaw" style="display:none; background:#f9f9f9; padding:10px;"></pre>
          </div>
        `;
        try {
          const msgs = await apiFetch('/api/messages');
          if (msgs && msgs.ok) document.getElementById('statMessages').innerText = msgs.messages.length;
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
})();
