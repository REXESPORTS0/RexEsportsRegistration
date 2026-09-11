/* ==========================================================================
   REX ESPORTS - APP CONTROLLER & STRICT MULTI-STAGE QUALIFICATION ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  renderBrandLogo();
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
    renderBrandLogo();
    initConfirmedTeamsGallery();
    initQualifiedTeamsHub();
    renderPublicGroups();
    renderPublicStandings();
    renderPublicRoundsFlow();
    updateHeroMetrics();
    populateDynamicRoundDropdowns();

    // Re-render Admin Dashboard ONLY if the user is NOT currently typing inside an input/textarea
    const activeEl = document.activeElement;
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.tagName === 'SELECT'
    );

    const dashContent = document.getElementById('adminDashboardContent');
    if (dashContent && !dashContent.classList.contains('d-none') && !isTyping) {
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
  const settings = window.store ? window.store.getSettings() : {};
  const teams = window.store ? window.store.getTeams() : [];

  const brandTitleEl = document.getElementById('brandTitleDisplay');
  if (brandTitleEl && settings.tournamentTitle) {
    brandTitleEl.innerHTML = `${settings.tournamentTitle} <span class="highlight">PORTAL</span>`;
  }

  const heroTitleEl = document.getElementById('heroTitleDisplay');
  if (heroTitleEl && settings.tournamentTitle) {
    heroTitleEl.innerHTML = settings.tournamentTitle;
  }

  const prizeEl = document.getElementById('heroPrizePool');
  if (prizeEl) prizeEl.textContent = settings.prizePool || '₹50,000';

  const feeEl = document.getElementById('heroEntryFee');
  if (feeEl) feeEl.textContent = settings.entryFee || 'FREE';

  const descEl = document.getElementById('heroDescription');
  if (descEl && settings.description) descEl.textContent = settings.description;

  const countEl = document.getElementById('heroRegisteredTeamsCount');
  if (countEl) countEl.textContent = teams.length;

  const totalSlots = settings.totalSlots || 64;
  const remainingSlots = Math.max(0, totalSlots - teams.length);
  const slotsLeftEl = document.getElementById('heroSlotsLeft');
  if (slotsLeftEl) slotsLeftEl.textContent = remainingSlots;

  const statusBanner = document.getElementById('headerStatusText');
  if (statusBanner && settings.headerStatusText) statusBanner.textContent = settings.headerStatusText;

  const rounds = window.store ? window.store.getRounds() : [];
  const heroStage = document.getElementById('heroActiveStage');
  if (heroStage && rounds.length > 0) {
    const currentRound = window.store.getRoundById(settings.activeStageId || 'round1') || rounds[0];
    heroStage.textContent = currentRound.name.toUpperCase();
  }

  // Update Rules Container
  const rulesContainer = document.getElementById('publicRulesContainer');
  if (rulesContainer) {
    rulesContainer.textContent = settings.rulesText || 'No official rules posted yet.';
  }

  // Update PDF Rulebook Download button
  const pdfBtn = document.getElementById('rulesPdfDownloadBtn');
  if (pdfBtn) {
    if (settings.rulesPdfUrl && settings.rulesPdfUrl.trim()) {
      pdfBtn.href = settings.rulesPdfUrl.trim();
      pdfBtn.classList.remove('d-none');
    } else {
      pdfBtn.classList.add('d-none');
    }
  }
}

function updateScoreMatchOptions() {
  const stageSelect = document.getElementById('scoreStageSelect');
  const matchSelect = document.getElementById('scoreMatchNumSelect');
  if (!stageSelect || !matchSelect) return;

  const stageId = stageSelect.value || 'round1';
  const roundObj = window.store ? window.store.getRoundById(stageId) : null;
  const count = roundObj && roundObj.matchCount ? parseInt(roundObj.matchCount) : 6;

  const currentVal = matchSelect.value;
  let options = '';
  for (let i = 1; i <= Math.max(count, 6); i++) {
    const val = `Match ${i}`;
    options += `<option value="${val}" ${currentVal === val ? 'selected' : ''}>${val}</option>`;
  }
  matchSelect.innerHTML = options;
}

function populateDynamicRoundDropdowns() {
  const rounds = window.store ? window.store.getRounds() : [];
  const ids = ['standingsStageSelect', 'schStage', 'bcStage', 'scoreStageSelect', 'admGroupStageSelect'];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const currentVal = el.value;
      el.innerHTML = rounds.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      if (currentVal && rounds.some(r => r.id === currentVal)) el.value = currentVal;
    }
  });

  const stageSelect = document.getElementById('admActiveStageId');
  if (stageSelect) {
    const settings = window.store ? window.store.getSettings() : {};
    const currentVal = stageSelect.value || settings.activeStageId;
    stageSelect.innerHTML = rounds.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    if (currentVal && rounds.some(r => r.id === currentVal)) stageSelect.value = currentVal;
  }

  // Populate Dynamic Groups in Dropdowns
  const allGroups = window.store ? window.store.getAllGroups() : ['Group A', 'Group B', 'Group C', 'Group D'];
  const grpIds = ['schGroup', 'bcGroup', 'trTargetGroup', 'scoreGroupSelect', 'standingsGroupSelect', 'confirmedGroupFilter'];

  grpIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const currentVal = el.value;
      const includeAllOption = (id === 'standingsGroupSelect' || id === 'confirmedGroupFilter');
      let html = includeAllOption ? '<option value="all">All Groups</option>' : '';
      html += allGroups.map(g => `<option value="${g}">${g}</option>`).join('');
      el.innerHTML = html;
      if (currentVal && (currentVal === 'all' || allGroups.includes(currentVal))) el.value = currentVal;
    }
  });

  updateScoreMatchOptions();

  const admGroupStageEl = document.getElementById('admGroupStageSelect');
  if (admGroupStageEl) {
    admGroupStageEl.onchange = () => {
      const selStage = admGroupStageEl.value;
      populateTeamTransferDropdown(selStage);
      renderAdminGroupsGrid(selStage);
    };
  }

  const scoreStageEl = document.getElementById('scoreStageSelect');
  if (scoreStageEl) {
    scoreStageEl.onchange = () => {
      updateScoreMatchOptions();
      renderAdminScoreEntryTable();
    };
  }

  const scoreGroupEl = document.getElementById('scoreGroupSelect');
  if (scoreGroupEl) {
    scoreGroupEl.onchange = renderAdminScoreEntryTable;
  }

  const scoreMatchEl = document.getElementById('scoreMatchNumSelect');
  if (scoreMatchEl) {
    scoreMatchEl.onchange = renderAdminScoreEntryTable;
  }
}

function renderPublicRoundsFlow() {
  const container = document.getElementById('publicRoundsFlow');
  if (!container) return;

  const rounds = window.store ? window.store.getRounds() : [];
  const settings = window.store ? window.store.getSettings() : {};
  const activeStageId = settings.activeStageId || (rounds[0] ? rounds[0].id : 'round1');

  if (rounds.length === 0) {
    container.innerHTML = `<p class="text-muted">No tournament stages defined yet.</p>`;
    return;
  }

  container.innerHTML = rounds.map((r, idx) => {
    const isActive = r.id === activeStageId;
    const isGold = idx === rounds.length - 1;

    return `
      <div class="flow-item ${isGold ? 'gold' : isActive ? 'active' : ''}">
        <div class="flow-num">${isGold ? '🏆' : (idx + 1)}</div>
        <div class="flow-body">
          <div class="flow-header-row">
            <h4 class="flow-title">${r.name}</h4>
            <span class="flow-capacity-badge">${r.lobbyCapacity} Slots/Lobby</span>
            ${isActive ? '<span class="flow-live-badge">LIVE STAGE</span>' : ''}
          </div>
          <p class="flow-desc">${r.autoQualifyTopN > 0 ? `Top ${r.autoQualifyTopN} teams per group advance.` : 'Final showdown for Championship Title & Prize Pool!'}</p>
        </div>
      </div>
    `;
  }).join('');
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

    // Re-render UI views immediately on local device
    renderConfirmedTeamsGallery();
    renderPublicGroups();
    updateHeroMetrics();
    renderPublicStandings();

    const dashContent = document.getElementById('adminDashboardContent');
    if (dashContent && !dashContent.classList.contains('d-none')) {
      renderAdminDashboard();
    }

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

  let teams = (window.store ? window.store.getTeams() : []).filter(t => t.status === 'Approved');

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

  const groups = window.store ? window.store.getAllGroups() : ['Group A', 'Group B', 'Group C', 'Group D'];
  let activeGroup = groupsTabBar.querySelector('.stage-tab-btn.active')?.getAttribute('data-group') || groups[0] || 'Group A';

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
  if (!container) return;
  const capacity = window.store ? window.store.getActiveLobbyCapacity() : 16;
  const allTeams = (window.store ? window.store.getTeams() : []).filter(t => t.group === groupName && t.status === 'Approved');

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
  const matchSelect = document.getElementById('standingsMatchSelect');
  const searchInput = document.getElementById('standingsSearchInput');
  const tbody = document.getElementById('publicLeaderboardBody');

  if (!tbody) return;

  const stage = stageSelect ? stageSelect.value : 'round1';
  const group = groupSelect ? groupSelect.value : 'all';
  const match = matchSelect ? matchSelect.value : 'all';
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let leaderboard = window.store ? window.store.getLeaderboard(stage, group, match) : [];

  if (searchQuery) {
    leaderboard = leaderboard.filter(t => t.teamName.toLowerCase().includes(searchQuery));
  }

  if (leaderboard.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding:2rem; color:var(--text-muted);">
          No match records or teams found for the selected filter.
        </td>
      </tr>
    `;
    return;
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
  if (matchSelect) matchSelect.onchange = renderPublicStandings;
  if (searchInput) searchInput.oninput = renderPublicStandings;
}

/* ==========================================================================
   ADMIN PANEL CONTROLLER (ISOLATED DYNAMIC ROUND SECTIONS)
   ========================================================================== */
