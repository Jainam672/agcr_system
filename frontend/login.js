// ── Login ───────────────────────────────────────────────────────
    let loginTab = 'user';
    function switchTab(t) {
      loginTab = t;
      document.getElementById('tab-user').classList.toggle('on', t === 'user');
      document.getElementById('tab-admin').classList.toggle('on', t === 'admin');
    }

    function togglePw(id, btn) {
      const inp = document.getElementById(id);
      const isText = inp.type === 'text';
      inp.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    }

    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pw = document.getElementById('login-pw').value;
      const errEl = document.getElementById('login-err');
      const btn = document.getElementById('login-btn');
      if (!email || !pw) { errEl.style.display = 'flex'; errEl.textContent = 'Please enter email and password.'; return; }
      errEl.style.display = 'none';
      btn.disabled = true; btn.textContent = 'Verifying…';
      try {
        const data = await api('POST', '/auth/login', { email, password: pw, role: loginTab });
        STATE.token = data.access_token;
        STATE.user = data;
        STATE.role = data.role;
        localStorage.setItem('agcr_token', data.access_token);
        localStorage.setItem('agcr_user', JSON.stringify(data));
        initApp();
      } catch (e) {
        errEl.style.display = 'flex'; errEl.innerHTML = `${ico('shield', 11)} ${escH(e.message)}`;
        btn.disabled = false; btn.textContent = 'Sign In';
      }
    }

    function showForgot() {
      showModal(`
    <div class="mo mo-sm" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt">Reset Password</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb">
        <p style="font-size:14px;color:var(--g600);line-height:1.7">Please contact your administrator to reset your password, or email <strong>adminagcr2024@gmail.com</strong> with your registered email address.</p>
      </div>
      <div class="mf"><button class="btn bf" onclick="closeModal()">OK</button></div>
    </div>
  `);
    }

    // ── Init App ────────────────────────────────────────────────────
    function initApp() {
      document.getElementById('login-page').style.display = 'none';
      const appEl = document.getElementById('app');
      appEl.style.display = 'flex';

      const u = STATE.user;
      const isAdmin = u.role === 'admin';

      // Sidebar user info
      const avEl = document.getElementById('sb-avatar');
      if (u.photo_url) {
        avEl.innerHTML = `<img src="${escH(u.photo_url)}" alt="avatar"/>`;
      } else {
        avEl.textContent = initials(u.name);
      }
      if (isAdmin) avEl.style.background = 'var(--amber)';
      document.getElementById('sb-name').textContent = u.name;
      document.getElementById('sb-email').textContent = isAdmin ? 'Administrator' : u.email;
      if (isAdmin) document.getElementById('sb-email').style.color = '#fcd34d';
      document.getElementById('sb-role-label').textContent = isAdmin ? 'Admin Console' : 'Clinical Trial Platform';

      // Nav items
      const navItems = isAdmin ? [
        { id: 'dash', icon: 'home', label: 'Overview' },
        { id: 'users', icon: 'users', label: 'User Management' },
        { id: 'hospitals', icon: 'list', label: 'All Hospitals' },
        { id: 'audit', icon: 'activity', label: 'Audit Logs' },
      ] : [
        { id: 'dash', icon: 'home', label: 'Dashboard' },
        { id: 'hospitals', icon: 'list', label: 'Hospital Records' },
        { id: 'activity', icon: 'activity', label: 'My Activity' },
        { id: 'settings', icon: 'settings', label: 'Settings' },
      ];

      const nav = document.getElementById('sb-nav');
      nav.innerHTML = navItems.map(n => `
    <button class="ni${STATE.currentView === n.id ? ' on' : ''}" id="nav-${n.id}" onclick="navigate('${n.id}')">
      ${ico(n.icon, 15)} ${escH(n.label)}
    </button>
  `).join('');

      navigate(STATE.currentView);
    }

    function navigate(view) {
      STATE.currentView = view;
      // Update nav highlight
      document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
      const navBtn = document.getElementById('nav-' + view);
      if (navBtn) navBtn.classList.add('on');
      // Render view
      const isAdmin = STATE.role === 'admin';
      if (isAdmin) {
        if (view === 'dash') renderAdminDash();
        else if (view === 'users') renderAdminUsers();
        else if (view === 'hospitals') renderAdminHospitals();
        else if (view === 'audit') renderAuditLogs();
      } else {
        if (view === 'dash') renderUserDash();
        else if (view === 'hospitals') renderHospitals();
        else if (view === 'activity') renderMyActivity();
        else if (view === 'settings') renderSettings();
      }
    }

    function setPage(title, sub, actionsHTML = '') {
      document.getElementById('page-title').textContent = title;
      document.getElementById('page-sub').textContent = sub;
      document.getElementById('topbar-actions').innerHTML = actionsHTML;
    }
    function setContent(html) { document.getElementById('page-content').innerHTML = html; }

    // ── Logout ──────────────────────────────────────────────────────
    async function doLogout() {
      try { await api('POST', '/auth/logout'); } catch (e) { }
      STATE.token = null; STATE.user = null; STATE.role = null;
      localStorage.removeItem('agcr_token'); localStorage.removeItem('agcr_user');
      document.getElementById('app').style.display = 'none';
      document.getElementById('login-page').style.display = 'grid';
      document.getElementById('login-email').value = ''; document.getElementById('login-pw').value = '';
    }

    