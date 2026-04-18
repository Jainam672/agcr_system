// ─────────────────────────────────────────────────────────────────
    // ADMIN DASHBOARD
    // ─────────────────────────────────────────────────────────────────
    async function renderAdminDash() {
      setPage('Admin Overview', 'Complete system management & analytics',
        `<span class="badge-admin">${ico('shield', 12)} Admin Console</span>`);
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const [stats, logsData] = await Promise.all([
          api('GET', '/admin/stats'),
          api('GET', '/logs/all?per_page=8')
        ]);
        const logs = logsData.items || [];
        setContent(`
      <div class="sg">
        ${statCard('users', 'Total Users', stats.total_users, '#dbeafe', '#2563eb', stats.active_users + ' active')}
        ${statCard('hospital', 'Total Hospitals', stats.total_hospitals, '#d1fae5', '#059669', stats.smo_hospitals + ' with SMO')}
        ${statCard('activity', 'Audit Logs', stats.total_logs, '#ede9fe', '#7c3aed', 'all actions')}
        ${statCard('shield', 'On Hold', stats.hold_users, '#fef3c7', '#d97706', 'restricted users')}
      </div>
      <div class="grid2" style="margin-bottom:18px">
        <div class="dp">
          <div class="ph"><span class="pt">Action Summary</span></div>
          <div style="padding:14px 20px;display:flex;flex-direction:column;gap:12px">
            ${[['Creates', stats.creates, 'var(--green)', 'var(--green-l)'], ['Updates', stats.updates, 'var(--blue)', 'var(--blue-l)'], ['Deletes', stats.deletes, 'var(--red)', 'var(--red-l)']].map(([l, v, c, b]) => `
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:13px;color:var(--g600)">Total ${l}</span>
                <span style="background:${b};color:${c};padding:3px 12px;border-radius:100px;font-size:13px;font-weight:700">${v}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="dp">
          <div class="ph"><span class="pt">SMO Distribution</span></div>
          <div style="padding:14px 20px;display:flex;flex-direction:column;gap:12px">
            ${[['With SMO', stats.smo_hospitals, 'var(--green)'], ['Without SMO', stats.total_hospitals - stats.smo_hospitals, 'var(--g400)']].map(([l, v, c]) => `
              <div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="font-weight:600;color:var(--g700)">${l}</span><span style="color:${c};font-weight:700">${v}</span></div>
              <div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden"><div style="height:100%;background:${c};border-radius:3px;width:${stats.total_hospitals ? ((v / stats.total_hospitals) * 100).toFixed(0) : 0}%;transition:width .5s"></div></div></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="dp">
        <div class="ph"><span class="pt">Latest Audit Activity</span><button class="btn bg bsm" onclick="navigate('audit')">${ico('activity')} View All</button></div>
        <div style="padding:0 20px 8px">
          ${logs.length === 0 ? `<p style="padding:20px;font-size:13px;color:var(--g400)">No audit logs yet.</p>`
            : logs.map(l => `<div class="ar">${actionIcon(l.action)}<div>
              <div style="font-size:13px;font-weight:500"><strong>${escH(l.user_name || '—')}</strong> <span class="${badgeClass(l.action)}" style="margin:0 5px">${l.action}</span> ${escH(l.hospital_name || l.detail || '—')}</div>
              <div class="am">${escH(l.detail || '')} · ${fmtDT(l.ts)}</div></div></div>`).join('')
          }
        </div>
      </div>
    `);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    // ─────────────────────────────────────────────────────────────────
    // ADMIN — USER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────
    let usersState = { page: 1, q: '', status: '' };

    async function renderAdminUsers(page = 1, q = usersState.q, status = usersState.status) {
      usersState = { page, q, status };
      setPage('User Management', 'Create, edit, and manage all user accounts',
        `<button class="btn bf" onclick="showCreateUser()">${ico('plus')} Create User</button>`);
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const qStr = q ? `&q=${encodeURIComponent(q)}` : '';
        const sStr = status ? `&status=${status}` : '';
        const data = await api('GET', `/admin/users?page=${page}&per_page=10${qStr}${sStr}`);
        const { items: users, total, pages } = data;
        const per = 10, from = total === 0 ? 0 : (page - 1) * per + 1, to = Math.min(page * per, total);
        setContent(`
      <div class="dp">
        <div class="ph">
          <span class="pt">All Users (${total})</span>
          <div class="pa">
            <div class="si-wrap"><span class="si-ico">${ico('search', 13)}</span>
              <input class="si" id="usr-search" placeholder="Search name or email…" value="${escH(q)}" oninput="debUsrSearch(this.value)"/>
            </div>
            <select class="mfs" id="usr-status-filter" style="width:auto;padding:8px 32px 8px 12px;font-size:13px" onchange="renderAdminUsers(1,usersState.q,this.value)">
              <option value="">All Status</option>
              <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
              <option value="hold"   ${status === 'hold' ? 'selected' : ''}>On Hold</option>
            </select>
            ${q ? `<button class="btn bg bsm" onclick="renderAdminUsers(1,'','')">${ico('x')} Clear</button>` : ''}
          </div>
        </div>
        <div class="tw">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Hospitals</th><th>Last Login</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.length === 0 ? `<tr><td colspan="9" class="empty">No users found.</td></tr>`
            : users.map((u, i) => `
                  <tr style="cursor:pointer" onclick="viewUserDetail('${escH(u.id)}')">
                    <td style="color:var(--g400);font-size:12px">${(page - 1) * 10 + i + 1}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="sb-av" style="width:28px;height:28px;font-size:11px;background:${u.role === 'admin' ? 'var(--amber)' : 'var(--sage)'};flex-shrink:0">
                          ${u.photo_url ? `<img src="${escH(u.photo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : initials(u.name)}
                        </div>
                        <div><div style="font-weight:600;font-size:13px">${escH(u.name)}</div></div>
                      </div>
                    </td>
                    <td style="font-size:12.5px;color:var(--blue)">${escH(u.email)}</td>
                    <td>${roleBadge(u.role)}</td>
                    <td>${statusBadge(u.status)}</td>
                    <td style="font-size:13px;font-weight:600;color:var(--ink)">${u.hospital_count}</td>
                    <td style="font-size:11.5px;color:var(--g400)">${fmtD(u.last_login)}</td>
                    <td style="font-size:11.5px;color:var(--g400)">${fmtD(u.created_at)}</td>
                    <td onclick="event.stopPropagation()">
                      <div style="display:flex;gap:4px">
                        <button class="btn bg bsm" title="View Detail" onclick="viewUserDetail('${escH(u.id)}')">${ico('eye')}</button>
                        <button class="btn bg bsm" title="Edit" onclick="showEditUser('${escH(u.id)}')">${ico('edit')}</button>
                        ${u.status === 'hold'
                ? `<button class="btn bgreen bsm" title="Activate" onclick="activateUser('${escH(u.id)}','${escH(u.name)}')">${ico('play')}</button>`
                : u.role !== 'admin' ? `<button class="btn bamber bsm" title="Hold" onclick="holdUser('${escH(u.id)}','${escH(u.name)}')">${ico('pause')}</button>` : ''
              }
                        ${u.role !== 'admin' ? `<button class="btn bd bsm" title="Delete" onclick="confirmDeleteUser('${escH(u.id)}','${escH(u.name)}')">${ico('trash')}</button>` : ''}
                      </div>
                    </td>
                  </tr>`).join('')
          }
            </tbody>
          </table>
        </div>
        <div class="pg">
          <span class="pgi">Showing ${from}–${to} of ${total}</span>
          <div class="pgb">${pgHTML(page, pages, 'renderAdminUsers')}</div>
        </div>
      </div>`);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    let debUsrTimer;
    function debUsrSearch(val) { clearTimeout(debUsrTimer); debUsrTimer = setTimeout(() => renderAdminUsers(1, val, usersState.status), 350); }

    async function viewUserDetail(uid) {
      try {
        const u = await api('GET', `/admin/users/${uid}`);
        showModal(`
      <div class="mo mo-lg" onclick="event.stopPropagation()">
        <div class="mh">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="sb-av" style="width:44px;height:44px;font-size:16px;background:${u.role === 'admin' ? 'var(--amber)' : 'var(--sage)'}">
              ${u.photo_url ? `<img src="${escH(u.photo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : initials(u.name)}
            </div>
            <div>
              <div class="mt">${escH(u.name)}</div>
              <div style="font-size:12px;color:var(--g400)">${escH(u.email)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn bgreen bsm" onclick="closeModal();showEditUser('${escH(uid)}')">${ico('edit')} Edit</button>
            <button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button>
          </div>
        </div>
        <div class="mb">
          <!-- Profile Info -->
          <div class="grid-detail" style="margin-bottom:20px">
            ${[['User ID', u.id, 'code'], ['Role', roleBadge(u.role), 'html'], ['Status', statusBadge(u.status), 'html'], ['Phone', u.phone || '—'], ['Last Login', fmtDT(u.last_login)], ['Member Since', fmtDT(u.created_at)], ['Total Hospitals', u.hospital_count], ['Total Logs', u.log_count]].map(([l, v, t]) => `
              <div class="detail-item">
                <div class="detail-label">${l}</div>
                <div class="detail-val">${t === 'code' ? `<span class="code">${escH(v)}</span>` : t === 'html' ? v : escH(String(v || '—'))}</div>
              </div>`).join('')}
            ${u.bio ? `<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Bio</div><div class="detail-val">${escH(u.bio)}</div></div>` : ''}
          </div>

          <!-- Recent Logs -->
          <div class="sep"></div>
          <div class="section-title">Recent Activity</div>
          ${u.recent_logs.length === 0
            ? `<p style="font-size:13px;color:var(--g400)">No activity yet.</p>`
            : u.recent_logs.map(l => `<div class="ar">${actionIcon(l.action)}<div>
              <div style="font-size:13px;font-weight:500"><span class="${badgeClass(l.action)}" style="margin-right:6px">${l.action}</span><strong>${escH(l.hospital_name || '—')}</strong></div>
              <div class="am">${escH(l.detail || '')} · ${fmtDT(l.ts)}</div></div></div>`).join('')
          }

          <!-- Hospitals -->
          ${u.hospitals.length > 0 ? `
          <div class="sep"></div>
          <div class="section-title">Hospitals Created (${u.hospitals.length})</div>
          <div class="tw"><table>
            <thead><tr><th>Hospital</th><th>Doctor</th><th>Specialty</th><th>SMO</th><th>Created</th></tr></thead>
            <tbody>
              ${u.hospitals.map(h => `<tr>
                <td style="font-weight:600;font-size:13px">${escH(h.hospital_name)}</td>
                <td style="font-size:13px">${escH(h.dr_name)}</td>
                <td><span class="pill">${escH(h.specialty)}</span></td>
                <td><span class="badge ${h.smo ? 'b-smo' : 'b-nosmo'}">${h.smo ? '✓ Yes' : '✗ No'}</span></td>
                <td style="font-size:11.5px;color:var(--g400)">${fmtD(h.created_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`: ''}
        </div>
        <div class="mf">
          ${u.status === 'hold'
            ? `<button class="btn bgreen" onclick="closeModal();activateUser('${escH(uid)}','${escH(u.name)}')">${ico('play')} Activate Account</button>`
            : u.role !== 'admin' ? `<button class="btn bamber" onclick="closeModal();holdUser('${escH(uid)}','${escH(u.name)}')">${ico('pause')} Place on Hold</button>` : ''
          }
          <button class="btn bg bsm" onclick="closeModal();showResetPw('${escH(uid)}','${escH(u.name)}')">${ico('key')} Reset Password</button>
          <button class="btn bg" onclick="closeModal()">Close</button>
        </div>
      </div>`);
      } catch (e) { toast('Failed to load: ' + e.message, 'err'); }
    }

    function showCreateUser() {
      showModal(`
    <div class="mo" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt">➕ Create New User</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb">
        <div class="mg">
          <div><label class="mfl">Full Name *</label><input class="mfi" id="cu-name" placeholder="e.g. Dr. Priya Sharma"/><div id="cu-e-name" class="em" style="display:none"></div></div>
          <div><label class="mfl">Email *</label><input class="mfi" id="cu-email" type="email" placeholder="user@gmail.com"/><div id="cu-e-email" class="em" style="display:none"></div></div>
          <div><label class="mfl">Password *</label>
            <div class="iw"><span class="ii">${ico('lock', 14)}</span>
              <input class="mfi" id="cu-pw" type="password" placeholder="Min 6 characters" style="padding-left:36px"/>
            </div><div id="cu-e-pw" class="em" style="display:none"></div>
          </div>
          <div><label class="mfl">Phone</label><input class="mfi" id="cu-phone" type="tel" placeholder="e.g. 9876543210"/></div>
          <div><label class="mfl">Role</label>
            <select class="mfs" id="cu-role"><option value="user">User</option><option value="admin">Admin</option></select>
          </div>
        </div>
      </div>
      <div class="mf"><button class="btn bg" onclick="closeModal()">Cancel</button><button class="btn bf" onclick="submitCreateUser()">${ico('plus')} Create User</button></div>
    </div>`);
    }

    async function submitCreateUser() {
      const name = document.getElementById('cu-name')?.value.trim();
      const email = document.getElementById('cu-email')?.value.trim();
      const pw = document.getElementById('cu-pw')?.value;
      const phone = document.getElementById('cu-phone')?.value.trim();
      const role = document.getElementById('cu-role')?.value;
      let valid = true;
      const fe = (id, msg) => { const el = document.getElementById('cu-e-' + id); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; };
      if (!name) { fe('name', 'Name required'); valid = false; } else fe('name', '');
      if (!email) { fe('email', 'Email required'); valid = false; } else fe('email', '');
      if (!pw || pw.length < 6) { fe('pw', 'Password must be at least 6 characters'); valid = false; } else fe('pw', '');
      if (!valid) return;
      try {
        await api('POST', '/admin/users', { name, email, password: pw, phone, role });
        toast(`User "${name}" created!`);
        closeModal();
        renderAdminUsers(usersState.page, usersState.q, usersState.status);
      } catch (e) { toast(e.message, 'err'); }
    }

    async function showEditUser(uid) {
      try {
        const u = await api('GET', `/admin/users/${uid}`);
        showModal(`
      <div class="mo" onclick="event.stopPropagation()">
        <div class="mh"><span class="mt">✏️ Edit User: ${escH(u.name)}</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
        <div class="mb">
          <div class="mg">
            <div><label class="mfl">Full Name</label><input class="mfi" id="eu-name" value="${escH(u.name || '')}"/></div>
            <div><label class="mfl">Email</label><input class="mfi" id="eu-email" type="email" value="${escH(u.email || '')}"/></div>
            <div><label class="mfl">Phone</label><input class="mfi" id="eu-phone" value="${escH(u.phone || '')}"/></div>
            <div><label class="mfl">Role</label>
              <select class="mfs" id="eu-role">
                <option value="user"  ${u.role === 'user' ? 'selected' : ''}>User</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div><label class="mfl">Status</label>
              <select class="mfs" id="eu-status">
                <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="hold"   ${u.status === 'hold' ? 'selected' : ''}>On Hold</option>
              </select>
            </div>
            <div><label class="mfl">New Password <span style="color:var(--g400);font-weight:400">(leave blank to keep current)</span></label>
              <input class="mfi" id="eu-pw" type="password" placeholder="Leave blank to keep unchanged"/>
            </div>
          </div>
        </div>
        <div class="mf"><button class="btn bg" onclick="closeModal()">Cancel</button><button class="btn bf" onclick="submitEditUser('${escH(uid)}')">${ico('check')} Save Changes</button></div>
      </div>`);
      } catch (e) { toast('Failed to load user: ' + e.message, 'err'); }
    }

    async function submitEditUser(uid) {
      const body = {};
      const name = document.getElementById('eu-name')?.value.trim();
      const email = document.getElementById('eu-email')?.value.trim();
      const phone = document.getElementById('eu-phone')?.value.trim();
      const role = document.getElementById('eu-role')?.value;
      const status = document.getElementById('eu-status')?.value;
      const pw = document.getElementById('eu-pw')?.value;
      if (name) body.name = name;
      if (email) body.email = email;
      if (phone) body.phone = phone;
      if (role) body.role = role;
      if (status) body.status = status;
      if (pw) body.password = pw;
      try {
        const u = await api('PUT', `/admin/users/${uid}`, body);
        toast(`User "${u.name}" updated!`);
        closeModal();
        renderAdminUsers(usersState.page, usersState.q, usersState.status);
      } catch (e) { toast(e.message, 'err'); }
    }

    async function holdUser(uid, name) {
      try {
        await api('POST', `/admin/users/${uid}/hold`);
        toast(`"${name}" placed on hold.`, 'info');
        renderAdminUsers(usersState.page, usersState.q, usersState.status);
      } catch (e) { toast(e.message, 'err'); }
    }
    async function activateUser(uid, name) {
      try {
        await api('POST', `/admin/users/${uid}/activate`);
        toast(`"${name}" activated!`, 'ok');
        renderAdminUsers(usersState.page, usersState.q, usersState.status);
      } catch (e) { toast(e.message, 'err'); }
    }

    function confirmDeleteUser(uid, name) {
      showModal(`
    <div class="mo mo-sm" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt" style="color:var(--red)">Delete User</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb"><p style="font-size:14px;color:var(--g600);line-height:1.6">Are you sure you want to delete user <strong>"${escH(name)}"</strong>?<br/>This will revoke all access. Action cannot be undone.</p></div>
      <div class="mf"><button class="btn bg" onclick="closeModal()">Cancel</button><button class="btn bd" onclick="deleteUser('${escH(uid)}','${escH(name)}')">${ico('trash')} Delete</button></div>
    </div>`);
    }
    async function deleteUser(uid, name) {
      try {
        await api('DELETE', `/admin/users/${uid}`);
        toast(`User "${name}" deleted.`, 'err');
        closeModal();
        renderAdminUsers(usersState.page, usersState.q, usersState.status);
      } catch (e) { toast(e.message, 'err'); }
    }

    function showResetPw(uid, name) {
      showModal(`
    <div class="mo mo-sm" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt">Reset Password: ${escH(name)}</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb">
        <div class="fg"><label class="mfl">New Password</label>
          <div class="iw"><span class="ii">${ico('lock', 14)}</span>
            <input class="mfi" id="rp-pw" type="password" placeholder="Min 6 characters" style="padding-left:36px"/>
          </div>
        </div>
      </div>
      <div class="mf"><button class="btn bg" onclick="closeModal()">Cancel</button><button class="btn bf" onclick="submitResetPw('${escH(uid)}','${escH(name)}')">${ico('key')} Reset Password</button></div>
    </div>`);
    }
    async function submitResetPw(uid, name) {
      const pw = document.getElementById('rp-pw')?.value;
      if (!pw || pw.length < 6) { toast('Password must be at least 6 characters', 'err'); return; }
      try {
        await api('POST', `/admin/users/${uid}/reset-password`, { password: pw });
        toast(`Password reset for "${name}"!`);
        closeModal();
      } catch (e) { toast(e.message, 'err'); }
    }

    // ─────────────────────────────────────────────────────────────────
    // ADMIN — ALL HOSPITALS (read-only)
    // ─────────────────────────────────────────────────────────────────
    let adminHospState = { page: 1, q: '' };
    async function renderAdminHospitals(page = 1, q = adminHospState.q) {
      adminHospState = { page, q };
      setPage('All Hospitals', 'Complete hospital registry (read-only view)',
        `<button class="btn bo" onclick="exportHospCSV()">${ico('download')} Export CSV</button>`);
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const data = await api('GET', `/hospitals?page=${page}&per_page=10&q=${encodeURIComponent(q)}`);
        const { items: rows, total, pages } = data;
        const per = 10, from = total === 0 ? 0 : (page - 1) * per + 1, to = Math.min(page * per, total);
        setContent(`
      <div class="dp">
        <div class="ph">
          <span class="pt">Hospital Registry (${total})</span>
          <div class="pa">
            <div class="si-wrap"><span class="si-ico">${ico('search', 13)}</span>
              <input class="si" placeholder="Search…" value="${escH(q)}" oninput="debAdminHospSearch(this.value)"/>
            </div>
          </div>
        </div>
        <div class="tw"><table>
          <thead><tr><th>#</th><th>Doctor</th><th>Hospital</th><th>Specialty</th><th>Contact</th><th>Email</th><th>SMO</th><th>Created By</th><th>Created</th><th>Updated</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="10" class="empty">No records found.</td></tr>`
            : rows.map((r, i) => `<tr>
                <td style="color:var(--g400);font-size:12px">${(page - 1) * 10 + i + 1}</td>
                <td style="font-weight:600;font-size:13px">${escH(r.dr_name)}</td>
                <td style="font-weight:500;font-size:13px">${escH(r.hospital_name)}</td>
                <td><span class="pill">${escH(r.specialty)}</span></td>
                <td style="font-size:12.5px">${escH(r.contact_number)}</td>
                <td style="font-size:12.5px;color:var(--blue)">${escH(r.email)}</td>
                <td><span class="badge ${r.smo ? 'b-smo' : 'b-nosmo'}">${r.smo ? '✓ Yes' : '✗ No'}</span></td>
                <td style="font-size:12px;font-weight:500">${escH(r.creator_name || r.created_by || '—')}</td>
                <td style="font-size:11.5px;color:var(--g400)">${fmtD(r.created_at)}</td>
                <td style="font-size:11.5px;color:var(--g400)">${fmtD(r.updated_at)}</td>
              </tr>`).join('')
          }
          </tbody>
        </table></div>
        <div class="pg">
          <span class="pgi">Showing ${from}–${to} of ${total}</span>
          <div class="pgb">${pgHTML(page, pages, 'renderAdminHospitals')}</div>
        </div>
      </div>`);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }
    let debAdmHospTimer;
    function debAdminHospSearch(val) { clearTimeout(debAdmHospTimer); debAdmHospTimer = setTimeout(() => renderAdminHospitals(1, val), 350); }

    // ─────────────────────────────────────────────────────────────────
    // ADMIN — AUDIT LOGS
    // ─────────────────────────────────────────────────────────────────
    let auditState = { page: 1, action: '' };
    async function renderAuditLogs(page = 1, action = auditState.action) {
      auditState = { page, action };
      setPage('Audit Logs', 'Complete system activity trail');
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const aStr = action ? `&action=${action}` : '';
        const data = await api('GET', `/logs/all?page=${page}&per_page=20${aStr}`);
        const { items: logs, total, pages } = data;
        const per = 20, from = total === 0 ? 0 : (page - 1) * per + 1, to = Math.min(page * per, total);
        const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_HOLD', 'USER_ACTIVATE', 'PASSWORD_CHANGE', 'PROFILE_UPDATE'];
        setContent(`
      <div class="dp">
        <div class="ph">
          <span class="pt">All System Actions (${total})</span>
          <div class="pa">
            <select class="mfs" style="width:auto;padding:8px 32px 8px 12px;font-size:13px" onchange="renderAuditLogs(1,this.value)">
              <option value="">All Actions</option>
              ${actions.map(a => `<option value="${a}" ${action === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="tw"><table>
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Hospital/Target</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>
            ${logs.length === 0 ? `<tr><td colspan="6" class="empty">No audit logs yet.</td></tr>`
            : logs.map(l => `<tr>
                <td style="font-size:11.5px;color:var(--g500);white-space:nowrap">${fmtDT(l.ts)}</td>
                <td><div style="font-size:13px;font-weight:600">${escH(l.user_name || '—')}</div><div style="font-size:11px;color:var(--g400)">${escH(l.user_email || '')}</div></td>
                <td><span class="${badgeClass(l.action)}">${l.action}</span></td>
                <td style="font-size:13px;font-weight:500">${escH(l.hospital_name || '—')}</td>
                <td style="font-size:12px;color:var(--g500)">${escH(l.detail || '—')}</td>
                <td><span class="code">${escH(l.ip_address || '—')}</span></td>
              </tr>`).join('')
          }
          </tbody>
        </table></div>
        <div class="pg">
          <span class="pgi">Showing ${from}–${to} of ${total}</span>
          <div class="pgb">${pgHTML(page, pages, 'renderAuditLogs')}</div>
        </div>
      </div>`);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    