window.unlockAdminDirectly = function() {
  switchTab('admin');
  const lockScreen = document.getElementById('adminLockScreen');
  const dashboardContent = document.getElementById('adminDashboardContent');
  if (lockScreen) {
    lockScreen.classList.add('d-none');
    lockScreen.style.setProperty('display', 'none', 'important');
  }
  if (dashboardContent) {
    dashboardContent.classList.remove('d-none');
    dashboardContent.style.setProperty('display', 'block', 'important');
  }
  if (typeof showToast === 'function') showToast('Admin Control Center Unlocked!', 'success');
  if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
};

window.handleAdminLoginDirectly = async function() {
  try {
    const pinInput = document.getElementById('adminPinInput');
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!pin) {
      if (typeof showToast === 'function') showToast('Please enter Admin PIN to unlock', 'error');
      return false;
    }

    let isValid = false;
    if (window.store && typeof window.store.verifyAdminPin === 'function') {
      isValid = await window.store.verifyAdminPin(pin);
    }

    if (isValid) {
      window.unlockAdminDirectly();
    } else {
      if (typeof showToast === 'function') showToast('Access Denied: Invalid Security PIN', 'error');
    }
  } catch (err) {
    console.error('Admin login handler error:', err);
    if (typeof showToast === 'function') showToast('Login error: ' + err.message, 'error');
  }
  return false;
};

