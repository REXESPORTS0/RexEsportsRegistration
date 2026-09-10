/* ==========================================================================
   REX ESPORTS - APP CONTROLLER & STRICT MULTI-STAGE QUALIFICATION ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  initNavigation();
  initRegistrationForm();
  initConfirmedTeamsGallery();
  initQualifiedTeamsHub();
  initPlayerMatchHub();
  renderPublicGroups();
  populateDynamicRoundDropdowns();
  renderPublicStandings();
  renderPublicRoundsFlow();
  initAdminPanel();
  initSecretAdminShortcut();
  updateHeroMetrics();

  window.addEventListener('supabaseSyncComplete', () => {
    console.log('⚡ Cloud data received! Re-rendering all active website views live...');
    initConfirmedTeamsGallery();
    initQualifiedTeamsHub();
    renderPublicGroups();
    renderPublicStandings();
    updateHeroMetrics();

    // Re-render Admin Dashboard if Admin is currently viewing it
    const dashContent = document.getElementById('adminDashboardContent');
    if (dashContent && !dashContent.classList.contains('d-none')) {
      renderAdminDashboard();
    }

    // Refresh active Player Hub IDP search if player is looking up credentials
    const searchInput = document.getElementById('idpSearchInput');
    if (searchInput && searchInput.value.trim()) {
      const searchBtn = document.getElementById('idpSearchBtn');
      if (searchBtn) searchBtn.click();
    }
  });
});

function initSecretAdminShortcut() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      switchTab('admin');
      const lockScreen = document.getElementById('adminLockScreen');
      const dashboardContent = document.getElementById('adminDashboardContent');
      if (lockScreen && dashboardContent) {
        lockScreen.classList.add('d-none');
        dashboardContent.classList.remove('d-none');
        renderAdminDashboard();
      }
      showToast('Secret Admin Panel Shortcut Unlocked!', 'success');
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function switchTab(tabId) {
  const navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
  const panes = document.querySelectorAll('.tab-pane');

  navBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  panes.forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'confirmed') renderConfirmedTeamsGallery();
  if (tabId === 'qualified') renderQualifiedTeamsHub();
  if (tabId === 'groups') renderPublicGroups();
  if (tabId === 'standings') { populateDynamicRoundDropdowns(); renderPublicStandings(); }
  if (tabId === 'overview') updateHeroMetrics();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
      const mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu) mobileMenu.style.display = 'none';
    });
  });

  const mobileToggle = document.getElementById('mobileNavToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const current = mobileMenu.style.display;
      mobileMenu.style.display = current === 'flex' ? 'none' : 'flex';
    });
  }

  const brandBtn = document.getElementById('brandLogoBtn');
  if (brandBtn) brandBtn.addEventListener('click', () => switchTab('overview'));
}

function updateHeroMetrics() {
  const teams = window.store.getTeams();
  const heroCount = document.getElementById('heroRegisteredTeamsCount');
  if (heroCount) heroCount.textContent = teams.length;

  const cap = window.store.getActiveLobbyCapacity();
  const heroCap = document.getElementById('heroLobbyCapacity');
  if (heroCap) heroCap.textContent = cap;

  const rounds = window.store.getRounds();
  const heroStage = document.getElementById('heroActiveStage');
  if (heroStage && rounds.length > 0) heroStage.textContent = rounds[0].name.toUpperCase();
}

function populateDynamicRoundDropdowns() {
  const rounds = window.store.getRounds();
  const ids = ['standingsStageSelect', 'schStage', 'bcStage', 'scoreStageSelect'];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const currentVal = el.value;
      el.innerHTML = rounds.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      if (currentVal && rounds.some(r => r.id === currentVal)) el.value = currentVal;
    }
  });
}

function renderPublicRoundsFlow() {
  const container = document.getElementById('publicRoundsFlow');
  if (!container) return;

  const rounds = window.store.getRounds();
  container.innerHTML = rounds.map((r, idx) => `
    <div class="flow-item ${idx === rounds.length - 1 ? 'gold' : idx === 0 ? 'active' : ''}">
      <div class="flow-num">${idx === rounds.length - 1 ? '🏆' : (idx + 1)}</div>
      <div>
        <h4>${r.name} (${r.lobbyCapacity} Slots/Lobby)</h4>
        <p>${r.autoQualifyTopN > 0 ? `Top ${r.autoQualifyTopN} teams per group advance.` : 'Final showdown for Championship Title & Prize Pool!'}</p>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   REGISTRATION FORM & UNPREDICTABLE TEAM CODES
   ========================================================================== */
