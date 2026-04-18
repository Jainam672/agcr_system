// ─────────────────────────────────────────────────────────────────
    // USER DASHBOARD
    // ─────────────────────────────────────────────────────────────────
    async function renderUserDash() {
      setPage('Dashboard', `Welcome back, ${STATE.user.name.split(' ')[0]} 👋`,
        `<button class="btn bf" onclick="showAddHospital()">${ico('plus')} Add Hospital</button>`);
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const [hospData, logsData] = await Promise.all([
          api('GET', '/hospitals?per_page=100'),
          api('GET', '/logs/my?per_page=5')
        ]);
        const h = hospData.items || [];
        const logs = logsData.items || [];
        const mine = h.filter(x => x.created_by === STATE.user.user_id).length;
        const smo = h.filter(x => x.smo).length;
        const specs = new Set(h.map(x => x.specialty).filter(Boolean)).size;
        setContent(`
      <div class="sg">
        ${statCard('hospital', 'Total Hospitals', h.length, '#dbeafe', '#2563eb', mine + ' added by you')}
        ${statCard('link', 'SMO Attached', smo, '#d1fae5', '#059669', (h.length - smo) + ' without SMO')}
        ${statCard('activity', 'Specialties', specs, '#fef3c7', '#d97706', 'unique specialties')}
        ${statCard('shield', 'My Records', mine, '#ede9fe', '#7c3aed', 'created by you')}
      </div>
      <div class="dp">
        <div class="ph"><span class="pt">Recent Activity</span></div>
        <div style="padding:0 20px 8px">
          ${logs.length === 0
            ? `<p style="padding:20px;font-size:13px;color:var(--g400)">No activity yet. Add a hospital to get started.</p>`
            : logs.map(l => `
              <div class="ar">
                ${actionIcon(l.action)}
                <div><div style="font-size:13px;font-weight:500"><span class="${badgeClass(l.action)}" style="margin-right:7px">${l.action}</span><strong>${escH(l.hospital_name || '—')}</strong></div>
                <div class="am">${escH(l.detail || '')} · ${fmtDT(l.ts)}</div></div>
              </div>`).join('')
          }
        </div>
      </div>
    `);
      } catch (e) { setContent(`<div class="empty">Error loading dashboard: ${escH(e.message)}</div>`); }
    }

    function statCard(icon, label, val, bg, ic, sub = '') {
      return `<div class="sc"><div class="sci" style="background:${bg};color:${ic}">${ico(icon, 18)}</div>
    <div class="scv">${val}</div><div class="scl">${escH(label)}</div>${sub ? `<div class="scd">${escH(sub)}</div>` : ''}</div>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // HOSPITALS (User)
    // ─────────────────────────────────────────────────────────────────
    let hospState = { page: 1, q: '', data: null };

    async function renderHospitals(page = 1, q = hospState.q) {
      hospState.page = page; hospState.q = q;
      setPage('Hospital Records', 'Manage clinical trial sites',
        `<div style="display:flex;gap:8px">
      <button class="btn bo" onclick="exportHospCSV()">${ico('download')} Export CSV</button>
      <button class="btn bf" onclick="showAddHospital()">${ico('plus')} Add Hospital</button>
    </div>`);
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const data = await api('GET', `/hospitals?page=${page}&per_page=10&q=${encodeURIComponent(q)}`);
        hospState.data = data;
        renderHospTable(data);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    function renderHospTable(data) {
      const { items: rows, total, page, pages } = data;
      const per = 10, from = total === 0 ? 0 : (page - 1) * per + 1, to = Math.min(page * per, total);
      setContent(`
    <div class="dp">
      <div class="ph">
        <span class="pt">All Hospitals</span>
        <div class="pa">
          <div class="si-wrap">
            <span class="si-ico">${ico('search', 13)}</span>
            <input class="si" id="hosp-search" placeholder="Search doctor, hospital, specialty…" value="${escH(hospState.q)}" oninput="debSearch(this.value)"/>
          </div>
          ${hospState.q ? `<button class="btn bg bsm" onclick="renderHospitals(1,'')">${ico('x')} Clear</button>` : ''}
        </div>
      </div>
      <div class="tw">
        <table>
          <thead><tr><th>#</th><th>Doctor Name</th><th>Hospital Name</th><th>Specialty</th><th>Contact</th><th>Email</th><th>SMO</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="9" class="empty">No hospitals found.${hospState.q ? ' Try a different search.' : ''}</td></tr>`
          : rows.map((r, i) => `
                <tr style="cursor:pointer" onclick="viewHospital('${escH(r.id)}')">
                  <td style="color:var(--g400);font-size:12px">${(page - 1) * 10 + i + 1}</td>
                  <td><div style="font-weight:600;font-size:13px">${escH(r.dr_name)}</div></td>
                  <td><div style="font-weight:500;font-size:13px">${escH(r.hospital_name)}</div></td>
                  <td><span class="pill">${escH(r.specialty)}</span></td>
                  <td style="font-size:12.5px;color:var(--g600)">${escH(r.contact_number)}</td>
                  <td style="font-size:12.5px;color:var(--blue);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escH(r.email)}</td>
                  <td><span class="badge ${r.smo ? 'b-smo' : 'b-nosmo'}">${r.smo ? '✓ Yes' : '✗ No'}</span></td>
                  <td style="font-size:11.5px;color:var(--g400)">${fmtD(r.updated_at)}</td>
                  <td onclick="event.stopPropagation()">
                    <div style="display:flex;gap:5px">
                      <button class="btn bg bsm" onclick="editHospital('${escH(r.id)}')">${ico('edit')}</button>
                      <button class="btn bd bsm" onclick="confirmDeleteHosp('${escH(r.id)}','${escH(r.hospital_name)}')">${ico('trash')}</button>
                    </div>
                  </td>
                </tr>`).join('')
        }
          </tbody>
        </table>
      </div>
      <div class="pg">
        <span class="pgi">Showing ${from}–${to} of ${total}</span>
        <div class="pgb">${pgHTML(page, pages, 'renderHospitals')}</div>
      </div>
    </div>
  `);
    }

    let debTimer;
    function debSearch(val) { clearTimeout(debTimer); debTimer = setTimeout(() => renderHospitals(1, val), 350); }

    const SPECS = ["Oncology", "Cardiology", "Neurology", "Endocrinology", "Orthopedics", "Dermatology", "Gastroenterology", "Pulmonology", "Nephrology", "Ophthalmology", "Psychiatry", "Pediatrics", "Rheumatology", "Hematology", "Infectious Disease", "Other"];

    function hospFormHTML(rec = null, title = '') {
      const f = rec || {};
      return `
    <div class="mo" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt">${escH(title)}</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--g100)">
          <div style="width:28px;height:28px;background:var(--pale);border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--sage)">${ico('user', 14)}</div>
          <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500)">Doctor &amp; Hospital Information</span>
        </div>
        <div class="mg">
          <div><label class="mfl">Doctor Name *</label><input class="mfi" id="hf-drname" placeholder="e.g. Dr. Anjali Verma" value="${escH(f.dr_name || '')}"/><div id="e-drname" class="em" style="display:none"></div></div>
          <div><label class="mfl">Hospital Name *</label><input class="mfi" id="hf-hospital" placeholder="e.g. Apollo Clinical Center" value="${escH(f.hospital_name || '')}"/><div id="e-hospital" class="em" style="display:none"></div></div>
          <div><label class="mfl">Specialty *</label>
            <select class="mfs" id="hf-specialty">
              <option value="">— Select Specialty —</option>
              ${SPECS.map(s => `<option value="${s}"${(f.specialty || '') == s ? ' selected' : ''}>${s}</option>`).join('')}
            </select><div id="e-specialty" class="em" style="display:none"></div>
          </div>
          <div><label class="mfl">Contact Number *</label><input class="mfi" id="hf-phone" type="tel" placeholder="e.g. 9876543210" value="${escH(f.contact_number || '')}"/><div id="e-phone" class="em" style="display:none"></div></div>
          <div class="fw"><label class="mfl">Email ID *</label><input class="mfi" id="hf-email" type="email" placeholder="e.g. doctor@hospital.com" value="${escH(f.email || '')}"/><div id="e-email" class="em" style="display:none"></div></div>
          <div class="fw smo-box">
            <div class="smo-hdr">
              <span class="smo-label">${ico('link', 16)} Attached with SMO?</span>
              <label class="toggle"><input type="checkbox" id="hf-smo" onchange="toggleSMOFields()" ${f.smo ? 'checked' : ''}/><span class="tslider"></span></label>
            </div>
            <div id="smo-fields" style="display:${f.smo ? 'grid' : 'none'};margin-top:14px;grid-template-columns:1fr 1fr;gap:12px">
              <div><label class="mfl">SMO Name *</label><input class="mfi" id="hf-smoname" placeholder="e.g. MedTrials SMO" value="${escH(f.smo_name || '')}"/><div id="e-smoname" class="em" style="display:none"></div></div>
              <div><label class="mfl">Contact Person *</label><input class="mfi" id="hf-smocontact" placeholder="e.g. Ramesh Shah" value="${escH(f.smo_contact || '')}"/><div id="e-smocontact" class="em" style="display:none"></div></div>
              <div><label class="mfl">SMO Phone *</label><input class="mfi" id="hf-smophone" type="tel" placeholder="e.g. 9800001111" value="${escH(f.smo_phone || '')}"/><div id="e-smophone" class="em" style="display:none"></div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="mf">
        <button class="btn bg" onclick="closeModal()">Cancel</button>
        <button class="btn bf" onclick="submitHospForm('${escH(rec ? rec.id : '')}')">${ico(rec ? 'check' : 'plus')} ${rec ? 'Save Changes' : 'Add Hospital'}</button>
      </div>
    </div>`;
    }

    function toggleSMOFields() {
      const on = document.getElementById('hf-smo').checked;
      document.getElementById('smo-fields').style.display = on ? 'grid' : 'none';
    }

    function showAddHospital() { showModal(hospFormHTML(null, '➕  Add New Hospital')); }

    async function editHospital(id) {
      try {
        const h = await api('GET', `/hospitals/${id}`);
        showModal(hospFormHTML(h, '✏️  Edit Hospital Record'));
      } catch (e) { toast('Failed to load hospital: ' + e.message, 'err'); }
    }

    async function viewHospital(id) {
      try {
        const h = await api('GET', `/hospitals/${id}`);
        showModal(`
      <div class="mo" onclick="event.stopPropagation()">
        <div class="mh"><span class="mt">🏥 Hospital Record</span>
          <div style="display:flex;gap:8px">
            <button class="btn bgreen bsm" onclick="closeModal();editHospital('${escH(id)}')">${ico('edit')} Edit</button>
            <button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button>
          </div>
        </div>
        <div class="mb">
          <div class="grid-detail" style="margin-bottom:20px">
            ${[['Doctor Name', h.dr_name], ['Hospital Name', h.hospital_name], ['Specialty', h.specialty], ['Contact Number', h.contact_number]].map(([l, v]) => `<div class="detail-item"><div class="detail-label">${l}</div><div class="detail-val">${escH(v || '—')}</div></div>`).join('')}
            <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Email ID</div><div class="detail-val">${escH(h.email || '—')}</div></div>
          </div>
          <div style="background:var(--g50);border:1.5px solid var(--g200);border-radius:var(--r2);padding:16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:${h.smo ? 14 : 0}px">
              ${ico('link', 15)}<span style="font-size:13px;font-weight:600;color:var(--g700)">SMO Attachment:</span>
              <span class="badge ${h.smo ? 'b-smo' : 'b-nosmo'}">${h.smo ? '✓ Yes' : '✗ No'}</span>
            </div>
            ${h.smo ? `<div class="grid-detail">
              <div class="detail-item"><div class="detail-label">SMO Name</div><div class="detail-val">${escH(h.smo_name || '—')}</div></div>
              <div class="detail-item"><div class="detail-label">Contact Person</div><div class="detail-val">${escH(h.smo_contact || '—')}</div></div>
              <div class="detail-item"><div class="detail-label">SMO Phone</div><div class="detail-val">${escH(h.smo_phone || '—')}</div></div>
            </div>`: ''}
          </div>
          <div style="margin-top:14px;display:flex;gap:16px;font-size:11.5px;color:var(--g400)">
            <span>Created: ${fmtDT(h.created_at)}</span><span>Updated: ${fmtDT(h.updated_at)}</span>
            ${h.creator_name ? `<span>By: ${escH(h.creator_name)}</span>` : ''}
          </div>
        </div>
      </div>`);
      } catch (e) { toast('Failed to load: ' + e.message, 'err'); }
    }

    function fieldErr(id, msg) { const el = document.getElementById('e-' + id); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; document.getElementById('hf-' + id)?.classList.toggle('err', !!msg); }

    async function submitHospForm(existingId) {
      const drname = document.getElementById('hf-drname').value.trim();
      const hospital = document.getElementById('hf-hospital').value.trim();
      const specialty = document.getElementById('hf-specialty').value;
      const phone = document.getElementById('hf-phone').value.trim();
      const email = document.getElementById('hf-email').value.trim();
      const smo = document.getElementById('hf-smo').checked;
      const smoname = document.getElementById('hf-smoname')?.value.trim() || '';
      const smocontact = document.getElementById('hf-smocontact')?.value.trim() || '';
      const smophone = document.getElementById('hf-smophone')?.value.trim() || '';

      let valid = true;
      if (!drname) { fieldErr('drname', 'Doctor name required'); valid = false; } else fieldErr('drname', '');
      if (!hospital) { fieldErr('hospital', 'Hospital name required'); valid = false; } else fieldErr('hospital', '');
      if (!specialty) { fieldErr('specialty', 'Specialty required'); valid = false; } else fieldErr('specialty', '');
      if (!phone) { fieldErr('phone', 'Contact number required'); valid = false; } else fieldErr('phone', '');
      if (!email) { fieldErr('email', 'Email required'); valid = false; } else fieldErr('email', '');
      if (smo && !smoname) { fieldErr('smoname', 'SMO name required'); valid = false; } else fieldErr('smoname', '');
      if (smo && !smocontact) { fieldErr('smocontact', 'Contact person required'); valid = false; } else fieldErr('smocontact', '');
      if (smo && !smophone) { fieldErr('smophone', 'SMO phone required'); valid = false; } else fieldErr('smophone', '');
      if (!valid) return;

      const body = { dr_name: drname, hospital_name: hospital, specialty, contact_number: phone, email, smo, smo_name: smoname, smo_contact: smocontact, smo_phone: smophone };
      try {
        if (existingId) { await api('PUT', `/hospitals/${existingId}`, body); toast('Hospital updated successfully!'); }
        else { await api('POST', '/hospitals', body); toast('Hospital added successfully!'); }
        closeModal();
        if (STATE.currentView === 'dash') renderUserDash();
        else renderHospitals(hospState.page, hospState.q);
      } catch (e) { toast(e.message, 'err'); }
    }

    function confirmDeleteHosp(id, name) {
      showModal(`
    <div class="mo mo-sm" onclick="event.stopPropagation()">
      <div class="mh"><span class="mt" style="color:var(--red)">Confirm Delete</span><button class="btn bg bsm" onclick="closeModal()">${ico('x')}</button></div>
      <div class="mb"><p style="font-size:14px;color:var(--g600);line-height:1.6">Are you sure you want to delete <strong>"${escH(name)}"</strong>?<br/>This action cannot be undone.</p></div>
      <div class="mf"><button class="btn bg" onclick="closeModal()">Cancel</button><button class="btn bd" onclick="deleteHosp('${escH(id)}','${escH(name)}')">${ico('trash')} Delete</button></div>
    </div>`);
    }

    async function deleteHosp(id, name) {
      try {
        await api('DELETE', `/hospitals/${id}`);
        toast(`Hospital "${name}" deleted.`, 'err');
        closeModal();
        renderHospitals(hospState.page, hospState.q);
      } catch (e) { toast(e.message, 'err'); }
    }

    async function exportHospCSV() {
      try {
        const data = await api('GET', '/hospitals?per_page=1000');
        const rows = data.items || [];
        const cols = ['ID', 'Doctor', 'Hospital', 'Specialty', 'Phone', 'Email', 'SMO?', 'SMO Name', 'SMO Contact', 'SMO Phone', 'Created', 'Updated'];
        const csv = [cols, ...rows.map(r => [r.id, r.dr_name, r.hospital_name, r.specialty, r.contact_number, r.email, r.smo ? 'Yes' : 'No', r.smo_name || '', r.smo_contact || '', r.smo_phone || '', fmtD(r.created_at), fmtD(r.updated_at)])].map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'agcr_hospitals.csv'; a.click();
        toast('Exported to CSV!');
      } catch (e) { toast(e.message, 'err'); }
    }

    // ─────────────────────────────────────────────────────────────────
    // MY ACTIVITY
    // ─────────────────────────────────────────────────────────────────
    async function renderMyActivity(page = 1) {
      setPage('My Activity', 'Your actions and changes');
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const data = await api('GET', `/logs/my?page=${page}&per_page=20`);
        const { items: logs, total, pages } = data;
        setContent(`
      <div class="dp">
        <div class="ph"><span class="pt">Actions by ${escH(STATE.user.name)}</span><span style="font-size:12px;color:var(--g400)">${total} total</span></div>
        <div style="padding:0 20px 8px">
          ${logs.length === 0
            ? `<p style="padding:20px;font-size:13px;color:var(--g400)">No activity logged yet.</p>`
            : logs.map(l => `<div class="ar">${actionIcon(l.action)}<div style="flex:1">
                <div style="font-size:13px;font-weight:500"><span class="${badgeClass(l.action)}" style="margin-right:7px">${l.action}</span><strong>${escH(l.hospital_name || '—')}</strong>${l.hospital_id ? ` <span class="code">${escH(l.hospital_id)}</span>` : ''}</div>
                <div class="am">${escH(l.detail || '')} · ${fmtDT(l.ts)}</div>
              </div></div>`).join('')
          }
        </div>
        ${pages > 1 ? `<div class="pg"><span class="pgi">Page ${page} of ${pages}</span><div class="pgb">${pgHTML(page, pages, 'renderMyActivity')}</div></div>` : ''}
      </div>`);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    // ─────────────────────────────────────────────────────────────────
    // SETTINGS (User Profile)
    // ─────────────────────────────────────────────────────────────────
    async function renderSettings() {
      setPage('Settings', 'Manage your profile and account');
      setContent(`<div class="empty"><div class="loader"></div></div>`);
      try {
        const u = await api('GET', '/users/me');
        STATE.user = { ...STATE.user, ...u };
        localStorage.setItem('agcr_user', JSON.stringify(STATE.user));
        renderSettingsUI(u);
      } catch (e) { setContent(`<div class="empty">Error: ${escH(e.message)}</div>`); }
    }

    function renderSettingsUI(u) {
      setContent(`
    <div style="width:100%;">
      <!-- Profile Card -->
      <div class="profile-card" style="margin-bottom:18px">
        <div class="section-title">Profile Information</div>
        <div class="profile-settings-grid">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar" id="settings-avatar">
              ${u.photo_url ? `<img src="${escH(u.photo_url)}" alt="avatar"/>` : `<span>${initials(u.name)}</span>`}
            </div>
            <label class="btn bo photo-btn">
              ${ico('camera')} Change Photo
              <input type="file" accept="image/*" onchange="handlePhotoUpload(event)"/>
            </label>
          </div>
          <div class="profile-settings-form">
            <div><label class="mfl">Full Name</label><input class="mfi" id="s-name" value="${escH(u.name || '')}"/></div>
            <div><label class="mfl">Email Address</label><input class="mfi" value="${escH(u.email || '')}" disabled style="opacity:.6;cursor:not-allowed"/></div>
            <div><label class="mfl">Phone Number</label><input class="mfi" id="s-phone" value="${escH(u.phone || '')}" placeholder="e.g. 9876543210"/></div>
            <div><label class="mfl">Role</label><input class="mfi" value="${escH(u.role || '')}" disabled style="opacity:.6;text-transform:capitalize"/></div>
            <div class="fw"><label class="mfl">Bio</label><textarea class="mfi" id="s-bio" rows="3" style="resize:vertical" placeholder="Tell us about yourself…">${escH(u.bio || '')}</textarea></div>
            <div style="margin-top:8px; display:flex;justify-content:flex-start;">
              <button class="btn bf" onclick="saveProfile()">${ico('check')} Save Changes</button>
            </div>
          </div>
        </div>
        <div class="sep"></div>
        <div class="section-title" style="margin-top:4px">Account Details</div>
        <div style="display:grid;gap:10px">
          <div class="info-row"><span class="info-label">User ID:</span><span class="info-val code">${escH(u.id || '—')}</span></div>
          <div class="info-row"><span class="info-label">Status:</span><span class="info-val">${statusBadge(u.status)}</span></div>
          <div class="info-row"><span class="info-label">Last Login:</span><span class="info-val">${fmtDT(u.last_login)}</span></div>
          <div class="info-row"><span class="info-label">Member Since:</span><span class="info-val">${fmtD(u.created_at)}</span></div>
        </div>
      </div>

      <!-- Change Password Card -->
      <div class="profile-card">
        <div class="section-title">Change Password</div>
        <div class="mg">
          <div class="fw"><label class="mfl">Current Password</label>
            <div class="iw"><span class="ii">${ico('lock', 14)}</span>
              <input class="mfi" id="pw-current" type="password" placeholder="Enter current password" style="padding-left:36px"/>
            </div>
          </div>
          <div><label class="mfl">New Password</label>
            <div class="iw"><span class="ii">${ico('lock', 14)}</span>
              <input class="mfi" id="pw-new" type="password" placeholder="Min 6 characters" style="padding-left:36px" oninput="pwStrength(this.value)"/>
            </div>
            <div id="pw-strength-bar" class="pw-strength" style="background:var(--g200)"></div>
          </div>
          <div><label class="mfl">Confirm New Password</label>
            <div class="iw"><span class="ii">${ico('lock', 14)}</span>
              <input class="mfi" id="pw-confirm" type="password" placeholder="Repeat new password" style="padding-left:36px"/>
            </div>
          </div>
        </div>
        <div style="margin-top:16px">
          <button class="btn bf" onclick="changePassword()">${ico('key')} Change Password</button>
        </div>
      </div>
    </div>
  `);
    }

    function pwStrength(val) {
      const bar = document.getElementById('pw-strength-bar');
      if (!bar) return;
      let s = 0;
      if (val.length >= 6) s++;
      if (val.length >= 10) s++;
      if (/[A-Z]/.test(val)) s++;
      if (/[0-9]/.test(val)) s++;
      if (/[^a-zA-Z0-9]/.test(val)) s++;
      const colors = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--amber)', 'var(--green)', 'var(--green)'];
      bar.style.background = val ? colors[s] : 'var(--g200)';
      bar.style.width = val ? (s / 5 * 100) + '%' : '100%';
    }

    async function handlePhotoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast('Image must be under 2MB', 'err'); return; }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const b64 = e.target.result;
        try {
          await api('POST', '/users/me/photo', { photo_url: b64 });
          STATE.user.photo_url = b64;
          localStorage.setItem('agcr_user', JSON.stringify(STATE.user));
          const avatarEl = document.getElementById('settings-avatar');
          if (avatarEl) avatarEl.innerHTML = `<img src="${b64}" alt="avatar"/>`;
          const sbAv = document.getElementById('sb-avatar');
          if (sbAv) sbAv.innerHTML = `<img src="${b64}" alt="avatar"/>`;
          toast('Profile photo updated!');
        } catch (err) { toast(err.message, 'err'); }
      };
      reader.readAsDataURL(file);
    }

    async function saveProfile() {
      const name = document.getElementById('s-name')?.value.trim();
      const phone = document.getElementById('s-phone')?.value.trim();
      const bio = document.getElementById('s-bio')?.value.trim();
      if (!name) { toast('Name is required', 'err'); return; }
      try {
        const u = await api('PUT', '/users/me', { name, phone, bio });
        STATE.user = { ...STATE.user, ...u };
        localStorage.setItem('agcr_user', JSON.stringify(STATE.user));
        document.getElementById('sb-name').textContent = u.name;
        const sbAv = document.getElementById('sb-avatar');
        if (!STATE.user.photo_url) sbAv.textContent = initials(u.name);
        toast('Profile updated successfully!');
      } catch (e) { toast(e.message, 'err'); }
    }

    async function changePassword() {
      const curr = document.getElementById('pw-current')?.value;
      const nw = document.getElementById('pw-new')?.value;
      const conf = document.getElementById('pw-confirm')?.value;
      if (!curr || !nw || !conf) { toast('All password fields are required', 'err'); return; }
      if (nw.length < 6) { toast('New password must be at least 6 characters', 'err'); return; }
      if (nw !== conf) { toast('Passwords do not match', 'err'); return; }
      try {
        await api('POST', '/auth/change-password', { current_password: curr, new_password: nw });
        toast('Password changed successfully!');
        document.getElementById('pw-current').value = '';
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
      } catch (e) { toast(e.message, 'err'); }
    }

    