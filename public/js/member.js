// public/js/member.js
(async function(){
  await setNavUser();
  const token = localStorage.getItem("token");
  if (!token) { location.href = '/'; return; }

  const r = await apiFetch('/api/auth/me');
  if (r.ok) {
    document.getElementById('memberInfo').innerText = `User: ${r.user.username} • role: ${r.user.role} • premium: ${r.user.premium}`;
    if (!r.user.premium && r.user.role !== 'admin') {
      document.getElementById('memberSend').querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);
      document.getElementById('memberSend').insertAdjacentHTML('afterend','<div class="alert alert-warning mt-2">Akses fitur dibatasi. Hubungi admin untuk upgrade.</div>');
    }
  }

  document.getElementById('btn-logout-lite')?.addEventListener('click', ()=> { localStorage.removeItem('token'); location.href='/'; });

  document.getElementById('memberSend')?.addEventListener('submit', async function(e){
    e.preventDefault();
    const jid = this.jid.value.trim(), text = this.text.value.trim();
    if (!jid || !text) return toastr.error('JID & pesan diperlukan');
    showLoading();
    const res = await apiFetch('/api/messages/send', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid, text }) });
    hideLoading();
    if (res.ok) { toastr.success('Terkirim'); this.reset(); } else toastr.error(res.message || res.error || 'Gagal (cek premium)');
  });
})();
