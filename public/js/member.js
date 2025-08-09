// public/js/member.js
(async function(){
  await setNavUser();
  const token = localStorage.getItem("token");
  if (!token) { location.href = '/'; return; }

  const r = await apiFetch('/api/auth/me');
  if (!r.ok) { toastr.error('Gagal ambil profil'); return; }
  const user = r.user;
  document.getElementById('member-info').innerText = `User: ${user.username} • role: ${user.role} • premium: ${user.premium}`;

  if (!user.premium && user.role !== 'admin') {
    // disable send form
    const f = document.getElementById('member-send-form');
    f.querySelectorAll('input,textarea,button').forEach(x=>x.disabled = true);
    f.insertAdjacentHTML('afterend', '<div class="alert alert-warning mt-2">Akses fitur dibatasi. Upgrade ke premium untuk menggunakannya.</div>');
  }

  document.getElementById('member-send-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const jid = e.target.jid.value.trim(), text = e.target.text.value.trim();
    if (!jid || !text) return toastr.error('jid & text required');
    showLoading();
    const res = await apiFetch('/api/messages/send', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid, text }) });
    hideLoading();
    if (res.ok) { toastr.success('Terkirim'); e.target.reset(); } else toastr.error(res.message || res.error || 'Gagal');
  });
})();