function initAdminPanel() {
  const pinInput = document.getElementById('adminPinInput');
  const loginBtn = document.getElementById('adminLoginBtn');
  const lockScreen = document.getElementById('adminLockScreen');
  const dashboardContent = document.getElementById('adminDashboardContent');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.handleAdminLoginDirectly();
    });
  }

  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.handleAdminLoginDirectly();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (lockScreen) {
        lockScreen.classList.remove('d-none');
        lockScreen.style.setProperty('display', 'block', 'important');
      }
      if (dashboardContent) {
        dashboardContent.classList.add('d-none');
        dashboardContent.style.setProperty('display', 'none', 'important');
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
      if (targetPane === 'groups-mgr') {
        const selStage = document.getElementById('admGroupStageSelect')?.value || 'round1';
        populateTeamTransferDropdown(selStage);
        renderAdminGroupsGrid(selStage);
      }
      if (targetPane === 'room-mgr') renderAdminBroadcastsTable();
      if (targetPane === 'points-mgr') renderAdminScoreEntryTable();
      if (targetPane === 'website-content-mgr') renderAdminWebsiteContentForm();
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
      const currentStage = document.getElementById('admGroupStageSelect')?.value || 'round1';
      const code = document.getElementById('trTeamSelect').value;
      const targetGroup = document.getElementById('trTargetGroup').value;
      const targetSlot = document.getElementById('trTargetSlot').value;

      if (code && targetGroup && targetSlot) {
        window.store.transferTeamGroupForStage(code, currentStage, targetGroup, targetSlot);
        showToast(`Team transferred to ${targetGroup} - Slot #${targetSlot} for stage ${currentStage.toUpperCase()}!`, 'success');
        renderAdminGroupsGrid(currentStage);
        populateTeamTransferDropdown(currentStage);
      }
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
      const currentStage = document.getElementById('admGroupStageSelect')?.value || 'round1';
      window.store.autoAllocateGroupsForStage(currentStage);
      const rndObj = window.store.getRoundById(currentStage);
      const cap = rndObj ? rndObj.lobbyCapacity : 16;
      showToast(`Automated ${cap}-slot lobby groups assigned for ${currentStage.toUpperCase()}!`, 'success');
      renderAdminGroupsGrid(currentStage);
      populateTeamTransferDropdown(currentStage);
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

  const contentForm = document.getElementById('websiteContentForm');
  if (contentForm) {
    contentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tournamentTitle = document.getElementById('admTournamentTitle')?.value.trim() || 'REX ESPORTS BGMI CHAMPIONSHIP';
      const prizePool = document.getElementById('admPrizePool').value.trim();
      const entryFee = document.getElementById('admEntryFee')?.value.trim() || 'FREE';
      const totalSlots = parseInt(document.getElementById('admTotalSlots').value) || 64;
      const activeStageId = document.getElementById('admActiveStageId')?.value || 'round1';
      const headerStatusText = document.getElementById('admHeaderStatusText').value.trim();
      const description = document.getElementById('admDescription').value.trim();
      const logoUrl = document.getElementById('admLogoUrl')?.value.trim() || '';

      await window.store.updateSettings({ tournamentTitle, prizePool, entryFee, totalSlots, activeStageId, headerStatusText, description, logoUrl });
      updateHeroMetrics();
      renderBrandLogo();
      renderPublicRoundsFlow();
      renderAdminRoundsTable();
      renderAdminWebsiteContentForm();
      showToast('Home page content, brand logo & settings updated live!', 'success');
    });
  }

  const rulesForm = document.getElementById('websiteRulesForm');
  if (rulesForm) {
    rulesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rulesText = document.getElementById('admRulesText').value.trim();
      const rulesPdfUrl = document.getElementById('admRulesPdfUrl').value.trim();

      await window.store.updateSettings({ rulesText, rulesPdfUrl });
      updateHeroMetrics();
      renderAdminWebsiteContentForm();
      showToast('Tournament rules & PDF link updated live!', 'success');
    });
  }

  const pinForm = document.getElementById('adminSecurityPinForm');
  if (pinForm) {
    pinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPin = document.getElementById('admCurrentPin').value;
      const newPin = document.getElementById('admNewPin').value;
      const confirmPin = document.getElementById('admConfirmPin').value;

      const isValid = await window.store.verifyAdminPin(currentPin);
      if (!isValid) return alert('Current Admin PIN is incorrect!');
      if (newPin !== confirmPin) return alert('New PIN and Confirm PIN do not match!');
      if (newPin.trim().length < 4) return alert('PIN must be at least 4 characters long!');

      await window.store.setAdminPin(newPin.trim());
      pinForm.reset();
      showToast('Master Admin Security PIN updated successfully!', 'success');
    });
  }
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
  const selStage = document.getElementById('admGroupStageSelect')?.value || 'round1';
  populateTeamTransferDropdown(selStage);
  renderAdminGroupsGrid(selStage);
  renderAdminBroadcastsTable();
  renderAdminScoreEntryTable();
  renderAdminWebsiteContentForm();
}

