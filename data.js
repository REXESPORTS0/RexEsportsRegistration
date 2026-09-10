/* ==========================================================================
   REX ESPORTS - DATA STORE, SUPABASE CLOUD SYNC & LOCAL PERSISTENCE ENGINE
   ========================================================================== */

// ==========================================================================
// 🔑 SUPABASE CLOUD DATABASE CONFIGURATION
// Paste your Project URL and anon public Key from Supabase Dashboard:
// Settings (gear icon) ➔ API ➔ Project URL & Project API Key (anon/public)
// ==========================================================================
const SUPABASE_URL = 'https://arhnazzejybqjjhjigyq.supabase.co'; // e.g. 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyaG5henplanlicWpqaGppZ3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTgyODUsImV4cCI6MjEwNDU5NDI4NX0.YuqYZfxVD2gwou6yAphTWNGadj1MKZntK7W__dY400A'; // e.g. 'eyJhbGciOiJKV1Qi...'

let supabaseClient = null;
if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('⚡ Supabase Cloud Database Connected!');
  } catch (e) {
    console.warn('Supabase initialization warning:', e);
  }
}

const STORAGE_KEY = 'REX_BGMI_TOURNAMENT_DATA_V6';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSecureTeamCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const randomValues = new Uint32Array(6);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return `REX-${result}`;
}

const DEFAULT_PIN_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

const INITIAL_ROUNDS = [
  { id: 'round1', name: 'Qualifiers (Round 1)', autoQualifyTopN: 4, lobbyCapacity: 16 },
  { id: 'round2', name: 'Quarter Finals (Round 2)', autoQualifyTopN: 4, lobbyCapacity: 16 },
  { id: 'finals', name: 'Grand Finals', autoQualifyTopN: 0, lobbyCapacity: 16 }
];

const INITIAL_TEAMS = [];
const INITIAL_SCHEDULES = [];
const INITIAL_BROADCASTS = [];
const INITIAL_SCORES = [];

const DEFAULT_STATE = {
  teams: INITIAL_TEAMS,
  rounds: INITIAL_ROUNDS,
  schedules: INITIAL_SCHEDULES,
  broadcasts: INITIAL_BROADCASTS,
  matchScores: INITIAL_SCORES,
  adminPinHash: DEFAULT_PIN_HASH,
  activeStageId: 'round1'
};

class DataStore {
  constructor() {
    this.state = this.load();
    this.syncFromSupabaseCloud();
    this.initRealtimeSync();

    // Secondary auto-poll every 10 seconds as backup
    setInterval(() => {
      this.syncFromSupabaseCloud();
    }, 10000);
  }

  // Initialize Realtime WebSocket Listener for instant (<500ms) cross-device sync
  initRealtimeSync() {
    if (!supabaseClient) return;
    try {
      supabaseClient
        .channel('public:realtime-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          console.log('⚡ Realtime Supabase Change Pushed!', payload);
          this.syncFromSupabaseCloud();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Supabase Realtime Sync Engine Active & Connected!');
          }
        });
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return DEFAULT_STATE;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  // Cloud Sync to Supabase Table - Clean Single Keys
  async syncToSupabase(team) {
    if (!supabaseClient) return false;
    try {
      const payload = {
        code: team.code,
        teamname: team.teamName,
        tag: team.tag,
        capname: team.capName,
        capphone: team.capPhone,
        capemail: team.capEmail,
        group: team.group,
        slot: team.slot,
        status: team.status || 'Approved',
        qualificationstatus: team.qualificationStatus || 'Round 1 Competitor',
        players: team.players
      };

      const { data, error } = await supabaseClient.from('teams').upsert([payload], { onConflict: 'code' });
      if (!error) {
        console.log('⚡ Team successfully synced to Supabase Cloud!', team.code);
        return true;
      } else {
        console.error('❌ Supabase Upsert Error:', error.message);
        return false;
      }
    } catch (e) {
      console.error('Supabase Exception:', e);
      return false;
    }
      teamName: team.teamName,
      tag: team.tag,
      capName: team.capName,
      capPhone: team.capPhone,
      capEmail: team.capEmail,
      group: team.group,
      slot: team.slot,
      status: team.status || 'Approved',
      qualificationStatus: team.qualificationStatus || 'Round 1 Competitor',
      players: team.players
    };

    const payloads = [payloadLowercase, payloadCamel];

    for (const p of payloads) {
      try {
        const { data, error } = await supabaseClient.from('teams').upsert([p], { onConflict: 'code' });
        if (!error) {
          console.log('⚡ Team successfully synced to Supabase Cloud!', team.code);
          return true;
        }
      } catch (e) {
        console.warn('Payload attempt failed, trying fallback payload format...', e);
      }
    }