function initRegistrationForm() {
  const options = document.querySelectorAll('.avatar-option');
  let selectedAvatar = '🦖';

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedAvatar = opt.getAttribute('data-avatar');
    });
  });

  const form = document.getElementById('teamRegisterForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const teamName = document.getElementById('regTeamName').value.trim();
    const tag = document.getElementById('regTeamTag').value.trim();
    const capName = document.getElementById('regCapName').value.trim();
    const capPhone = document.getElementById('regCapPhone').value.trim();
    const capEmail = document.getElementById('regCapEmail').value.trim();
    const state = document.getElementById('regState').value.trim();

    const p1Name = document.getElementById('p1Name').value.trim();
    const p1Id = document.getElementById('p1Id').value.trim();
    const p2Name = document.getElementById('p2Name').value.trim();
    const p2Id = document.getElementById('p2Id').value.trim();
    const p3Name = document.getElementById('p3Name').value.trim();
    const p3Id = document.getElementById('p3Id').value.trim();
    const p4Name = document.getElementById('p4Name').value.trim();
    const p4Id = document.getElementById('p4Id').value.trim();
    const subName = document.getElementById('pSubName').value.trim();
    const subId = document.getElementById('pSubId').value.trim();

    const players = [
      { name: p1Name, id: p1Id, role: 'Captain / IGL' },
      { name: p2Name, id: p2Id, role: 'Player 2' },
      { name: p3Name, id: p3Id, role: 'Player 3' },
      { name: p4Name, id: p4Id, role: 'Player 4' }
    ];
    if (subName && subId) players.push({ name: subName, id: subId, role: 'Substitute' });

    const newTeam = window.store.addTeam({
      teamName, tag, logo: selectedAvatar, capName, capPhone, capEmail, state, players, status: 'Approved'
    });

    if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    showToast(`Team ${teamName} Registered! Private Code: ${newTeam.code}`, 'success');
    showRegistrationModal(newTeam);
    form.reset();
  });
}

function showRegistrationModal(team) {
  const modal = document.getElementById('registrationModal');
  if (!modal) return;

  document.getElementById('modalTeamCode').textContent = team.code;
  document.getElementById('modalTeamName').textContent = team.teamName;
  document.getElementById('modalCapName').textContent = team.capName;
  document.getElementById('modalCapPhone').textContent = team.capPhone;

  const chipsContainer = document.getElementById('modalRosterChips');
  chipsContainer.innerHTML = team.players.map(p => `
    <span class="roster-chip"><i data-lucide="user"></i> <strong>${p.name}</strong> (${p.id})</span>
  `).join('');

  modal.classList.remove('d-none');
  if (window.lucide) lucide.createIcons();
}

function closeRegistrationModal() {
  const modal = document.getElementById('registrationModal');
  if (modal) modal.classList.add('d-none');
}

function goToPlayerHubWithCode() {
  const code = document.getElementById('modalTeamCode').textContent;
  closeRegistrationModal();
  switchTab('player-hub');
  const searchInput = document.getElementById('playerSearchQuery');
  if (searchInput) {
    searchInput.value = code;
    document.getElementById('playerSearchBtn').click();
  }
}

/* ==========================================================================
   CONFIRMED TEAMS GALLERY (PRIVATE CODE PRIVACY MASKING)
   ========================================================================== */
function initConfirmedTeamsGallery() {
  const searchInput = document.getElementById('confirmedSearchInput');
  const groupFilter = document.getElementById('confirmedGroupFilter');

  if (searchInput) searchInput.oninput = renderConfirmedTeamsGallery;
  if (groupFilter) groupFilter.onchange = renderConfirmedTeamsGallery;
}