function renderBrandLogo() {
  const settings = window.store ? window.store.getSettings() : {};
  const logoUrl = settings.logoUrl || '';

  const logoIconEl = document.querySelector('#brandLogoBtn .logo-icon');
  if (logoIconEl) {
    if (logoUrl) {
      logoIconEl.innerHTML = `<img src="${logoUrl}" alt="REX Logo" style="width:100%; height:100%; object-fit:contain; border-radius:6px;">`;
    } else {
      logoIconEl.innerHTML = `<i data-lucide="trophy"></i>`;
    }
  }

  const passLogoEl = document.querySelector('.pass-logo');
  if (passLogoEl) {
    if (logoUrl) {
      passLogoEl.innerHTML = `<img src="${logoUrl}" alt="REX Logo" style="height:28px; vertical-align:middle; margin-right:6px;"> ${settings.tournamentTitle || 'REX ESPORTS'}`;
    } else {
      passLogoEl.innerText = settings.tournamentTitle || 'REX ESPORTS';
    }
  }

  if (window.lucide) lucide.createIcons();
}

function renderAdminWebsiteContentForm() {
  const settings = window.store ? window.store.getSettings() : {};
  const rounds = window.store ? window.store.getRounds() : [];
  const activeEl = document.activeElement;

  const safeSet = (id, val) => {
    const el = document.getElementById(id);
    if (el && el !== activeEl && document.activeElement !== el) {
      el.value = val;
    }
  };

  safeSet('admTournamentTitle', settings.tournamentTitle || 'REX ESPORTS BGMI CHAMPIONSHIP');
  safeSet('admPrizePool', settings.prizePool || '₹50,000');
  safeSet('admEntryFee', settings.entryFee || 'FREE');
  safeSet('admTotalSlots', settings.totalSlots || 64);

  const stageSelect = document.getElementById('admActiveStageId');
  if (stageSelect && stageSelect !== activeEl && document.activeElement !== stageSelect) {
    stageSelect.innerHTML = rounds.map(r => `<option value="${r.id}" ${r.id === settings.activeStageId ? 'selected' : ''}>${r.name}</option>`).join('');
  }

  safeSet('admHeaderStatusText', settings.headerStatusText || 'QUALIFIERS - ROUND 1 OPEN');
  safeSet('admDescription', settings.description || '');
  safeSet('admRulesText', settings.rulesText || '');
  safeSet('admRulesPdfUrl', settings.rulesPdfUrl || '');

  safeSet('admLogoUrl', settings.logoUrl || '');
  const previewBox = document.getElementById('admLogoPreviewBox');
  if (previewBox) {
    if (settings.logoUrl) {
      previewBox.innerHTML = `<img src="${settings.logoUrl}" style="width:100%; height:100%; object-fit:contain;">`;
    } else {
      previewBox.innerHTML = `<i data-lucide="trophy"></i>`;
    }
  }

  const logoFileInput = document.getElementById('admLogoFileInput');
  const logoUrlInput = document.getElementById('admLogoUrl');
  if (logoFileInput && logoUrlInput) {
    logoFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          logoUrlInput.value = dataUrl;
          if (previewBox) previewBox.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:contain;">`;
        };
        reader.readAsDataURL(file);
      }
    };
  }

  const clearLogoBtn = document.getElementById('clearLogoBtn');
  if (clearLogoBtn) {
    clearLogoBtn.onclick = () => {
      if (logoUrlInput) logoUrlInput.value = '';
      if (logoFileInput) logoFileInput.value = '';
      if (previewBox) previewBox.innerHTML = `<i data-lucide="trophy"></i>`;
      showToast('Logo reset to default icon', 'info');
    };
  }
}