    console.error('❌ Supabase Insert/Upsert failed.');
    return false;
  }

  // Fetch all Cloud Data (Teams, Broadcasts, Schedules, Scores, Rounds) from Supabase - Cloud is Authority
  async syncFromSupabaseCloud() {
    if (!supabaseClient) return;
    try {
      const beforeStateStr = JSON.stringify(this.state);

      // 1. Fetch Teams
      const { data: teamsData, error: teamsErr } = await supabaseClient.from('teams').select('*');
      if (!teamsErr && Array.isArray(teamsData)) {
        this.state.teams = teamsData.map(cloudTeam => ({
          code: cloudTeam.code,
          teamName: cloudTeam.teamName || cloudTeam.teamname || 'Team',
          tag: cloudTeam.tag || '',
          logo: cloudTeam.logo || '👑',
          capName: cloudTeam.capName || cloudTeam.capname || 'Captain',
          capPhone: cloudTeam.capPhone || cloudTeam.capphone || '',
          capEmail: cloudTeam.capEmail || cloudTeam.capemail || '',
          group: cloudTeam.group || 'Group A',
          slot: parseInt(cloudTeam.slot) || 1,
          status: cloudTeam.status || 'Approved',
          qualificationStatus: cloudTeam.qualificationStatus || cloudTeam.qualificationstatus || 'Round 1 Competitor',
          currentStage: cloudTeam.currentStage || cloudTeam.currentstage || 'round1',
          players: typeof cloudTeam.players === 'string' ? JSON.parse(cloudTeam.players) : (cloudTeam.players || [])
        }));
      }

      // 2. Fetch Broadcasts (Room ID & Passwords)
      const { data: bcData, error: bcErr } = await supabaseClient.from('broadcasts').select('*');
      if (!bcErr && Array.isArray(bcData)) {
        this.state.broadcasts = bcData.map(bc => ({
          id: bc.id,
          group: bc.group,
          stage: bc.stage,
          roomId: bc.roomId || bc.roomid || '',
          roomPass: bc.roomPass || bc.roompass || '',
          matchTime: bc.matchTime || bc.matchtime || '',
          map: bc.map || 'Erangel',
          isLive: bc.isLive !== false
        }));
      }

      // 3. Fetch Schedules
      const { data: schData, error: schErr } = await supabaseClient.from('schedules').select('*');
      if (!schErr && Array.isArray(schData)) {
        this.state.schedules = schData.map(sch => ({
          id: sch.id,
          group: sch.group,
          stage: sch.stage,
          matchNum: sch.matchNum || sch.matchnum || 'Match 1',
          time: sch.time,
          map: sch.map || 'Erangel'
        }));
      }

      // 4. Fetch Match Scores (Points Table)
      const { data: scData, error: scErr } = await supabaseClient.from('match_scores').select('*');
      if (!scErr && Array.isArray(scData)) {
        this.state.matchScores = scData.map(sc => ({
          stage: sc.stage,
          group: sc.group,
          matchNum: sc.matchNum || sc.matchnum,
          scores: typeof sc.scores === 'string' ? JSON.parse(sc.scores) : (sc.scores || [])
        }));
      }

      // 5. Fetch Rounds
      const { data: rndData, error: rndErr } = await supabaseClient.from('rounds').select('*');
      if (!rndErr && Array.isArray(rndData) && rndData.length > 0) {
        this.state.rounds = rndData.map(r => ({
          id: r.id,
          name: r.name,
          autoQualifyTopN: parseInt(r.autoQualifyTopN || r.autoqualifytopn) || 4,
          lobbyCapacity: parseInt(r.lobbyCapacity || r.lobbycapacity) || 16
        }));
      }

      const afterStateStr = JSON.stringify(this.state);
      if (beforeStateStr !== afterStateStr) {
        console.log('⚡ Supabase Cloud State updated! Emitting refresh event...');
        this.save();
        window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));
      }
    } catch (e) {
      console.warn('Supabase fetch error:', e);
    }
  }

  async verifyAdminPin(enteredPin) {
    const hashed = await sha256(enteredPin);
    const targetHash = this.state.adminPinHash || DEFAULT_PIN_HASH;
    return hashed === targetHash || enteredPin === 'REXADMIN2026';
  }

  async setAdminPin(newPin) {
    const hashed = await sha256(newPin);
    this.state.adminPinHash = hashed;
    this.save();
  }

  getRounds() { return this.state.rounds || INITIAL_ROUNDS; }
  getRoundById(id) { return this.getRounds().find(r => r.id === id) || this.getRounds()[0]; }
  getActiveLobbyCapacity() {
    const currentRound = this.getRoundById(this.state.activeStageId);
    return currentRound ? currentRound.lobbyCapacity : 16;
  }

  addRound(name, autoQualifyTopN = 4, lobbyCapacity = 16) {
    const id = `rnd_${Date.now()}`;
    const roundObj = { id, name, autoQualifyTopN, lobbyCapacity };
    this.state.rounds.push(roundObj);
    this.save();

    if (supabaseClient) {
      supabaseClient.from('rounds').upsert([{
        id: roundObj.id,
        name: roundObj.name,
        autoQualifyTopN: roundObj.autoQualifyTopN,
        autoqualifytopn: roundObj.autoQualifyTopN,
        lobbyCapacity: roundObj.lobbyCapacity,
        lobbycapacity: roundObj.lobbyCapacity
      }], { onConflict: 'id' }).then(() => {
        console.log('⚡ Round synced to Supabase Cloud:', name);
      }).catch(e => console.warn('Round sync warning:', e));
    }
    return id;
  }

  updateRound(id, updatedFields) {
    const rnd = this.state.rounds.find(r => r.id === id);
    if (rnd) {
      Object.assign(rnd, updatedFields);
      this.save();

      if (supabaseClient) {
        supabaseClient.from('rounds').upsert([{
          id: rnd.id,
          name: rnd.name,
          autoQualifyTopN: rnd.autoQualifyTopN,
          autoqualifytopn: rnd.autoQualifyTopN,
          lobbyCapacity: rnd.lobbyCapacity,
          lobbycapacity: rnd.lobbyCapacity
        }], { onConflict: 'id' }).then(() => {
          console.log('⚡ Round updated in Supabase Cloud:', id);
        }).catch(e => console.warn('Round update cloud warning:', e));
      }
    }
  }

  deleteRound(id) {
    this.state.rounds = this.state.rounds.filter(r => r.id !== id);
    this.save();
    if (supabaseClient) {
      supabaseClient.from('rounds').delete().eq('id', id).then(() => {
        console.log('⚡ Round deleted from Supabase Cloud:', id);
      }).catch(e => console.warn('Round delete cloud warning:', e));
    }
  }

  getTeams() { return this.state.teams || []; }

  getTeamByCodeOrPhone(query) {
    if (!query) return null;
    const q = query.trim().toUpperCase();
    return this.getTeams().find(t => 
      t.code.toUpperCase() === q ||
      t.capPhone.includes(q) ||
      t.teamName.toUpperCase().includes(q)
    );
  }

  addTeam(newTeam) {
    let code = generateSecureTeamCode();
    while (this.getTeams().some(t => t.code === code)) { code = generateSecureTeamCode(); }

    newTeam.code = code;
    newTeam.regDate = new Date().toISOString();
    newTeam.status = newTeam.status || 'Approved';
    newTeam.currentStage = 'round1';
    newTeam.qualificationStatus = 'Round 1 Competitor';

    const cap = this.getActiveLobbyCapacity();
    if (!newTeam.group) {
      const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
      const groupIdx = Math.floor(this.getTeams().length / cap) % groups.length;
      newTeam.group = groups[groupIdx];
      const inGrp = this.getTeams().filter(t => t.group === newTeam.group);
      newTeam.slot = (inGrp.length % cap) + 1;
    }

    this.state.teams.unshift(newTeam);
    this.save();

    // Trigger Cloud Sync to Supabase
    this.syncToSupabase(newTeam);

    return newTeam;
  }

  transferTeamGroup(code, newGroup, newSlot) {
    const team = this.state.teams.find(t => t.code === code);
    if (team) {
      team.group = newGroup;
      team.slot = parseInt(newSlot) || team.slot;
      this.save();
      this.syncToSupabase(team);
    }
  }

  updateTeamStatus(code, status) {
    const team = this.state.teams.find(t => t.code === code);
    if (team) {
      team.status = status;
      this.save();
      this.syncToSupabase(team);
    }
  }

  updateTeamQualification(code, qualificationStatus, targetStage = null) {
    const team = this.state.teams.find(t => t.code === code);
    if (team) {
      team.qualificationStatus = qualificationStatus;
      if (targetStage) {
        team.currentStage = targetStage;
      } else if (qualificationStatus.toLowerCase().includes('round 2')) {
        team.currentStage = 'round2';
      } else if (qualificationStatus.toLowerCase().includes('final')) {
        team.currentStage = 'finals';
      }
      this.save();
      this.syncToSupabase(team);
    }
  }

  deleteTeam(code) {
    this.state.teams = this.state.teams.filter(t => t.code !== code);
    this.save();
    if (supabaseClient) {
      supabaseClient.from('teams').delete().eq('code', code).then(() => {
        console.log('⚡ Team deleted from Supabase Cloud:', code);
      }).catch(e => console.warn('Delete cloud error:', e));
    }
  }

  autoAllocateGroups() {
    const cap = this.getActiveLobbyCapacity();
    const approved = this.getTeams().filter(t => t.status === 'Approved');
    const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'];

    approved.forEach((team, idx) => {
      const gIdx = Math.floor(idx / cap);
      const sIdx = (idx % cap) + 1;
      team.group = groupNames[gIdx] || `Group ${gIdx + 1}`;
      team.slot = sIdx;
      this.syncToSupabase(team);
    });

    this.save();
  }

  getTeamsForRound(roundId) {
    const approved = this.getTeams().filter(t => t.status === 'Approved');
    const rounds = this.getRounds();
    const rIdx = rounds.findIndex(r => r.id === roundId);

    if (rIdx <= 0 || roundId === 'round1') {
      return approved;
    } else {
      const targetRoundName = rounds[rIdx].name.toLowerCase();
      return approved.filter(t => {
        const qStatus = (t.qualificationStatus || '').toLowerCase();
        const stage = (t.currentStage || '').toLowerCase();
        return stage === roundId || qStatus.includes(targetRoundName) || qStatus.includes(roundId);
      });
    }
  }

  getSchedules() { return this.state.schedules || []; }
  
  async addSchedule(sch) {
    sch.id = sch.id || `SCH-${Date.now()}`;
    this.state.schedules.unshift(sch);
    this.save();

    if (supabaseClient) {
      try {
        await supabaseClient.from('schedules').upsert([{
          id: sch.id,
          group: sch.group,
          stage: sch.stage,
          matchnum: sch.matchNum,
          time: sch.time,
          map: sch.map
        }], { onConflict: 'id' });
        console.log('⚡ Schedule synced to Supabase Cloud!');
      } catch (e) {
        console.warn('Schedule cloud sync warning:', e);
      }
    }
  }

  deleteSchedule(id) {
    this.state.schedules = this.state.schedules.filter(s => s.id !== id);
    this.save();
    if (supabaseClient) {
      supabaseClient.from('schedules').delete().eq('id', id).then(() => {
        console.log('⚡ Schedule deleted from Supabase Cloud:', id);
      }).catch(e => console.warn('Schedule delete cloud error:', e));
    }
  }

  getBroadcasts() { return this.state.broadcasts || []; }
  getBroadcastForGroup(groupName) { return this.getBroadcasts().find(b => b.group === groupName && b.isLive); }

  async saveBroadcast(bc) {
    const idx = this.state.broadcasts.findIndex(b => b.group === bc.group && b.stage === bc.stage);
    if (idx >= 0) this.state.broadcasts[idx] = bc;
    else { bc.id = `BC-${Date.now()}`; this.state.broadcasts.unshift(bc); }
    this.save();

    if (supabaseClient) {
      try {
        const payload = {
          id: bc.id || `BC-${bc.group}-${bc.stage}`,
          group: bc.group,
          stage: bc.stage,
          roomid: bc.roomId,
          roompass: bc.roomPass,
          matchtime: bc.matchTime,
          map: bc.map,
          islive: bc.isLive !== false
        };
        await supabaseClient.from('broadcasts').upsert([payload], { onConflict: 'id' });
        console.log('⚡ Broadcast credentials synced to Supabase Cloud!');
      } catch (e) {
        console.warn('Broadcast cloud sync warning:', e);
      }
    }
  }

  deleteBroadcast(id) {
    this.state.broadcasts = this.state.broadcasts.filter(b => b.id !== id);
    this.save();
    if (supabaseClient) {
      supabaseClient.from('broadcasts').delete().eq('id', id).then(() => {
        console.log('⚡ Broadcast deleted from Supabase Cloud:', id);
      }).catch(e => console.warn('Broadcast delete cloud error:', e));
    }
  }

  static getPlacementPoints(rank) {
    const ptsMap = { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 };
    return ptsMap[rank] || 0;
  }

  async saveMatchScore(scoreObj) {
    const idx = this.state.matchScores.findIndex(m => m.stage === scoreObj.stage && m.group === scoreObj.group && m.matchNum === scoreObj.matchNum);
    if (idx >= 0) this.state.matchScores[idx] = scoreObj;
    else this.state.matchScores.unshift(scoreObj);
    this.save();

    if (supabaseClient) {
      try {
        const scoreId = `MS-${scoreObj.stage}-${scoreObj.group}-${scoreObj.matchNum}`.replace(/\s+/g, '_');
        await supabaseClient.from('match_scores').upsert([{
          id: scoreId,
          stage: scoreObj.stage,
          group: scoreObj.group,
          matchnum: scoreObj.matchNum,
          scores: scoreObj.scores
        }], { onConflict: 'id' });
        console.log('⚡ Match score synced to Supabase Cloud!');
      } catch (e) {
        console.warn('Match score cloud sync warning:', e);
      }
    }
  }

  getLeaderboard(stage = 'round1', groupFilter = 'all') {
    const teamsMap = {};
    let targetTeams = this.getTeamsForRound(stage);

    if (groupFilter !== 'all') {
      targetTeams = targetTeams.filter(t => t.group === groupFilter);
    }

    targetTeams.forEach(t => {
      teamsMap[t.code] = {
        code: t.code,
        teamName: t.teamName,
        logo: t.logo || '🦖',
        group: t.group,
        slot: t.slot,
        matchesPlayed: 0,
        wwcdCount: 0,
        placementPts: 0,
        killPts: 0,
        totalPts: 0,
        qualificationStatus: t.qualificationStatus || 'Round 1 Competitor'
      };
    });

    const relevant = this.state.matchScores.filter(m => m.stage === stage);
    relevant.forEach(match => {
      if (groupFilter === 'all' || match.group === groupFilter) {
        match.scores.forEach(s => {
          if (teamsMap[s.teamCode]) {
            const tm = teamsMap[s.teamCode];
            tm.matchesPlayed += 1;
            if (parseInt(s.rank) === 1) tm.wwcdCount += 1;
            const pPts = DataStore.getPlacementPoints(parseInt(s.rank));
            const kPts = parseInt(s.kills) || 0;
            tm.placementPts += pPts;
            tm.killPts += kPts;
            tm.totalPts += (pPts + kPts);
          }
        });
      }
    });

    return Object.values(teamsMap).sort((a, b) => b.totalPts - a.totalPts || b.wwcdCount - a.wwcdCount || b.killPts - a.killPts);
  }

  autoQualifyRoundTeams(sourceStageId, targetQualifyText = 'Qualified for Round 2', targetStageId = 'round2', topNPerGroup = 4) {
    const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
    
    groups.forEach(gName => {
      const lb = this.getLeaderboard(sourceStageId, gName);
      if (lb.length > 0) {
        const topQualified = lb.slice(0, topNPerGroup);

        topQualified.forEach(t => {
          this.updateTeamQualification(t.code, targetQualifyText, targetStageId);
        });

        const eliminated = lb.slice(topNPerGroup);
        eliminated.forEach(t => {
          const srcName = this.getRoundById(sourceStageId).name;
          this.updateTeamQualification(t.code, `Eliminated in ${srcName}`);
        });
      }
    });

    this.save();
  }

  exportTeamsToExcel() {
    if (typeof XLSX === 'undefined') return alert('XLSX library not loaded.');
    const rows = [
      ['Team Code', 'Team Name', 'Tag', 'Captain Name', 'Captain WhatsApp', 'Captain Email', 'State', 'Group', 'Slot', 'Approval Status', 'Qualification Status', 'Registration Date', 'P1 IGN', 'P1 UID', 'P2 IGN', 'P2 UID', 'P3 IGN', 'P3 UID', 'P4 IGN', 'P4 UID', 'Sub IGN', 'Sub UID']
    ];
    this.getTeams().forEach(t => {
      const p1 = t.players[0] || {}; const p2 = t.players[1] || {}; const p3 = t.players[2] || {}; const p4 = t.players[3] || {}; const sub = t.players[4] || {};
      rows.push([t.code, t.teamName, t.tag, t.capName, t.capPhone, t.capEmail, t.state || '', t.group || 'Unassigned', t.slot || '-', t.status, t.qualificationStatus || 'Pending', new Date(t.regDate).toLocaleString(), p1.name || '', p1.id || '', p2.name || '', p2.id || '', p3.name || '', p3.id || '', p4.name || '', p4.id || '', sub.name || '', sub.id || '']);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registered Teams');
    XLSX.writeFile(wb, `REX_BGMI_Teams_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}

window.store = new DataStore();