function renderConfirmedTeamsGallery() {
  const container = document.getElementById('confirmedTeamsGrid');
  const searchInput = document.getElementById('confirmedSearchInput');
  const groupFilter = document.getElementById('confirmedGroupFilter');
  if (!container) return;

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const grp = groupFilter ? groupFilter.value : 'all';

  let teams = window.store.getTeams().filter(t => t.status === 'Approved');

  if (grp !== 'all') teams = teams.filter(t => t.group === grp);
  if (query) {
    teams = teams.filter(t => 
      t.teamName.toLowerCase().includes(query) ||
      t.tag.toLowerCase().includes(query) ||
      t.capName.toLowerCase().includes(query)
    );
  }

  if (teams.length === 0) {
    container.innerHTML = `<div class="card full-width text-center"><p class="text-muted">No confirmed teams match your filter.</p></div>`;
    return;
  }

  container.innerHTML = teams.map(t => `
    <div class="team-card">
      <div class="team-card-header">
        <span class="team-name-lg">${t.logo || 'REX'} ${t.teamName}</span>
        <span class="badge blue">${t.group} - Slot ${t.slot}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-muted);">
        <div><strong>Captain:</strong> ${t.capName}</div>
        <div><strong>Status:</strong> <span class="badge green">VERIFIED REGISTRATION</span></div>
      </div>
      <div class="roster-chips mt-2">
        ${t.players.map(p => `<span class="roster-chip"><i data-lucide="user"></i> ${p.name}</span>`).join('')}
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   PUBLIC QUALIFIED TEAMS HUB (STRICTLY SHOWS ONLY QUALIFIED TEAMS PER STAGE)
   ========================================================================== */
function initQualifiedTeamsHub() {
  const stageTabsContainer = document.getElementById('qualifiedStageTabs');
  if (!stageTabsContainer) return;

  const rounds = window.store.getRounds();
  stageTabsContainer.innerHTML = rounds.map((r, idx) => `
    <button class="stage-tab-btn ${idx === 1 ? 'active' : (idx === 0 && rounds.length === 1 ? 'active' : '')}" data-stage="${r.id}">
      <i data-lucide="${idx === rounds.length - 1 ? 'trophy' : 'award'}"></i> ${r.name.toUpperCase()}
    </button>
  `).join('');

  stageTabsContainer.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stageTabsContainer.querySelectorAll('.stage-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQualifiedTeamsHub();
    });
  });

  renderQualifiedTeamsHub();
}

function renderQualifiedTeamsHub() {
  const tbody = document.getElementById('qualifiedTeamsTableBody');
  const activeTab = document.querySelector('#qualifiedStageTabs .stage-tab-btn.active');
  const targetStageId = activeTab ? activeTab.getAttribute('data-stage') : 'round2';

  if (!tbody) return;

  // STRICT FILTERING: Fetch ONLY teams qualified for this specific round!
  const roundTeams = window.store.getTeamsForRound(targetStageId).filter(t => 
    t.qualificationStatus && t.qualificationStatus.toLowerCase().includes('qualified')
  );

  if (roundTeams.length === 0) {
    const roundObj = window.store.getRoundById(targetStageId);
    const roundName = roundObj ? roundObj.name : 'this round';

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:2.5rem; color:var(--text-muted);">
          <div style="font-size:2rem; color:var(--accent-gold); margin-bottom:0.5rem;">🏆</div>
          <strong style="font-size:1.1rem; color:var(--bg-dark-accent);">No teams qualified for ${roundName} yet.</strong>
          <p style="font-size:0.88rem; margin-top:0.2rem;">Matches are in progress! Once Round 1 finishes, qualified teams will appear here automatically.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = roundTeams.map((t, idx) => `
    <tr>
      <td><span class="badge green">#${idx + 1} QUALIFIED</span></td>
      <td><strong>${t.logo || '🦖'} ${t.teamName}</strong> <small>[${t.tag}]</small></td>
      <td>${t.group}</td>
      <td><strong>Slot #${t.slot}</strong></td>
      <td><span class="badge green">${t.qualificationStatus}</span></td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   PLAYER MATCH PORTAL
   ========================================================================== */
function initPlayerMatchHub() {
  const searchBtn = document.getElementById('playerSearchBtn');
  const searchInput = document.getElementById('playerSearchQuery');

  if (!searchBtn || !searchInput) return;

  const handleSearch = () => {
    const query = searchInput.value.trim();
    if (!query) { showToast('Enter your private Team Code or WhatsApp number', 'error'); return; }

    const team = window.store.getTeamByCodeOrPhone(query);
    const container = document.getElementById('playerMatchResult');

    if (!team) {
      container.innerHTML = `
        <div class="card text-center">
          <div class="empty-icon"><i data-lucide="alert-circle"></i></div>
          <h3>NO TEAM FOUND</h3>
          <p>No registration matched "${query}". Please check your private 6-character Team Code.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const broadcast = window.store.getBroadcastForGroup(team.group);
    const schedules = window.store.getSchedules().filter(s => s.group === team.group);

    container.innerHTML = `
      <div class="card">
        <div class="flex-between pb-3" style="border-bottom:1px solid var(--border-color);">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:2rem;">${team.logo || '🦖'}</span>
            <div>
              <h3 style="font-family:var(--font-heading); font-size:1.6rem; margin:0;">${team.teamName} [${team.tag}]</h3>
              <span class="badge blue">Team Code: ${team.code}</span>
            </div>
          </div>
          <span class="badge ${team.qualificationStatus && team.qualificationStatus.includes('Qualified') ? 'green' : 'gray'}" style="font-size:0.9rem; padding:0.4rem 0.8rem;">
            ${team.qualificationStatus || 'Round 1 Competitor'}
          </span>
        </div>

        <div class="grid-3col mt-3">
          <div class="stat-card">
            <span class="stat-label">ASSIGNED GROUP</span>
            <span class="stat-value" style="font-size:1.6rem;">${team.group}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">LOBBY SLOT NUMBER</span>
            <span class="stat-value" style="font-size:1.6rem; color:var(--primary-blue);">SLOT ${team.slot}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">QUALIFICATION STATUS</span>
            <span class="stat-value" style="font-size:1.2rem; color:var(--accent-green);">${team.qualificationStatus || 'ROUND 1 OPEN'}</span>
          </div>
        </div>

        <div class="mt-4">
          <h4 style="font-family:var(--font-heading); color:var(--bg-dark-accent);"><i data-lucide="calendar"></i> YOUR GROUP MATCH SCHEDULE</h4>
          ${schedules.length > 0 ? `
            <table class="styled-table compact mt-2">
              <thead>
                <tr><th>MATCH #</th><th>DATE & TIME</th><th>MAP</th></tr>
              </thead>
              <tbody>
                ${schedules.map(s => `
                  <tr>
                    <td><strong>${s.matchNum}</strong></td>
                    <td>${new Date(s.time).toLocaleString()}</td>
                    <td><span class="badge blue">${s.map}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<p class="text-muted mt-2">No match schedules published for ${team.group} yet.</p>`}
        </div>

        <div class="card mt-4" style="background:var(--primary-blue-light); border-color:rgba(0,82,255,0.3);">
          <div class="flex-between">
            <h4 style="font-family:var(--font-heading); color:var(--primary-blue); display:flex; align-items:center; gap:0.5rem; margin:0;">
              <i data-lucide="key"></i> BGMI ROOM MATCH CREDENTIALS
            </h4>
            <span class="badge ${broadcast ? 'green' : 'gray'}">${broadcast ? '🔓 LIVE' : '🔒 LOCKED'}</span>
          </div>

          ${broadcast ? `
            <div class="grid-2col mt-3">
              <div class="card text-center">
                <span class="stat-label">ROOM ID</span>
                <span class="stat-value" style="font-size:2rem;">${broadcast.roomId}</span>
                <button class="btn btn-secondary btn-sm mt-2" onclick="navigator.clipboard.writeText('${broadcast.roomId}'); showToast('Room ID Copied!', 'success');">
                  <i data-lucide="copy"></i> COPY ROOM ID
                </button>
              </div>
              <div class="card text-center">
                <span class="stat-label">PASSWORD</span>
                <span class="stat-value" style="font-size:2rem; color:var(--accent-red);">${broadcast.roomPass}</span>
                <button class="btn btn-secondary btn-sm mt-2" onclick="navigator.clipboard.writeText('${broadcast.roomPass}'); showToast('Password Copied!', 'success');">
                  <i data-lucide="copy"></i> COPY PASS
                </button>
              </div>
            </div>
          ` : `<p class="text-muted mt-2">Room credentials will unlock 15 minutes before your match start time.</p>`}
        </div>

        <div class="mt-4">
          <h4 style="font-family:var(--font-heading);"><i data-lucide="users"></i> TEAM ROSTER</h4>
          <div class="roster-chips mt-1">
            ${team.players.map(p => `<span class="roster-chip"><i data-lucide="shield-check"></i> ${p.name} (${p.id})</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  };

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
}

/* ==========================================================================
   PUBLIC GROUPS & DYNAMIC SLOT CAPACITY MATRIX
   ========================================================================== */
function renderPublicGroups() {
  const groupsTabBar = document.getElementById('publicGroupTabs');
  const container = document.getElementById('publicSlotsContainer');
  if (!groupsTabBar || !container) return;

  const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
  let activeGroup = groupsTabBar.querySelector('.stage-tab-btn.active')?.getAttribute('data-group') || 'Group A';

  groupsTabBar.innerHTML = groups.map(g => `
    <button class="stage-tab-btn ${g === activeGroup ? 'active' : ''}" data-group="${g}">${g}</button>
  `).join('');

  groupsTabBar.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      groupsTabBar.querySelectorAll('.stage-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSlotsForGroup(btn.getAttribute('data-group'));
    });
  });

  renderSlotsForGroup(activeGroup);
}

function renderSlotsForGroup(groupName) {
  const container = document.getElementById('publicSlotsContainer');
  const capacity = window.store.getActiveLobbyCapacity();
  const allTeams = window.store.getTeams().filter(t => t.group === groupName && t.status === 'Approved');

  const slotsArray = Array.from({ length: capacity }, (_, i) => {
    const slotNum = i + 1;
    const tm = allTeams.find(t => t.slot === slotNum);
    return { slotNum, tm };
  });

  container.innerHTML = `
    <div class="teams-grid">
      ${slotsArray.map(s => `
        <div class="team-card">
          <div class="flex-between">
            <span class="badge blue">SLOT #${s.slotNum}</span>
            <span class="badge ${s.tm ? 'green' : 'gray'}">${s.tm ? 'FILLED' : 'OPEN'}</span>
          </div>
          <div class="team-name-lg mt-2">${s.tm ? `${s.tm.logo || '🦖'} ${s.tm.teamName}` : 'EMPTY SLOT'}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${s.tm ? `Cap: ${s.tm.capName}` : 'Awaiting Team'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ==========================================================================
   PUBLIC STANDINGS
   ========================================================================== */
function renderPublicStandings() {
  const stageSelect = document.getElementById('standingsStageSelect');
  const groupSelect = document.getElementById('standingsGroupSelect');
  const searchInput = document.getElementById('standingsSearchInput');
  const tbody = document.getElementById('publicLeaderboardBody');

  if (!tbody) return;

  const stage = stageSelect ? stageSelect.value : 'round1';
  const group = groupSelect ? groupSelect.value : 'all';
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let leaderboard = window.store.getLeaderboard(stage, group);

  if (searchQuery) {
    leaderboard = leaderboard.filter(t => t.teamName.toLowerCase().includes(searchQuery));
  }

  tbody.innerHTML = leaderboard.map((t, idx) => `
    <tr>
      <td><strong>#${idx + 1}</strong></td>
      <td><strong>${t.logo} ${t.teamName}</strong> <small>(${t.group})</small></td>
      <td>${t.matchesPlayed}</td>
      <td style="color:var(--accent-gold); font-weight:700;">${t.wwcdCount} 🏆</td>
      <td>${t.placementPts}</td>
      <td style="color:var(--primary-blue); font-weight:700;">${t.killPts}</td>
      <td style="font-family:var(--font-heading); font-size:1.3rem; font-weight:700; color:var(--primary-blue);">${t.totalPts}</td>
      <td><span class="badge ${t.qualificationStatus && t.qualificationStatus.includes('Qualified') ? 'green' : 'gray'}">${t.qualificationStatus || 'Pending'}</span></td>
    </tr>
  `).join('');

  if (stageSelect) stageSelect.onchange = renderPublicStandings;
  if (groupSelect) groupSelect.onchange = renderPublicStandings;
  if (searchInput) searchInput.oninput = renderPublicStandings;
}

/* ==========================================================================
   ADMIN PANEL CONTROLLER (ISOLATED DYNAMIC ROUND SECTIONS)
   ========================================================================== */
window.unlockAdminDirectly = function() {
  const lockScreen = document.getElementById('adminLockScreen');
  const dashboardContent = document.getElementById('adminDashboardContent');
  if (lockScreen) {
    lockScreen.classList.add('d-none');
    lockScreen.style.display = 'none';
  }
  if (dashboardContent) {
    dashboardContent.classList.remove('d-none');
    dashboardContent.style.display = 'block';
  }
  if (typeof showToast === 'function') showToast('Admin Control Center Unlocked!', 'success');
  if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
};

function initAdminPanel() {
  const pinInput = document.getElementById('adminPinInput');
  const loginBtn = document.getElementById('adminLoginBtn');
  const lockScreen = document.getElementById('adminLockScreen');
  const dashboardContent = document.getElementById('adminDashboardContent');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (!loginBtn) return;

  const handleLogin = async () => {
    try {
      const pin = pinInput ? pinInput.value.trim() : '';
      if (!pin) return showToast('Please enter Admin PIN to unlock', 'error');

      const isValid = window.store ? await window.store.verifyAdminPin(pin) : (pin.toUpperCase() === 'REXADMIN2026');

      if (isValid) {
        if (lockScreen) {
          lockScreen.classList.add('d-none');
          lockScreen.style.display = 'none';
        }
        if (dashboardContent) {
          dashboardContent.classList.remove('d-none');
          dashboardContent.style.display = 'block';
        }
        showToast('Admin Control Center Unlocked!', 'success');
        renderAdminDashboard();
      } else {
        showToast('Access Denied: Invalid Security PIN', 'error');
      }
    } catch (err) {
      console.error('Admin unlock error:', err);
      showToast('Unlock Error: ' + err.message, 'error');
    }
  };

  loginBtn.addEventListener('click', handleLogin);
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (lockScreen) {
        lockScreen.classList.remove('d-none');
        lockScreen.style.display = 'block';
      }
      if (dashboardContent) {
        dashboardContent.classList.add('d-none');
        dashboardContent.style.display = 'none';
      }
      if (pinInput) pinInput.value = '';
    });
  }

  const subtabs = document.querySelectorAll('.admin-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetPane = tab.getAttribute('data-subtab');
      document.querySelectorAll('.admin-subpane').forEach(p => p.classList.remove('active'));
      document.getElementById(`subtab-${targetPane}`).classList.add('active');

      if (targetPane === 'teams-mgr') renderAdminTeamsTable();
      if (targetPane === 'round-settings-mgr') renderAdminRoundsTable();
      if (targetPane === 'qualify-mgr') { initAdminQualifyRoundSubtabs(); }
      if (targetPane === 'schedule-mgr') renderAdminSchedulesTable();
      if (targetPane === 'groups-mgr') { populateTeamTransferDropdown(); renderAdminGroupsGrid(); }
      if (targetPane === 'room-mgr') renderAdminBroadcastsTable();
      if (targetPane === 'points-mgr') renderAdminScoreEntryTable();
    });
  });

  const exportBtn = document.getElementById('exportExcelBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.store.exportTeamsToExcel();
      showToast('Excel spreadsheet exported to laptop Downloads folder!', 'success');
    });
  }

  const addRoundForm = document.getElementById('addRoundForm');
  if (addRoundForm) {
    addRoundForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newRoundName').value.trim();
      const qualifyTop = parseInt(document.getElementById('newRoundQualifyTop').value) || 4;
      const lobbyCap = parseInt(document.getElementById('newRoundLobbyCap').value) || 16;

      window.store.addRound(name, qualifyTop, lobbyCap);
      showToast(`Dynamic Round "${name}" Created!`, 'success');
      renderAdminRoundsTable();
      populateDynamicRoundDropdowns();
      renderPublicRoundsFlow();
      initAdminQualifyRoundSubtabs();
      addRoundForm.reset();
    });
  }

  const autoQualifyRoundBtn = document.getElementById('autoQualifyRoundBtn');
  if (autoQualifyRoundBtn) {
    autoQualifyRoundBtn.addEventListener('click', () => {
      const activeRoundTab = document.querySelector('#admQualifyRoundSubtabs .stage-tab-btn.active');
      const sourceRoundId = activeRoundTab ? activeRoundTab.getAttribute('data-round') : 'round1';
      const targetStatus = document.getElementById('admQualifyTargetStatusSelect').value;
      const rndObj = window.store.getRoundById(sourceRoundId);
      const topN = rndObj ? rndObj.autoQualifyTopN : 4;

      let targetStageId = 'round2';
      if (targetStatus.toLowerCase().includes('final')) targetStageId = 'finals';

      window.store.autoQualifyRoundTeams(sourceRoundId, targetStatus, targetStageId, topN);
      showToast(`Auto-qualified Top ${topN} teams from ${rndObj.name} to ${targetStatus}!`, 'success');
      renderAdminQualifyTableForRound(sourceRoundId);
      renderQualifiedTeamsHub();
    });
  }

  const transferForm = document.getElementById('transferTeamForm');
  if (transferForm) {
    transferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('trTeamSelect').value;
      const targetGroup = document.getElementById('trTargetGroup').value;
      const targetSlot = document.getElementById('trTargetSlot').value;

      window.store.transferTeamGroup(code, targetGroup, targetSlot);
      showToast(`Team transferred to ${targetGroup} - Slot #${targetSlot}!`, 'success');
      renderAdminGroupsGrid();
    });
  }

  const schForm = document.getElementById('scheduleForm');
  if (schForm) {
    schForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const group = document.getElementById('schGroup').value;
      const stage = document.getElementById('schStage').value;
      const matchNum = document.getElementById('schMatchNum').value.trim();
      const time = document.getElementById('schTime').value;
      const map = document.getElementById('schMap').value;

      window.store.addSchedule({ group, stage, matchNum, time, map });
      showToast(`Schedule added for ${group} (${matchNum})!`, 'success');
      renderAdminSchedulesTable();
      schForm.reset();
    });
  }

  const autoAssignBtn = document.getElementById('autoAssignGroupsBtn');
  if (autoAssignBtn) {
    autoAssignBtn.addEventListener('click', () => {
      window.store.autoAllocateGroups();
      const cap = window.store.getActiveLobbyCapacity();
      showToast(`Automated ${cap}-slot lobby groups assigned!`, 'success');
      renderAdminGroupsGrid();
      renderAdminTeamsTable();
    });
  }

  const bcForm = document.getElementById('broadcastRoomForm');
  if (bcForm) {
    bcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const group = document.getElementById('bcGroup').value;
      const stage = document.getElementById('bcStage').value;
      const roomId = document.getElementById('bcRoomId').value.trim();
      const roomPass = document.getElementById('bcRoomPass').value.trim();
      const matchTime = document.getElementById('bcMatchTime').value;
      const map = document.getElementById('bcMap').value;

      window.store.saveBroadcast({ group, stage, roomId, roomPass, matchTime, map, isLive: true });
      showToast(`Room credentials broadcasted for ${group}!`, 'success');
      renderAdminBroadcastsTable();
      bcForm.reset();
    });
  }

  const saveScoresBtn = document.getElementById('saveMatchScoresBtn');
  if (saveScoresBtn) saveScoresBtn.addEventListener('click', saveMatchScoresFromTable);
}

