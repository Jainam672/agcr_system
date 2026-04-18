// ─────────────────────────────────────────────────────────────────
    // BOOT
    // ─────────────────────────────────────────────────────────────────
    (async function boot() {
      if (STATE.token && STATE.user) {
        // Verify token is still valid
        try {
          const me = await api('GET', '/auth/me');
          STATE.user = { ...STATE.user, ...me };
          STATE.role = me.role;
          localStorage.setItem('agcr_user', JSON.stringify(STATE.user));
          initApp();
        } catch (e) {
          // Token expired
          STATE.token = null; STATE.user = null;
          localStorage.removeItem('agcr_token'); localStorage.removeItem('agcr_user');
        }
      }
      // Seed default admin if needed (first run)
      try { await fetch('/api/admin/seed', { method: 'POST' }); } catch (e) { }
    })();
  