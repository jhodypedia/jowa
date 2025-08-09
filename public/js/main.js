// public/js/main.js
window.apiFetch = async function(url, opts = {}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem("token");
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (!opts.method) opts.method = "GET";
  const res = await fetch(url, opts);
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  } else {
    return res;
  }
};

window.showLoading = function() {
  if (!document.getElementById('global-loading')) {
    const el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"></div><div class="mt-2">Memproses...</div></div>';
    document.body.appendChild(el);
  }
  document.getElementById('global-loading').style.display = 'flex';
};
window.hideLoading = function() {
  const el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
};

// set current nav user (call on page load)
window.setNavUser = async function() {
  const token = localStorage.getItem("token");
  const elName = document.getElementById("nav-user-name");
  const elRole = document.getElementById("nav-user-role");
  if (!token) {
    if (elName) elName.innerText = "—";
    if (elRole) elRole.innerText = "—";
    return;
  }
  try {
    const r = await apiFetch("/api/auth/me", { headers: { Authorization: "Bearer " + token } });
    if (r.ok && r.user) {
      if (elName) elName.innerText = r.user.username;
      if (elRole) elRole.innerText = r.user.role + (r.user.premium ? " • premium" : "");
    } else {
      if (elName) elName.innerText = "—";
      if (elRole) elRole.innerText = "—";
    }
  } catch(e) {}
};

// logout handler for header buttons
document.addEventListener('click', function(e){
  if (e.target && (e.target.id === 'btn-logout-top' || e.target.id === 'btn-logout')) {
    localStorage.removeItem('token');
    window.location.href = '/';
  }
});