/* ISOLATED DYNAMIC ROUND QUALIFICATION HUBS IN ADMIN */
function initAdminQualifyRoundSubtabs() {
  const container = document.getElementById('admQualifyRoundSubtabs');
  if (!container) return;

  const rounds = window.store.getRounds();
  let activeRoundId = container.querySelector('.stage-tab-btn.active')?.getAttribute('data-round') || (rounds[0] ? rounds[0].id : 'round1');

  container.innerHTML = rounds.map(r => `
    <button class="stage-tab-btn ${r.id === activeRoundId ? 'active' : ''}" data-round="${r.id}">
      <i data-lucide="git-commit"></i> ${r.name.toUpperCase()}
    </button>
  `).join('');

  container.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.stage-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRoundId = btn.getAttribute('data-round');
      renderAdminQualifyTableForRound(activeRoundId);
    });
  });

  renderAdminQualifyTableForRound(activeRoundId);
}

function renderAdminQualifyTableForRound(roundId) {
  const tbody = document.getElementById('adminQualifyTableBody');
  if (!tbody) return;

  // STRICT ISOLATED FILTERING: Only fetch teams participating in this specific round!
  const roundTeams = window.store.getTeamsForRound(roundId);

  if (roundTeams.length === 0) {
    const roundObj = window.store.getRoundById(roundId);
    const roundName = roundObj ? roundObj.name : 'this round';

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding:2.5rem; color:var(--text-muted);">
          <strong style="color:var(--bg-dark-accent);">No teams qualified for ${roundName} yet.</strong>
          <p style="font-size:0.85rem; margin-top:0.25rem;">Qualify teams from the previous round section to populate this list!</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = roundTeams.map(t => `
    <tr>
      <td><strong style="color:var(--primary-blue); font-family:var(--font-heading);">${t.code}</strong></td>
      <td><strong>${t.logo || '🦖'} ${t.teamName}</strong></td>
      <td>${t.group}</td>
      <td><strong>Slot #${t.slot}</strong></td>
      <td><strong style="color:var(--primary-blue);">${t.qualificationStatus || 'Round 1 Competitor'}</strong></td>
      <td>
        <select class="form-select qualify-select" data-code="${t.code}">
          <option value="Round 1 Competitor" ${t.qualificationStatus === 'Round 1 Competitor' ? 'selected' : ''}>Round 1 Competitor</option>
          <option value="Qualified for Round 2" ${t.qualificationStatus === 'Qualified for Round 2' ? 'selected' : ''}>Qualified for Round 2 🏆</option>
          <option value="Qualified for Quarter Finals" ${t.qualificationStatus === 'Qualified for Quarter Finals' ? 'selected' : ''}>Qualified for Quarter Finals ⚡</option>
          <option value="Qualified for Semi Finals" ${t.qualificationStatus === 'Qualified for Semi Finals' ? 'selected' : ''}>Qualified for Semi Finals 🔥</option>
          <option value="Qualified for Grand Finals" ${t.qualificationStatus === 'Qualified for Grand Finals' ? 'selected' : ''}>Qualified for Grand Finals 👑</option>
          <option value="Eliminated in Round 1" ${t.qualificationStatus === 'Eliminated in Round 1' ? 'selected' : ''}>Eliminated in Round 1 ❌</option>
          <option value="Disqualified" ${t.qualificationStatus === 'Disqualified' ? 'selected' : ''}>Disqualified 🚫</option>
        </select>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.qualify-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const code = e.target.getAttribute('data-code');
      const val = e.target.value;
      let targetStage = 'round1';
      if (val.toLowerCase().includes('round 2')) targetStage = 'round2';
      if (val.toLowerCase().includes('final')) targetStage = 'finals';

      window.store.updateTeamQualification(code, val, targetStage);
      showToast('Qualification status updated!', 'success');
      renderAdminQualifyTableForRound(roundId);
      renderQualifiedTeamsHub();
    });
  });
}

function renderAdminDashboard() {
  const teams = window.store.getTeams();
  const approved = teams.filter(t => t.status === 'Approved').length;
  const rounds = window.store.getRounds();

  document.getElementById('admTotalTeams').textContent = teams.length;
  document.getElementById('admApprovedTeams').textContent = approved;
  document.getElementById('admTotalRounds').textContent = rounds.length;

  renderAdminTeamsTable();
  renderAdminRoundsTable();
  initAdminQualifyRoundSubtabs();
  renderAdminSchedulesTable();
  populateTeamTransferDropdown();
  renderAdminGroupsGrid();
  renderAdminBroadcastsTable();
  renderAdminScoreEntryTable();
}

function renderAdminTeamsTable() {
  const tbody = document.getElementById('adminTeamsTableBody');
  const searchInput = document.getElementById('adminTeamSearch');
  const statusFilter = document.getElementById('adminStatusFilter');

  if (!tbody) return;

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filter = statusFilter ? statusFilter.value : 'all';

  let teams = window.store.getTeams();
  if (filter !== 'all') teams = teams.filter(t => t.status === filter);
  if (query) {
    teams = teams.filter(t => 
      t.teamName.toLowerCase().includes(query) ||
      t.code.toLowerCase().includes(query) ||
      t.capName.toLowerCase().includes(query) ||
      t.capPhone.includes(query)
    );
  }

  tbody.innerHTML = teams.map(t => `
    <tr>
      <td><strong style="color:var(--primary-blue); font-family:var(--font-heading);">${t.code}</strong></td>
      <td><strong>${t.logo || '🦖'} ${t.teamName}</strong></td>
      <td>${t.capName}</td>
      <td><div>${t.capPhone}</div><small class="text-muted">${t.capEmail}</small></td>
      <td>${t.group}</td>
      <td>Slot ${t.slot}</td>
      <td><span class="badge ${t.qualificationStatus && t.qualificationStatus.includes('Qualified') ? 'green' : 'gray'}">${t.qualificationStatus || 'Pending'}</span></td>
      <td>
        <select class="form-select status-select" data-code="${t.code}" style="padding:0.2rem 0.4rem; font-size:0.8rem;">
          <option value="Approved" ${t.status === 'Approved' ? 'selected' : ''}>Approved</option>
          <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Rejected" ${t.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteTeamFromAdmin('${t.code}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      window.store.updateTeamStatus(e.target.getAttribute('data-code'), e.target.value);
      showToast('Status updated', 'info');
    });
  });

  if (searchInput) searchInput.oninput = renderAdminTeamsTable;
  if (statusFilter) statusFilter.onchange = renderAdminTeamsTable;
}

