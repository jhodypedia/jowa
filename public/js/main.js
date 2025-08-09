// public/js/main.js
window.apiFetch = async function (url, opts = {}) {
    opts.headers = opts.headers || {};
    const token = localStorage.getItem('token');
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(url, opts);
    try {
        return await res.json();
    } catch (e) {
        return { ok: false, error: 'Invalid response' };
    }
};

// Logout dari UI
document.addEventListener('click', (ev) => {
    if (ev.target && (ev.target.id === 'btn-logout-top' || ev.target.id === 'btn-logout-side')) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
});

// WA Panel
document.addEventListener('DOMContentLoaded', () => {
    const qrImg = document.getElementById('qrImage');
    const waState = document.getElementById('waState');
    const btnRefreshQR = document.getElementById('btn-refresh-qr');
    const btnLogoutWA = document.getElementById('btn-logout-wa');

    async function updateWAStatus() {
        const status = await apiFetch('/api/wa/status');
        if (status.connected) {
            waState.textContent = 'Connection: Connected ✅';
            qrImg.style.display = 'none';
        } else {
            waState.textContent = 'Connection: Not Connected ❌';
            const qr = await apiFetch('/api/wa/qr');
            if (qr.qr) {
                qrImg.src = qr.qr;
                qrImg.style.display = 'block';
            }
        }
    }

    if (btnRefreshQR) {
        btnRefreshQR.addEventListener('click', async () => {
            toastr.info('Refreshing QR...');
            await updateWAStatus();
        });
    }

    if (btnLogoutWA) {
        btnLogoutWA.addEventListener('click', async () => {
            const res = await apiFetch('/api/wa/logout', { method: 'POST' });
            if (res.success) {
                toastr.success('WA logged out');
                await updateWAStatus();
            } else {
                toastr.error('Failed to logout WA');
            }
        });
    }

    // Update status setiap 5 detik
    if (waState) {
        updateWAStatus();
        setInterval(updateWAStatus, 5000);
    }
});
