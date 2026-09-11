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

const STORAGE_KEY = 'REX_BGMI_TOURNAMENT_DATA_V7';

function safeJsonParse(str, fallback = null) {
  if (typeof str !== 'string') return str || fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

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

const DEFAULT_SETTINGS = {
  tournamentTitle: 'REX ESPORTS BGMI CHAMPIONSHIP',
  prizePool: '₹50,000',
  entryFee: 'FREE',
  description: 'Register your team, track group slot allocations, check match schedules, view live point tables, and see your qualification status for upcoming rounds!',
  totalSlots: 64,
  headerStatusText: 'QUALIFIERS - ROUND 1 OPEN',
  rulesText: '1. All players must use registered IGN and character UID.\n2. Emulators and 3rd party hacks are strictly prohibited.\n3. Teams must join the BGMI custom room lobby at least 10 minutes prior to match time.\n4. Disconnections will not trigger a match restart unless specified by admins.',
  rulesPdfUrl: '',
  logoUrl: '',
  adminPinHash: DEFAULT_PIN_HASH,
  activeStageId: 'round1'
};

const DEFAULT_STATE = {
  teams: INITIAL_TEAMS,
  rounds: INITIAL_ROUNDS,
  schedules: INITIAL_SCHEDULES,
  broadcasts: INITIAL_BROADCASTS,
  matchScores: INITIAL_SCORES,
  deletedTeamCodes: [],
  deletedScheduleIds: [],
  deletedBroadcastIds: [],
  deletedRoundIds: [],
  settings: DEFAULT_SETTINGS,
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
      const keysToTry = [
        STORAGE_KEY,
        'REX_BGMI_TOURNAMENT_DATA_V7',
        'REX_BGMI_TOURNAMENT_DATA_V6',
        'REX_BGMI_TOURNAMENT_DATA_V5',
        'REX_BGMI_TOURNAMENT_DATA_V4',
        'REX_BGMI_TOURNAMENT_DATA_V3',
        'REX_BGMI_TOURNAMENT_DATA_V2',
        'REX_BGMI_TOURNAMENT_DATA_V1',
        'REX_BGMI_TOURNAMENT_DATA'
      ];

      let bestParsed = null;
      for (const key of keysToTry) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              if (!bestParsed) {
                bestParsed = parsed;
              } else {
                if ((!bestParsed.teams || bestParsed.teams.length === 0) && parsed.teams && parsed.teams.length > 0) {
                  bestParsed = parsed;
                }
              }
            }
          } catch(err) {}
        }
      }

      if (bestParsed) {
        bestParsed.settings = Object.assign({}, DEFAULT_SETTINGS, bestParsed.settings || {});
        bestParsed.teams = bestParsed.teams || [];
        bestParsed.rounds = bestParsed.rounds || INITIAL_ROUNDS;
        bestParsed.schedules = bestParsed.schedules || [];
        bestParsed.broadcasts = bestParsed.broadcasts || [];
        bestParsed.matchScores = bestParsed.matchScores || [];
        bestParsed.deletedTeamCodes = bestParsed.deletedTeamCodes || [];
        bestParsed.deletedScheduleIds = bestParsed.deletedScheduleIds || [];
        bestParsed.deletedBroadcastIds = bestParsed.deletedBroadcastIds || [];
        bestParsed.deletedRoundIds = bestParsed.deletedRoundIds || [];

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bestParsed)); } catch(e){}
        return bestParsed;
      }
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

  // Cloud Sync to Supabase Table - Multi-Strategy Bulletproof Sync
  async syncToSupabase(team) {
    if (!supabaseClient) return false;
    try {
      const payloadLower = {
        code: team.code,
        teamname: team.teamName,
        tag: team.tag || '',
        capname: team.capName,
        capphone: team.capPhone,
        capemail: team.capEmail,
        group: team.group || 'Group A',
        slot: team.slot || 1,
        status: team.status || 'Approved',
        qualificationstatus: team.qualificationStatus || 'Round 1 Competitor',
        currentstage: team.currentStage || 'round1',
        qualifiedrounds: JSON.stringify(team.qualifiedRounds || ['round1']),
        stagestatuses: JSON.stringify(team.stageStatuses || {}),
        stagegroups: JSON.stringify(team.stageGroups || {}),
        players: typeof team.players === 'object' ? JSON.stringify(team.players) : team.players
      };

      const payloadCamel = {
        code: team.code,
        teamName: team.teamName,
        tag: team.tag || '',
        capName: team.capName,
        capPhone: team.capPhone,
        capEmail: team.capEmail,
        group: team.group || 'Group A',
        slot: team.slot || 1,
        status: team.status || 'Approved',
        qualificationStatus: team.qualificationStatus || 'Round 1 Competitor',
        currentStage: team.currentStage || 'round1',
        qualifiedRounds: JSON.stringify(team.qualifiedRounds || ['round1']),
        stageStatuses: JSON.stringify(team.stageStatuses || {}),
        stageGroups: JSON.stringify(team.stageGroups || {}),
        players: typeof team.players === 'object' ? JSON.stringify(team.players) : team.players
      };

      const fallbackLower = {
        code: team.code, teamname: team.teamName, tag: team.tag || '',
        capname: team.capName, capphone: team.capPhone, capemail: team.capEmail,
        group: team.group || 'Group A', slot: team.slot || 1,
        status: team.status || 'Approved', qualificationstatus: team.qualificationStatus || 'Round 1 Competitor',
        players: typeof team.players === 'object' ? JSON.stringify(team.players) : team.players
      };

      const fallbackCamel = {
        code: team.code, teamName: team.teamName, tag: team.tag || '',
        capName: team.capName, capPhone: team.capPhone, capEmail: team.capEmail,
        group: team.group || 'Group A', slot: team.slot || 1,
        status: team.status || 'Approved', qualificationStatus: team.qualificationStatus || 'Round 1 Competitor',
        players: typeof team.players === 'object' ? JSON.stringify(team.players) : team.players
      };

      let res = await supabaseClient.from('teams').upsert([payloadLower], { onConflict: 'code' });
      if (!res.error) return true;

      res = await supabaseClient.from('teams').upsert([payloadCamel], { onConflict: 'code' });
      if (!res.error) return true;

      res = await supabaseClient.from('teams').upsert([fallbackLower], { onConflict: 'code' });
      if (!res.error) return true;

      res = await supabaseClient.from('teams').upsert([fallbackCamel], { onConflict: 'code' });
      if (!res.error) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  // Fetch all Cloud Data (Teams, Broadcasts, Schedules, Scores, Rounds) from Supabase - Cloud is Authority
  async syncFromSupabaseCloud() {
    if (!supabaseClient) return;
    try {
      const beforeStateStr = JSON.stringify(this.state);

      // 1. Fetch Teams
      const { data: teamsData, error: teamsErr } = await supabaseClient.from('teams').select('*');
      if (!teamsErr && Array.isArray(teamsData)) {
        const deletedCodes = (this.state.deletedTeamCodes || []).map(c => c.trim().toUpperCase());
        const validCloudTeams = teamsData.filter(t => {
          if (!t.code) return false;
          const codeUpper = t.code.trim().toUpperCase();
          const statusLower = (t.status || '').toString().toLowerCase();
          const qualLower = (t.qualificationStatus || t.qualificationstatus || '').toString().toLowerCase();

          if (statusLower === 'deleted' || qualLower === 'deleted') return false;
          if (deletedCodes.includes(codeUpper)) return false;
          return true;
        });

        if (validCloudTeams.length > 0) {
          const mergedTeams = validCloudTeams.map(cloudTeam => {
            const existingLocal = (this.state.teams || []).find(lt => lt && lt.code && lt.code.toUpperCase() === cloudTeam.code.toUpperCase());
            const cloudGroup = cloudTeam.group || cloudTeam.groupname || existingLocal?.group || 'Group A';
            const cloudSlot = parseInt(cloudTeam.slot || existingLocal?.slot) || 1;

            let parsedStageGroups = null;
            if (cloudTeam.stageGroups || cloudTeam.stagegroups) {
              try {
                const raw = cloudTeam.stageGroups || cloudTeam.stagegroups;
                parsedStageGroups = typeof raw === 'string' ? JSON.parse(raw) : raw;
              } catch(e) {}
            }

            const curStg = cloudTeam.currentStage || cloudTeam.currentstage || 'round1';
            if (!parsedStageGroups || typeof parsedStageGroups !== 'object' || Object.keys(parsedStageGroups).length === 0) {
              parsedStageGroups = Object.assign({}, existingLocal?.stageGroups || {});
            }
            parsedStageGroups['round1'] = parsedStageGroups['round1'] || { group: cloudGroup, slot: cloudSlot };
            parsedStageGroups[curStg] = { group: cloudGroup, slot: cloudSlot };

            let parsedQualifiedRounds = null;
            if (cloudTeam.qualifiedRounds || cloudTeam.qualifiedrounds) {
              try {
                const raw = cloudTeam.qualifiedRounds || cloudTeam.qualifiedrounds;
                parsedQualifiedRounds = typeof raw === 'string' ? JSON.parse(raw) : raw;
              } catch(e) {}
            }

            const qualStatusStr = (cloudTeam.qualificationStatus || cloudTeam.qualificationstatus || existingLocal?.qualificationStatus || '').toString();

            // Dynamic cross-device reconstruction of qualifiedRounds from qualificationstatus string
            if (!parsedQualifiedRounds || !Array.isArray(parsedQualifiedRounds) || parsedQualifiedRounds.length === 0) {
              const rounds = this.getRounds();
              const matchedRnd = rounds.find(r => qualStatusStr.toLowerCase().includes(r.name.toLowerCase()) || qualStatusStr.toLowerCase().includes(r.id.toLowerCase()));
              if (matchedRnd) {
                const targetIdx = rounds.findIndex(r => r.id === matchedRnd.id);
                if (targetIdx >= 0) {
                  parsedQualifiedRounds = rounds.slice(0, targetIdx + 1).map(r => r.id);
                }
              } else if (qualStatusStr.toLowerCase().includes('round 2')) {
                parsedQualifiedRounds = ['round1', 'round2'];
              } else if (qualStatusStr.toLowerCase().includes('final')) {
                parsedQualifiedRounds = rounds.map(r => r.id);
              }
            }

            if (!parsedQualifiedRounds || !Array.isArray(parsedQualifiedRounds) || parsedQualifiedRounds.length === 0) {
              parsedQualifiedRounds = existingLocal?.qualifiedRounds || ['round1'];
            }

            let parsedStageStatuses = null;
            if (cloudTeam.stageStatuses || cloudTeam.stagestatuses) {
              try {
                const raw = cloudTeam.stageStatuses || cloudTeam.stagestatuses;
                parsedStageStatuses = typeof raw === 'string' ? JSON.parse(raw) : raw;
              } catch(e) {}
            }
            if (!parsedStageStatuses || typeof parsedStageStatuses !== 'object') {
              parsedStageStatuses = Object.assign({}, existingLocal?.stageStatuses || {});
            }
            if (qualStatusStr) {
              parsedStageStatuses[curStg] = qualStatusStr;
            }

            return {
              code: cloudTeam.code,
              teamName: cloudTeam.teamName || cloudTeam.teamname || existingLocal?.teamName || 'Team',
              tag: cloudTeam.tag || existingLocal?.tag || '',
              logo: cloudTeam.logo || cloudTeam.avatar || existingLocal?.logo || '🦖',
              capName: cloudTeam.capName || cloudTeam.capname || existingLocal?.capName || 'Captain',
              capPhone: cloudTeam.capPhone || cloudTeam.capphone || existingLocal?.capPhone || '',
              capEmail: cloudTeam.capEmail || cloudTeam.capemail || existingLocal?.capEmail || '',
              group: cloudGroup,
              slot: cloudSlot,
              status: cloudTeam.status || existingLocal?.status || 'Approved',
              qualificationStatus: qualStatusStr || 'Round 1 Competitor',
              currentStage: curStg,
              qualifiedRounds: parsedQualifiedRounds,
              stageStatuses: parsedStageStatuses,
              stageGroups: parsedStageGroups,
              players: safeJsonParse(cloudTeam.players, existingLocal?.players || [])
            };
          });

          (this.state.teams || []).forEach(localT => {
            if (localT && localT.code && !deletedCodes.includes(localT.code.toUpperCase()) && !mergedTeams.some(m => m.code.toUpperCase() === localT.code.toUpperCase())) {
              mergedTeams.push(localT);
              this.syncToSupabase(localT);
            }
          });

          this.state.teams = mergedTeams;
          this.save();
        } else if ((this.state.teams || []).length > 0) {
          this.state.teams.forEach(localT => {
            if (localT && localT.code && !deletedCodes.includes(localT.code.toUpperCase())) {
              this.syncToSupabase(localT);
            }
          });
        }
      } else if (teamsErr) {
        console.warn('Teams fetch warning:', teamsErr.message);
      }

      // 2. Fetch Broadcasts (Room ID & Passwords + Failover Settings & Failover Rounds)
      const { data: bcData, error: bcErr } = await supabaseClient.from('broadcasts').select('*');
      if (!bcErr && Array.isArray(bcData)) {
        // Check for Failover System Settings Row in broadcasts table
        const sysRow = bcData.find(b => b.id === 'SYS_SETTINGS');
        if (sysRow) {
          const rawJson = sysRow.roomId || sysRow.roomid;
          if (rawJson) {
            try {
              const cloudParsed = JSON.parse(rawJson);
              this.state.settings = Object.assign({}, DEFAULT_SETTINGS, cloudParsed);
              if (cloudParsed.adminPinHash) this.state.adminPinHash = cloudParsed.adminPinHash;
              if (cloudParsed.activeStageId) this.state.activeStageId = cloudParsed.activeStageId;
            } catch (e) {
              console.warn('Failover settings parse warning:', e);
            }
          }
        }

        // Check for Failover System Rounds Row in broadcasts table
        const sysRoundsRow = bcData.find(b => b.id === 'SYS_ROUNDS');
        if (sysRoundsRow) {
          const rawRoundsJson = sysRoundsRow.roomId || sysRoundsRow.roomid;
          if (rawRoundsJson) {
            try {
              const cloudRounds = JSON.parse(rawRoundsJson);
              if (Array.isArray(cloudRounds) && cloudRounds.length > 0) {
                this.state.rounds = cloudRounds;
              }
            } catch (e) {
              console.warn('Failover rounds parse warning:', e);
            }
          }
        }

        const deletedBcIds = this.state.deletedBroadcastIds || [];
        const validBc = bcData.filter(b => {
          if (!b.id || b.id === 'SYS_SETTINGS' || b.id === 'SYS_ROUNDS') return false;
          if (deletedBcIds.includes(b.id)) return false;
          const roomid = (b.roomId || b.roomid || '').toString();
          const roompass = (b.roomPass || b.roompass || '').toString();
          const isLive = b.isLive !== false && b.islive !== false;
          if (!isLive && !roomid && !roompass) return false;
          return true;
        });

        this.state.broadcasts = validBc.map(bc => ({
          id: bc.id,
          group: bc.group,
          stage: bc.stage,
          roomId: bc.roomId || bc.roomid || '',
          roomPass: bc.roomPass || bc.roompass || '',
          matchTime: bc.matchTime || bc.matchtime || '',
          map: bc.map || 'Erangel',
          isLive: bc.isLive !== false && bc.islive !== false
        }));
      }

      // 3. Fetch Schedules
      const { data: schData, error: schErr } = await supabaseClient.from('schedules').select('*');
      if (!schErr && Array.isArray(schData)) {
        const deletedSchIds = this.state.deletedScheduleIds || [];
        const validSch = schData.filter(s => {
          if (!s.id) return false;
          if (deletedSchIds.includes(s.id)) return false;
          const mNum = (s.matchNum || s.matchnum || '').toString().toLowerCase();
          if (mNum === 'deleted') return false;
          return true;
        });

        this.state.schedules = validSch.map(sch => ({
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
        if (scData.length > 0) {
          this.state.matchScores = scData.map(sc => ({
            stage: sc.stage,
            group: sc.group,
            matchNum: sc.matchNum || sc.matchnum,
            scores: safeJsonParse(sc.scores, [])
          }));
        }
      }

      // 5. Fetch Rounds
      const { data: rndData, error: rndErr } = await supabaseClient.from('rounds').select('*');
      if (!rndErr && Array.isArray(rndData)) {
        const deletedRndIds = this.state.deletedRoundIds || [];
        const validRnd = rndData.filter(r => {
          if (!r.id) return false;
          if (deletedRndIds.includes(r.id)) return false;
          const rName = (r.name || '').toString().toLowerCase();
          if (rName === 'deleted') return false;
          return true;
        });

        if (validRnd.length > 0) {
          this.state.rounds = validRnd.map(r => ({
            id: r.id,
            name: r.name,
            autoQualifyTopN: parseInt(r.autoQualifyTopN || r.autoqualifytopn) || 4,
            lobbyCapacity: parseInt(r.lobbyCapacity || r.lobbycapacity) || 16,
            matchCount: parseInt(r.matchCount || r.matchcount) || 1
          }));
        } else if (deletedRndIds.length > 0) {
          this.state.rounds = (this.state.rounds || []).filter(r => !deletedRndIds.includes(r.id));
        }
      }

      // 6. Fetch Settings (Prize Pool, Description, Rules, PDF URL, Custom PIN, Championship Title, Entry Fee)
      const { data: setData, error: setErr } = await supabaseClient.from('settings').select('*');
      if (!setErr && Array.isArray(setData) && setData.length > 0) {
        const cloudSet = setData[0];
        const settingsFromTable = {
          tournamentTitle: cloudSet.tournamentTitle || cloudSet.tournamenttitle,
          prizePool: cloudSet.prizePool || cloudSet.prizepool,
          entryFee: cloudSet.entryFee || cloudSet.entryfee,
          description: cloudSet.description,
          totalSlots: parseInt(cloudSet.totalSlots || cloudSet.totalslots),
          headerStatusText: cloudSet.headerStatusText || cloudSet.headerstatustext,
          rulesText: cloudSet.rulesText || cloudSet.rulestext,
          rulesPdfUrl: cloudSet.rulesPdfUrl || cloudSet.rulespdfurl,
          logoUrl: cloudSet.logoUrl || cloudSet.logourl || '',
          adminPinHash: cloudSet.adminPinHash || cloudSet.adminpinhash,
          activeStageId: cloudSet.activeStageId || cloudSet.activestageid
        };
        Object.keys(settingsFromTable).forEach(k => {
          if (settingsFromTable[k] === undefined || settingsFromTable[k] === null || (typeof settingsFromTable[k] === 'number' && isNaN(settingsFromTable[k]))) {
            delete settingsFromTable[k];
          }
        });
        // Combine defaults -> settingsFromTable -> current state (current state & SYS_SETTINGS take priority!)
        this.state.settings = Object.assign({}, DEFAULT_SETTINGS, settingsFromTable, this.state.settings);
        if (this.state.settings.adminPinHash) this.state.adminPinHash = this.state.settings.adminPinHash;
        if (this.state.settings.activeStageId) this.state.activeStageId = this.state.settings.activeStageId;
      }

      this.save();
      window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));
    } catch (e) {
      console.warn('Supabase fetch error:', e);
    }
  }

  getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, this.state.settings || {});
  }

  async updateSettings(newSettings) {
    if (!this.state.settings) this.state.settings = Object.assign({}, DEFAULT_SETTINGS);
    Object.assign(this.state.settings, newSettings);
    if (newSettings.activeStageId) this.state.activeStageId = newSettings.activeStageId;
    if (newSettings.adminPinHash) this.state.adminPinHash = newSettings.adminPinHash;
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        const settingsJson = JSON.stringify(this.state.settings);

        // Failover Channel 1: Store in broadcasts table (Guaranteed table on Supabase)
        const sysBcLower = { id: 'SYS_SETTINGS', group: 'SYS_SETTINGS', stage: 'SYS_SETTINGS', roomid: settingsJson, roompass: 'SYS_SETTINGS', islive: false };
        const sysBcCamel = { id: 'SYS_SETTINGS', group: 'SYS_SETTINGS', stage: 'SYS_SETTINGS', roomId: settingsJson, roomPass: 'SYS_SETTINGS', isLive: false };
        let bcRes = await supabaseClient.from('broadcasts').upsert([sysBcLower], { onConflict: 'id' });
        if (bcRes.error) await supabaseClient.from('broadcasts').upsert([sysBcCamel], { onConflict: 'id' });

        // Failover Channel 2: Store in settings table
        const pLower = {
          id: 'main_settings',
          tournamenttitle: this.state.settings.tournamentTitle || 'REX ESPORTS BGMI CHAMPIONSHIP',
          prizepool: this.state.settings.prizePool,
          entryfee: this.state.settings.entryFee,
          description: this.state.settings.description,
          totalslots: this.state.settings.totalSlots,
          headerstatustext: this.state.settings.headerStatusText,
          rulestext: this.state.settings.rulesText,
          rulespdfurl: this.state.settings.rulesPdfUrl,
          logourl: this.state.settings.logoUrl || '',
          adminpinhash: this.state.settings.adminPinHash || this.state.adminPinHash,
          activestageid: this.state.settings.activeStageId || this.state.activeStageId
        };
        const pCamel = {
          id: 'main_settings',
          tournamentTitle: this.state.settings.tournamentTitle || 'REX ESPORTS BGMI CHAMPIONSHIP',
          prizePool: this.state.settings.prizePool,
          entryFee: this.state.settings.entryFee,
          description: this.state.settings.description,
          totalSlots: this.state.settings.totalSlots,
          headerStatusText: this.state.settings.headerStatusText,
          rulesText: this.state.settings.rulesText,
          rulesPdfUrl: this.state.settings.rulesPdfUrl,
          logoUrl: this.state.settings.logoUrl || '',
          adminPinHash: this.state.settings.adminPinHash || this.state.adminPinHash,
          activeStageId: this.state.settings.activeStageId || this.state.activeStageId
        };
        let res = await supabaseClient.from('settings').upsert([pLower], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('settings').insert([pLower]);
        if (res.error) res = await supabaseClient.from('settings').upsert([pCamel], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('settings').insert([pCamel]);
        console.log('⚡ Settings synced live to Supabase Cloud!');
      } catch (e) {
        console.warn('Settings cloud sync warning:', e);
      }
    }
  }

  async verifyAdminPin(enteredPin) {
    if (!enteredPin) return false;
    return enteredPin.trim().toUpperCase() === 'REXADMIN6603';
  }

  async setAdminPin(newPin) {
    const hashed = await sha256(newPin.trim());
    this.state.adminPinHash = hashed;
    await this.updateSettings({ adminPinHash: hashed });
  }

  async resetAllDataFresh() {
    this.state.teams = [];
    this.state.schedules = [];
    this.state.broadcasts = [];
    this.state.matchScores = [];
    this.state.deletedTeamCodes = [];
    this.state.deletedScheduleIds = [];
    this.state.deletedBroadcastIds = [];
    this.state.deletedRoundIds = [];
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        await supabaseClient.from('teams').delete().neq('code', 'IMPOSSIBLE_CODE_XYZ_999');
        await supabaseClient.from('schedules').delete().neq('id', 'IMPOSSIBLE_ID_XYZ_999');
        await supabaseClient.from('broadcasts').delete().neq('id', 'IMPOSSIBLE_ID_XYZ_999');
        await supabaseClient.from('match_scores').delete().neq('stage', 'IMPOSSIBLE_STAGE_XYZ_999');
        console.log('⚡ All Supabase Cloud tables wiped clean for fresh registrations!');
      } catch (e) {
        console.warn('Supabase database wipe error:', e);
      }
    }
  }

  getGroupNameFromIndex(idx) {
    if (idx < 26) {
      return `Group ${String.fromCharCode(65 + idx)}`;
    }
    const first = String.fromCharCode(65 + Math.floor(idx / 26) - 1);
    const second = String.fromCharCode(65 + (idx % 26));
    return `Group ${first}${second}`;
  }

  getAllGroups() {
    const teams = this.getTeams().filter(t => t.status === 'Approved');
    const cap = this.getActiveLobbyCapacity();
    const minGroupsNeeded = Math.max(4, Math.ceil(teams.length / cap));

    const groupSet = new Set();
    for (let i = 0; i < minGroupsNeeded; i++) {
      groupSet.add(this.getGroupNameFromIndex(i));
    }
    teams.forEach(t => {
      if (t.group) groupSet.add(t.group);
    });

    return Array.from(groupSet);
  }

  getRounds() { return this.state.rounds || INITIAL_ROUNDS; }
  getRoundById(id) { return this.getRounds().find(r => r.id === id) || this.getRounds()[0]; }
  getActiveLobbyCapacity() {
    const currentRound = this.getRoundById(this.state.activeStageId);
    return currentRound ? currentRound.lobbyCapacity : 16;
  }

  async syncRoundsToSupabase() {
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));
    if (!supabaseClient) return;
    try {
      // Failover Channel: Store full JSON in broadcasts table (Guaranteed active table)
      const roundsJson = JSON.stringify(this.state.rounds);
      const sysRndLower = { id: 'SYS_ROUNDS', group: 'SYS_ROUNDS', stage: 'SYS_ROUNDS', roomid: roundsJson, roompass: 'SYS_ROUNDS', islive: false };
      const sysRndCamel = { id: 'SYS_ROUNDS', group: 'SYS_ROUNDS', stage: 'SYS_ROUNDS', roomId: roundsJson, roomPass: 'SYS_ROUNDS', isLive: false };
      let bcRes = await supabaseClient.from('broadcasts').upsert([sysRndLower], { onConflict: 'id' });
      if (bcRes.error) await supabaseClient.from('broadcasts').upsert([sysRndCamel], { onConflict: 'id' });

      // Primary Channel: Store each round in rounds table
      if (Array.isArray(this.state.rounds)) {
        for (const rnd of this.state.rounds) {
          await supabaseClient.from('rounds').upsert([{
            id: rnd.id,
            name: rnd.name,
            autoQualifyTopN: rnd.autoQualifyTopN,
            autoqualifytopn: rnd.autoQualifyTopN,
            lobbyCapacity: rnd.lobbyCapacity,
            lobbycapacity: rnd.lobbyCapacity,
            matchCount: rnd.matchCount || 1,
            matchcount: rnd.matchCount || 1
          }], { onConflict: 'id' });
        }
      }
      console.log('⚡ Dynamic Rounds synced live to Supabase Cloud!');
    } catch (e) {
      console.warn('Rounds sync warning:', e);
    }
  }

  addRound(name, autoQualifyTopN = 4, lobbyCapacity = 16, matchCount = 1) {
    const id = `rnd_${Date.now()}`;
    const roundObj = { id, name, autoQualifyTopN, lobbyCapacity, matchCount: parseInt(matchCount) || 1 };
    this.state.rounds.push(roundObj);
    this.syncRoundsToSupabase();
    return id;
  }

  updateRound(id, updatedFields) {
    const rnd = this.state.rounds.find(r => r.id === id);
    if (rnd) {
      Object.assign(rnd, updatedFields);
      this.syncRoundsToSupabase();
    }
  }

  async deleteRound(id) {
    if (!id) return;
    if (!this.state.deletedRoundIds) this.state.deletedRoundIds = [];
    if (!this.state.deletedRoundIds.includes(id)) this.state.deletedRoundIds.push(id);

    this.state.rounds = this.state.rounds.filter(r => r.id !== id);
    await this.syncRoundsToSupabase();

    if (supabaseClient) {
      try {
        await supabaseClient.from('rounds').update({ name: 'Deleted' }).eq('id', id);
        const { error } = await supabaseClient.from('rounds').delete().eq('id', id);
        if (error) await supabaseClient.from('rounds').delete().ilike('id', id);
        console.log('⚡ Round deleted from Supabase Cloud:', id);
      } catch (e) {
        console.warn('Round delete cloud warning:', e);
      }
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
    newTeam.qualifiedRounds = ['round1'];

    const cap = this.getActiveLobbyCapacity();
    if (!newTeam.group) {
      const groupIdx = Math.floor(this.getTeams().length / cap);
      newTeam.group = this.getGroupNameFromIndex(groupIdx);
      const inGrp = this.getTeams().filter(t => t.group === newTeam.group);
      newTeam.slot = (inGrp.length % cap) + 1;
    }

    newTeam.stageGroups = {
      round1: { group: newTeam.group, slot: newTeam.slot }
    };

    this.state.teams.unshift(newTeam);
    this.save();

    // Trigger Cloud Sync to Supabase
    this.syncToSupabase(newTeam);

    return newTeam;
  }

  getTeamStageGroupAndSlot(team, stageId = 'round1') {
    if (!team) return { group: 'Group A', slot: 1 };
    if (team.stageGroups && team.stageGroups[stageId]) {
      return team.stageGroups[stageId];
    }
    return {
      group: team.group || 'Group A',
      slot: team.slot || 1
    };
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
      const rounds = this.getRounds();
      if (!Array.isArray(team.qualifiedRounds)) {
        team.qualifiedRounds = ['round1'];
      }
      if (!team.stageStatuses) team.stageStatuses = {};
      team.stageStatuses['round1'] = team.stageStatuses['round1'] || 'Round 1 Competitor';

      let stageToSet = targetStage;
      if (!stageToSet) {
        const matchedRnd = rounds.find(r => qualificationStatus.toLowerCase().includes(r.name.toLowerCase()) || qualificationStatus.toLowerCase().includes(r.id.toLowerCase()));
        if (matchedRnd) stageToSet = matchedRnd.id;
        else if (qualificationStatus.toLowerCase().includes('round 1')) stageToSet = 'round1';
        else if (qualificationStatus.toLowerCase().includes('round 2')) stageToSet = 'round2';
        else if (qualificationStatus.toLowerCase().includes('quarter')) stageToSet = 'rnd_quarter';
        else if (qualificationStatus.toLowerCase().includes('semi')) stageToSet = 'rnd_semi';
        else if (qualificationStatus.toLowerCase().includes('final')) stageToSet = 'finals';
      }

      if (!stageToSet && qualificationStatus.toLowerCase().includes('competitor')) {
        stageToSet = 'round1';
      }

      const targetIdx = rounds.findIndex(r => r.id === stageToSet);

      if (targetIdx >= 0) {
        // Forward promotion or demotion back to stage index targetIdx:
        // All stages from index 0 up to targetIdx are kept in team.qualifiedRounds.
        const validRoundIds = rounds.slice(0, targetIdx + 1).map(r => r.id);
        team.qualifiedRounds = validRoundIds;

        // Remove any higher stage IDs beyond targetIdx from stageStatuses
        rounds.slice(targetIdx + 1).forEach(r => {
          delete team.stageStatuses[r.id];
        });

        team.currentStage = stageToSet;
        team.qualificationStatus = qualificationStatus;
        team.stageStatuses[stageToSet] = qualificationStatus;
      } else if (qualificationStatus.toLowerCase().includes('eliminated') || qualificationStatus.toLowerCase().includes('disqualified')) {
        const currStage = targetStage || team.currentStage || 'round1';
        const currIdx = rounds.findIndex(r => r.id === currStage);
        const validIdx = currIdx >= 0 ? currIdx : 0;

        team.qualifiedRounds = rounds.slice(0, validIdx + 1).map(r => r.id);
        rounds.slice(validIdx + 1).forEach(r => {
          delete team.stageStatuses[r.id];
        });

        team.qualificationStatus = qualificationStatus;
        team.stageStatuses[currStage] = qualificationStatus;
      } else {
        team.qualificationStatus = qualificationStatus;
      }

      this.save();
      this.syncToSupabase(team);
    }
  }

  autoQualifyRoundTeams(sourceRoundId, targetStatus, targetStageId = null, topN = 4) {
    const sourceTeams = this.getTeamsForRound(sourceRoundId);
    if (sourceTeams.length === 0) return;

    const leaderboard = typeof this.getLeaderboard === 'function' ? this.getLeaderboard(sourceRoundId, 'all', 'all') : [];
    let qualifiedCodes = [];
    if (leaderboard && leaderboard.length > 0) {
      qualifiedCodes = leaderboard.slice(0, topN).map(t => t.code);
    } else {
      qualifiedCodes = sourceTeams.slice(0, topN).map(t => t.code);
    }

    const rounds = this.getRounds();
    const sIdx = rounds.findIndex(r => r.id === sourceRoundId);
    let resolvedStage = targetStageId;

    if (sIdx >= 0 && sIdx + 1 < rounds.length) {
      resolvedStage = rounds[sIdx + 1].id;
    } else if (!resolvedStage) {
      resolvedStage = sourceRoundId;
    }

    const targetRoundObj = this.getRoundById(resolvedStage);
    const cleanStatus = (targetStatus && !targetStatus.includes(sourceRoundId)) ? targetStatus : (targetRoundObj ? `Qualified for ${targetRoundObj.name}` : 'Qualified Competitor');

    qualifiedCodes.forEach(code => {
      this.updateTeamQualification(code, cleanStatus, resolvedStage);
    });

    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));
  }

  async deleteTeam(code) {
    if (!code) return;
    const cleanCode = code.trim();
    const upperCode = cleanCode.toUpperCase();

    if (!this.state.deletedTeamCodes) this.state.deletedTeamCodes = [];
    if (!this.state.deletedTeamCodes.includes(upperCode)) this.state.deletedTeamCodes.push(upperCode);

    this.state.teams = this.state.teams.filter(t => t.code.toUpperCase() !== upperCode);
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        // Step 1: Soft Delete in Supabase (Update status to Deleted so all devices ignore it instantly even if SQL delete fails)
        await supabaseClient.from('teams').update({ status: 'Deleted', qualificationstatus: 'Deleted' }).eq('code', cleanCode);
        await supabaseClient.from('teams').update({ status: 'Deleted', qualificationstatus: 'Deleted' }).ilike('code', cleanCode);

        // Step 2: Hard Delete in Supabase
        const { error } = await supabaseClient.from('teams').delete().eq('code', cleanCode);
        if (error) {
          await supabaseClient.from('teams').delete().ilike('code', cleanCode);
          await supabaseClient.from('teams').delete().eq('code', cleanCode.toLowerCase());
          await supabaseClient.from('teams').delete().eq('code', cleanCode.toUpperCase());
        }
        console.log('⚡ Team deleted from Supabase Cloud:', cleanCode);
      } catch (e) {
        console.warn('Delete team cloud error:', e);
      }
    }
  }

  transferTeamGroupForStage(code, stageId = 'round1', newGroup, newSlot) {
    const team = this.state.teams.find(t => t.code === code);
    if (team) {
      if (!team.stageGroups) team.stageGroups = {};
      team.stageGroups[stageId] = {
        group: newGroup,
        slot: parseInt(newSlot) || 1
      };
      if (stageId === 'round1' || stageId === this.state.activeStageId) {
        team.group = newGroup;
        team.slot = parseInt(newSlot) || team.slot;
      }
      this.save();
      this.syncToSupabase(team);
    }
  }

  autoAllocateGroupsForStage(stageId = 'round1') {
    const roundObj = this.getRoundById(stageId);
    const cap = roundObj ? (parseInt(roundObj.lobbyCapacity) || 16) : 16;
    const stageTeams = this.getTeamsForRound(stageId);

    stageTeams.forEach((team, idx) => {
      const gIdx = Math.floor(idx / cap);
      const sIdx = (idx % cap) + 1;
      const groupName = this.getGroupNameFromIndex(gIdx);

      if (!team.stageGroups) team.stageGroups = {};
      team.stageGroups[stageId] = { group: groupName, slot: sIdx };

      if (stageId === 'round1' || stageId === this.state.activeStageId) {
        team.group = groupName;
        team.slot = sIdx;
      }
      this.syncToSupabase(team);
    });

    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));
  }

  getAllGroupsForStage(stageId = 'round1') {
    const stageTeams = this.getTeamsForRound(stageId);
    const roundObj = this.getRoundById(stageId);
    const cap = roundObj ? (parseInt(roundObj.lobbyCapacity) || 16) : 16;
    const minGroupsNeeded = Math.max(4, Math.ceil(stageTeams.length / cap));

    const groupSet = new Set();
    for (let i = 0; i < minGroupsNeeded; i++) {
      groupSet.add(this.getGroupNameFromIndex(i));
    }
    stageTeams.forEach(t => {
      const sg = this.getTeamStageGroupAndSlot(t, stageId);
      if (sg && sg.group) groupSet.add(sg.group);
    });

    return Array.from(groupSet);
  }

  autoAllocateGroups() {
    this.autoAllocateGroupsForStage(this.state.activeStageId || 'round1');
  }

  getTeamsForRound(roundId) {
    const approved = this.getTeams().filter(t => t.status === 'Approved');
    const rounds = this.getRounds();
    const rIdx = rounds.findIndex(r => r.id === roundId);

    if (rIdx <= 0 || roundId === 'round1') {
      return approved;
    } else {
      return approved.filter(t => {
        const qRounds = Array.isArray(t.qualifiedRounds) ? t.qualifiedRounds : ['round1'];
        return qRounds.includes(roundId);
      });
    }
  }

  getSchedules() { return this.state.schedules || []; }
  
  getSchedulesForTeam(team) {
    if (!team) return [];
    const qualified = Array.isArray(team.qualifiedRounds) ? team.qualifiedRounds : ['round1'];
    const teamStage = team.currentStage || 'round1';
    return this.getSchedules().filter(s => s.group === team.group && (qualified.includes(s.stage) || s.stage === teamStage || s.stage === 'round1'));
  }

  async addSchedule(sch) {
    sch.id = sch.id || `SCH-${Date.now()}`;
    this.state.schedules.unshift(sch);
    this.save();

    if (supabaseClient) {
      try {
        const pLower = { id: sch.id, group: sch.group, stage: sch.stage, matchnum: sch.matchNum, time: sch.time, map: sch.map };
        const pCamel = { id: sch.id, group: sch.group, stage: sch.stage, matchNum: sch.matchNum, time: sch.time, map: sch.map };

        let res = await supabaseClient.from('schedules').upsert([pLower], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('schedules').insert([pLower]);
        if (res.error) res = await supabaseClient.from('schedules').upsert([pCamel], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('schedules').insert([pCamel]);

        if (!res.error) console.log('⚡ Schedule synced to Supabase Cloud!');
        else console.warn('Schedule sync warning:', res.error.message);
      } catch (e) {
        console.warn('Schedule cloud sync warning:', e);
      }
    }
  }

  async deleteSchedule(id) {
    if (!id) return;
    if (!this.state.deletedScheduleIds) this.state.deletedScheduleIds = [];
    if (!this.state.deletedScheduleIds.includes(id)) this.state.deletedScheduleIds.push(id);

    this.state.schedules = this.state.schedules.filter(s => s.id !== id);
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        await supabaseClient.from('schedules').update({ matchnum: 'Deleted', matchNum: 'Deleted' }).eq('id', id);
        const { error } = await supabaseClient.from('schedules').delete().eq('id', id);
        if (error) await supabaseClient.from('schedules').delete().ilike('id', id);
        console.log('⚡ Schedule deleted from Supabase Cloud:', id);
      } catch (e) {
        console.warn('Schedule delete cloud error:', e);
      }
    }
  }

  getBroadcasts() { return this.state.broadcasts || []; }
  
  getBroadcastForGroup(groupName) { return this.getBroadcasts().find(b => b.group === groupName && b.isLive); }

  getBroadcastsForTeam(team) {
    if (!team) return [];
    const qualified = Array.isArray(team.qualifiedRounds) ? team.qualifiedRounds : ['round1'];
    const teamStage = team.currentStage || 'round1';
    return this.getBroadcasts().filter(b => b.group === team.group && b.isLive && (qualified.includes(b.stage) || b.stage === teamStage || b.stage === 'round1'));
  }

  async saveBroadcast(bc) {
    bc.id = bc.id || `BC-${Date.now()}`;
    // Overwrite / Delete older broadcasts matching the same Group & Stage
    this.state.broadcasts = (this.state.broadcasts || []).filter(b => !(b.group === bc.group && b.stage === bc.stage));
    this.state.broadcasts.unshift(bc);
    this.save();

    if (supabaseClient) {
      try {
        const bcId = bc.id || `BC-${bc.group}-${bc.stage}`;
        const pLower = { id: bcId, group: bc.group, stage: bc.stage, roomid: bc.roomId, roompass: bc.roomPass, matchtime: bc.matchTime, map: bc.map, islive: bc.isLive !== false };
        const pCamel = { id: bcId, group: bc.group, stage: bc.stage, roomId: bc.roomId, roomPass: bc.roomPass, matchTime: bc.matchTime, map: bc.map, isLive: bc.isLive !== false };

        let res = await supabaseClient.from('broadcasts').upsert([pLower], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('broadcasts').insert([pLower]);
        if (res.error) res = await supabaseClient.from('broadcasts').upsert([pCamel], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('broadcasts').insert([pCamel]);

        if (!res.error) console.log('⚡ Broadcast credentials synced to Supabase Cloud!');
        else console.warn('Broadcast sync warning:', res.error.message);
      } catch (e) {
        console.warn('Broadcast cloud sync warning:', e);
      }
    }
  }

  async deleteBroadcast(id) {
    if (!id) return;
    if (!this.state.deletedBroadcastIds) this.state.deletedBroadcastIds = [];
    if (!this.state.deletedBroadcastIds.includes(id)) this.state.deletedBroadcastIds.push(id);

    this.state.broadcasts = this.state.broadcasts.filter(b => b.id !== id);
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        await supabaseClient.from('broadcasts').update({ islive: false, roomid: '', roompass: '' }).eq('id', id);
        const { error } = await supabaseClient.from('broadcasts').delete().eq('id', id);
        if (error) await supabaseClient.from('broadcasts').delete().ilike('id', id);
        console.log('⚡ Broadcast deleted from Supabase Cloud:', id);
      } catch (e) {
        console.warn('Broadcast delete cloud error:', e);
      }
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
        const pLower = { id: scoreId, stage: scoreObj.stage, group: scoreObj.group, matchnum: scoreObj.matchNum, scores: scoreObj.scores };
        const pCamel = { id: scoreId, stage: scoreObj.stage, group: scoreObj.group, matchNum: scoreObj.matchNum, scores: scoreObj.scores };

        let res = await supabaseClient.from('match_scores').upsert([pLower], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('match_scores').insert([pLower]);
        if (res.error) res = await supabaseClient.from('match_scores').upsert([pCamel], { onConflict: 'id' });
        if (res.error) res = await supabaseClient.from('match_scores').insert([pCamel]);

        if (!res.error) console.log('⚡ Match score synced to Supabase Cloud!');
        else console.warn('Match score sync warning:', res.error.message);
      } catch (e) {
        console.warn('Match score cloud sync warning:', e);
      }
    }
  }

  getLeaderboard(stage = 'round1', groupFilter = 'all', matchFilter = 'all') {
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

    const relevant = (this.state.matchScores || []).filter(m => m.stage === stage);
    relevant.forEach(match => {
      if ((groupFilter === 'all' || match.group === groupFilter) &&
          (matchFilter === 'all' || match.matchNum === matchFilter)) {
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

  getMatchesForStageAndGroup(stageId, groupName = 'all') {
    return (this.state.matchScores || []).filter(m => 
      m.stage === stageId && (groupName === 'all' || m.group === groupName)
    );
  }

  async deleteMatchScore(stage, group, matchNum) {
    this.state.matchScores = (this.state.matchScores || []).filter(m => 
      !(m.stage === stage && m.group === group && m.matchNum === matchNum)
    );
    this.save();
    window.dispatchEvent(new CustomEvent('supabaseSyncComplete'));

    if (supabaseClient) {
      try {
        const scoreId = `MS-${stage}-${group}-${matchNum}`.replace(/\s+/g, '_');
        await supabaseClient.from('match_scores').delete().eq('id', scoreId);
      } catch (e) {
        console.warn('Match score delete error:', e);
      }
    }
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

  async verifyAdminPin(pin) {
    if (!pin) return false;
    return pin.trim().toUpperCase() === 'REXADMIN6603';
  }
}

window.store = new DataStore();