function renderAdminRoundsTable() {
  const tbody = document.getElementById('adminRoundsTableBody');
  if (!tbody) return;

  const rounds = window.store.getRounds();
  const settings = window.store.getSettings();

  tbody.innerHTML = rounds.map(r => {
    const isActive = r.id === settings.activeStageId;
    return `
      <tr style="${isActive ? 'background: rgba(0, 242, 254, 0.08);' : ''}">
        <td>
          <strong>${r.name}</strong>
          ${isActive ? '<span class="badge blue ms-2" style="margin-left:6px; font-weight:700;">LIVE STAGE</span>' : ''}
        </td>
        <td><span class="badge blue">Top ${r.autoQualifyTopN} Advance</span></td>
        <td><strong>${r.lobbyCapacity} Slots</strong></td>
        <td>
          ${!isActive ? `
            <button class="btn btn-secondary btn-sm" onclick="setActiveStageFromAdmin('${r.id}')" style="margin-right:4px;">
              <i data-lucide="check-circle"></i> Set Active
            </button>
          ` : `
            <span class="badge green" style="margin-right:4px;">ACTIVE</span>
          `}
          <button class="btn btn-danger btn-sm" onclick="deleteRoundFromAdmin('${r.id}')">
            <i data-lucide="trash-2"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

window.setActiveStageFromAdmin = async function(id) {
  if (window.store) {
    await window.store.updateSettings({ activeStageId: id });
    renderAdminRoundsTable();
    updateHeroMetrics();
    renderPublicRoundsFlow();
    populateDynamicRoundDropdowns();
    renderAdminWebsiteContentForm();
    showToast(`Active Tournament Stage set to "${window.store.getRoundById(id)?.name}"!`, 'success');
  }
};

window.resetAllDataFromAdmin = async function() {
  const confirmText = prompt('⚠️ WARNING: This will permanently DELETE ALL TEAMS, MATCH SCHEDULES, BROADCASTS, and MATCH SCORES from Supabase Cloud Database to start a fresh registration!\n\nType RESET to confirm deletion:');
  if (confirmText && confirmText.trim().toUpperCase() === 'RESET') {
    if (window.store) await window.store.resetAllDataFresh();
    renderAdminDashboard();
    initConfirmedTeamsGallery();
    initQualifiedTeamsHub();
    renderPublicGroups();
    renderPublicStandings();
    updateHeroMetrics();
    showToast('All tournament data wiped clean! Ready for fresh registrations.', 'success');
  }
};

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

window.deleteRoundFromAdmin = async function(id) {
  if (confirm('Delete this tournament round?')) {
    if (window.store) await window.store.deleteRound(id);
    renderAdminRoundsTable();
    populateDynamicRoundDropdowns();
    renderPublicRoundsFlow();
    initAdminQualifyRoundSubtabs();
    showToast('Round deleted permanently!', 'info');
  }
};

function populateTeamTransferDropdown(stageId) {
  const select = document.getElementById('trTeamSelect');
  if (!select) return;

  const currentStage = stageId || document.getElementById('admGroupStageSelect')?.value || 'round1';
  const teams = window.store ? window.store.getTeamsForRound(currentStage) : [];

  if (teams.length === 0) {
    select.innerHTML = `<option value="">No teams available for ${currentStage.toUpperCase()}</option>`;
    return;
  }

  select.innerHTML = teams.map(t => {
    const sg = window.store ? window.store.getTeamStageGroupAndSlot(t, currentStage) : { group: t.group, slot: t.slot };
    return `<option value="${t.code}">${t.teamName} (${t.code} - Currently: ${sg.group} Slot #${sg.slot})</option>`;
  }).join('');
}

window.deleteTeamFromAdmin = async function(code) {
  if (confirm(`Delete team ${code}?`)) {
    if (window.store) await window.store.deleteTeam(code);
    const selStage = document.getElementById('admGroupStageSelect')?.value || 'round1';
    renderAdminTeamsTable();
    renderAdminGroupsGrid(selStage);
    renderConfirmedTeamsGallery();
    renderAdminDashboard();
    showToast('Team deleted permanently!', 'info');
  }
};

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
        <button class="btn btn-danger btn-sm" onclick="window.deleteScheduleFromAdmin('${s.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

window.deleteScheduleFromAdmin = async function(id) {
  if (confirm('Delete this match schedule?')) {
    if (window.store) await window.store.deleteSchedule(id);
    renderAdminSchedulesTable();
    showToast('Schedule deleted permanently!', 'info');
  }
};

function renderAdminGroupsGrid(stageId) {
  const container = document.getElementById('adminGroupsGrid');
  if (!container) return;

  const currentStage = stageId || document.getElementById('admGroupStageSelect')?.value || 'round1';
  const roundObj = window.store ? window.store.getRoundById(currentStage) : null;
  const capacity = roundObj ? (parseInt(roundObj.lobbyCapacity) || 16) : (window.store ? window.store.getActiveLobbyCapacity() : 16);
  const groups = window.store ? window.store.getAllGroupsForStage(currentStage) : ['Group A', 'Group B', 'Group C', 'Group D'];
  const stageTeams = window.store ? window.store.getTeamsForRound(currentStage) : [];

  container.innerHTML = groups.map(gName => {
    const groupTeams = stageTeams.filter(t => {
      const sg = window.store ? window.store.getTeamStageGroupAndSlot(t, currentStage) : { group: t.group, slot: t.slot };
      return sg.group === gName;
    });

    return `
      <div class="card mb-3">
        <div class="flex-between mb-2">
          <h4>${gName} (${groupTeams.length} / ${capacity} Slots) - <span style="color:var(--primary-blue); font-size:0.9rem; font-weight:700;">${roundObj ? roundObj.name : currentStage.toUpperCase()}</span></h4>
        </div>
        <div class="table-responsive">
          <table class="styled-table compact">
            <thead>
              <tr><th>SLOT #</th><th>TEAM CODE</th><th>TEAM NAME</th><th>CAPTAIN PHONE</th></tr>
            </thead>
            <tbody>
              ${Array.from({ length: capacity }, (_, i) => {
                const sNum = i + 1;
                const tm = groupTeams.find(t => {
                  const sg = window.store ? window.store.getTeamStageGroupAndSlot(t, currentStage) : { group: t.group, slot: t.slot };
                  return sg.slot === sNum;
                });
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
        <button class="btn btn-danger btn-sm" onclick="window.deleteBroadcastFromAdmin('${b.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

window.deleteBroadcastFromAdmin = async function(id) {
  if (confirm('Delete this Room ID & Password broadcast?')) {
    if (window.store) await window.store.deleteBroadcast(id);
    renderAdminBroadcastsTable();
    showToast('Broadcast deleted permanently!', 'info');
  }
};

function renderAdminScoreEntryTable() {
  const stage = document.getElementById('scoreStageSelect')?.value || 'round1';
  const group = document.getElementById('scoreGroupSelect')?.value || 'Group A';
  const matchNum = document.getElementById('scoreMatchNumSelect')?.value || 'Match 1';
  const tbody = document.getElementById('adminScoreEntryBody');
  if (!tbody) return;

  const groupTeams = window.store ? window.store.getTeamsForRound(stage).filter(t => t.group === group && t.status === 'Approved') : [];
  const existingMatches = window.store ? window.store.getMatchesForStageAndGroup(stage, group) : [];
  const currentMatchScoreObj = existingMatches.find(m => m.matchNum === matchNum);

  const existingScoresMap = {};
  if (currentMatchScoreObj && Array.isArray(currentMatchScoreObj.scores)) {
    currentMatchScoreObj.scores.forEach(s => {
      existingScoresMap[s.teamCode] = s;
    });
  }

  if (groupTeams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="padding:2rem; color:var(--text-muted);">
          No approved teams assigned to <strong>${group}</strong> in this stage yet.
        </td>
      </tr>
    `;
    renderAdminRecordedMatchesList();
    return;
  }

  tbody.innerHTML = groupTeams.map((t, idx) => {
    const existing = existingScoresMap[t.code];
    const defaultRank = existing ? existing.rank : (idx + 1);
    const defaultKills = existing ? existing.kills : 0;

    return `
      <tr data-code="${t.code}">
        <td><strong>Slot #${t.slot}</strong></td>
        <td><strong>${t.logo || '🦖'} ${t.teamName}</strong></td>
        <td><input type="number" class="form-input rank-input" value="${defaultRank}" min="1" max="50" style="width:90px;"></td>
        <td><input type="number" class="form-input kills-input" value="${defaultKills}" min="0" max="100" style="width:90px;"></td>
      </tr>
    `;
  }).join('');

  renderAdminRecordedMatchesList();
}

function renderAdminRecordedMatchesList() {
  const stage = document.getElementById('scoreStageSelect')?.value || 'round1';
  const group = document.getElementById('scoreGroupSelect')?.value || 'Group A';
  const container = document.getElementById('adminRecordedMatchesList');
  if (!container) return;

  const matches = window.store ? window.store.getMatchesForStageAndGroup(stage, group) : [];

  if (matches.length === 0) {
    container.innerHTML = `<p class="text-muted" style="font-size:0.9rem;">No matches recorded yet for ${group} in this stage. Enter scores above and click Save!</p>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="styled-table">
        <thead>
          <tr>
            <th>MATCH #</th>
            <th>TEAMS RECORDED</th>
            <th>WINNER (WWCD)</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${matches.map(m => {
            const winnerScore = m.scores.find(s => parseInt(s.rank) === 1);
            return `
              <tr>
                <td><strong style="color:var(--primary-blue);">${m.matchNum}</strong></td>
                <td>${m.scores.length} Teams</td>
                <td><strong style="color:var(--accent-gold);">${winnerScore ? `🏆 ${winnerScore.teamName}` : 'N/A'}</strong></td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="window.editRecordedMatch('${m.matchNum}')" style="margin-right:6px;">
                    <i data-lucide="edit-2"></i> Edit
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="window.deleteRecordedMatch('${m.matchNum}')">
                    <i data-lucide="trash-2"></i> Delete
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

window.editRecordedMatch = function(matchNum) {
  const matchSelect = document.getElementById('scoreMatchNumSelect');
  if (matchSelect) {
    matchSelect.value = matchNum;
    renderAdminScoreEntryTable();
    showToast(`Loaded ${matchNum} for editing above.`, 'info');
  }
};

window.deleteRecordedMatch = async function(matchNum) {
  const stage = document.getElementById('scoreStageSelect')?.value;
  const group = document.getElementById('scoreGroupSelect')?.value;
  if (confirm(`Are you sure you want to delete ${matchNum} scores for ${group}?`)) {
    if (window.store) await window.store.deleteMatchScore(stage, group, matchNum);
    showToast(`${matchNum} scores deleted!`, 'info');
    renderAdminScoreEntryTable();
    renderPublicStandings();
  }
};

function saveMatchScoresFromTable() {
  const stage = document.getElementById('scoreStageSelect').value;
  const group = document.getElementById('scoreGroupSelect').value;
  const matchNum = document.getElementById('scoreMatchNumSelect').value;
  const rows = document.querySelectorAll('#adminScoreEntryBody tr');

  const scores = [];
  rows.forEach(row => {
    const code = row.getAttribute('data-code');
    const team = window.store.getTeamByCodeOrPhone(code);
    const rankInput = row.querySelector('.rank-input');
    const killsInput = row.querySelector('.kills-input');

    if (team && rankInput && killsInput) {
      const rank = parseInt(rankInput.value) || 20;
      const kills = parseInt(killsInput.value) || 0;
      scores.push({ teamCode: code, teamName: team.teamName, rank, kills });
    }
  });

  window.store.saveMatchScore({ stage, group, matchNum, scores });
  showToast(`Match scores saved for ${group} (${matchNum})!`, 'success');
  renderAdminRecordedMatchesList();
  renderPublicStandings();
}
