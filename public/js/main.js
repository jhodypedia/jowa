// public/js/main.js
window.apiFetch = async function(url, opts = {}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('token');
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, opts);
  try { return await res.json(); } catch(e) { return { ok:false, error: 'Invalid response' }; }
};

// quick logout from UI (header buttons)
document.addEventListener('click', (ev) => {
  if (ev.target && ev.target.id === 'btn-logout-top') {
    localStorage.removeItem('token'); window.location.href = '/';
  }
  if (ev.target && ev.target.id === 'btn-logout-side') {
    localStorage.removeItem('token'); window.location.href = '/';
  }
});