function renderAdminRoundsTable() {
  const tbody = document.getElementById('adminRoundsTableBody');
  if (!tbody) return;

  const rounds = window.store.getRounds();

  tbody.innerHTML = rounds.map(r => `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td><span class="badge blue">Top ${r.autoQualifyTopN} Advance</span></td>
      <td><strong>${r.lobbyCapacity} Slots</strong></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteRoundFromAdmin('${r.id}')">
          <i data-lucide="trash-2"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function deleteRoundFromAdmin(id) {
  if (confirm('Delete this tournament round?')) {
    window.store.deleteRound(id);
    renderAdminRoundsTable();
    populateDynamicRoundDropdowns();
    renderPublicRoundsFlow();
    initAdminQualifyRoundSubtabs();
    showToast('Round deleted', 'info');
  }
}

function populateTeamTransferDropdown() {
  const select = document.getElementById('trTeamSelect');
  if (!select) return;

  const teams = window.store.getTeams().filter(t => t.status === 'Approved');
  select.innerHTML = teams.map(t => `<option value="${t.code}">${t.teamName} (${t.code} - Currently: ${t.group} Slot #${t.slot})</option>`).join('');
}

function deleteTeamFromAdmin(code) {
  if (confirm(`Delete team ${code}?`)) {
    window.store.deleteTeam(code);
    renderAdminTeamsTable();
    showToast('Team deleted', 'info');
  }
}

function renderAdminSchedulesTable() {
  const tbody = document.getElementById('adminSchedulesTableBody');
  if (!tbody) return;

  const schedules = window.store.getSchedules();

  tbody.innerHTML = schedules.map(s => `
    <tr>
      <td><strong>${s.group}</strong></td>
      <td>${s.stage.toUpperCase()}</td>
      <td><strong>${s.matchNum}</strong></td>
      <td>${new Date(s.time).toLocaleString()}</td>
      <td><span class="badge blue">${s.map}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.store.deleteSchedule('${s.id}'); renderAdminSchedulesTable(); showToast('Schedule deleted', 'info');">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function renderAdminGroupsGrid() {
  const container = document.getElementById('adminGroupsGrid');
  if (!container) return;

  const capacity = window.store.getActiveLobbyCapacity();
  const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
  const allTeams = window.store.getTeams().filter(t => t.status === 'Approved');

  container.innerHTML = groups.map(gName => {
    const groupTeams = allTeams.filter(t => t.group === gName);
    return `
      <div class="card mb-3">
        <div class="flex-between mb-2">
          <h4>${gName} (${groupTeams.length} / ${capacity} Slots)</h4>
        </div>
        <div class="table-responsive">
          <table class="styled-table compact">
            <thead>
              <tr><th>SLOT #</th><th>TEAM CODE</th><th>TEAM NAME</th><th>CAPTAIN PHONE</th></tr>
            </thead>
            <tbody>
              ${Array.from({ length: capacity }, (_, i) => {
                const sNum = i + 1;
                const tm = groupTeams.find(t => t.slot === sNum);
                return `
                  <tr>
                    <td><strong>#${sNum}</strong></td>
                    <td style="color:var(--primary-blue); font-weight:700;">${tm ? tm.code : '-'}</td>
                    <td>${tm ? `${tm.logo || '🦖'} ${tm.teamName}` : '<em class="text-muted">Empty Slot</em>'}</td>
                    <td>${tm ? tm.capPhone : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function renderAdminBroadcastsTable() {
  const tbody = document.getElementById('adminBroadcastsBody');
  if (!tbody) return;

  const broadcasts = window.store.getBroadcasts();
  tbody.innerHTML = broadcasts.map(b => `
    <tr>
      <td><strong>${b.group}</strong></td>
      <td>${b.stage.toUpperCase()}</td>
      <td>${new Date(b.matchTime).toLocaleString()}</td>
      <td>${b.map}</td>
      <td style="font-weight:700; color:var(--primary-blue);">${b.roomId}</td>
      <td style="font-weight:700; color:var(--accent-red);">${b.roomPass}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.store.deleteBroadcast('${b.id}'); renderAdminBroadcastsTable(); showToast('Broadcast deleted', 'info');">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function renderAdminScoreEntryTable() {
  const group = document.getElementById('scoreGroupSelect')?.value || 'Group A';
  const tbody = document.getElementById('adminScoreEntryBody');
  if (!tbody) return;

  const groupTeams = window.store.getTeams().filter(t => t.group === group && t.status === 'Approved');

  tbody.innerHTML = groupTeams.map((t, idx) => `
    <tr data-code="${t.code}">
      <td><strong>Slot #${t.slot}</strong></td>
      <td><strong>${t.logo || '🦖'} ${t.teamName}</strong></td>
      <td><input type="number" class="form-input rank-input" value="${idx + 1}" min="1" max="20" style="width:80px;"></td>
      <td><input type="number" class="form-input kills-input" value="0" min="0" max="50" style="width:80px;"></td>
    </tr>
  `).join('');
}

function saveMatchScoresFromTable() {
  const stage = document.getElementById('scoreStageSelect').value;
  const group = document.getElementById('scoreGroupSelect').value;
  const matchNum = document.getElementById('scoreMatchNumSelect').value;
  const rows = document.querySelectorAll('#adminScoreEntryBody tr');

  const scores = [];
  rows.forEach(row => {
    const code = row.getAttribute('data-code');
    const team = window.store.getTeamByCodeOrPhone(code);
    const rank = parseInt(row.querySelector('.rank-input').value) || 20;
    const kills = parseInt(row.querySelector('.kills-input').value) || 0;

    if (team) {
      scores.push({ teamCode: code, teamName: team.teamName, rank, kills });
    }
  });

  window.store.saveMatchScore({ stage, group, matchNum, scores });
  showToast(`Match scores saved for ${group}!`, 'success');
  renderPublicStandings();
}
