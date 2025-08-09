// public/js/main.js
window.apiFetch = async function(url, opts = {}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem("token");
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (!opts.method) opts.method = "GET";
  try {
    const res = await fetch(url, opts);
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("application/json")) return res.json();
    return res;
  } catch (e) {
    throw e;
  }
};

window.showLoading = function() {
  if (!document.getElementById('global-loading')) {
    const el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.style.display = 'flex';
    el.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"></div><div class="mt-2">Memproses...</div></div>';
    document.body.appendChild(el);
  } else document.getElementById('global-loading').style.display = 'flex';
};

window.hideLoading = function(){ const el = document.getElementById('global-loading'); if (el) el.style.display = 'none'; };

window.setNavUser = async function() {
  try {
    const r = await apiFetch('/api/auth/me');
    if (r.ok && r.user) {
      const name = r.user.username || r.user.email;
      const nameEl = document.getElementById('nav-user-name');
      const roleEl = document.getElementById('nav-user-role');
      if (nameEl) nameEl.innerText = name;
      if (roleEl) roleEl.innerText = r.user.role + (r.user.premium ? ' • premium' : '');
    }
  } catch(e){}
};
