import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Player, UserSquad, Tournament, Standing } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface FantasyContextType {
  user: User | null;
  players: Player[];
  mySquad: UserSquad[];
  currentTournament: Tournament | null;
  standing: Standing | null;
  budgetRemaining: number;
  loading: boolean;
  impersonatedTeamId: string | null;
  isAdmin: boolean;
  refreshSquad: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  refreshTournament: () => Promise<void>;
  addPlayerToSquad: (playerId: string, auctionPrice: number) => Promise<boolean>;
  removePlayerFromSquad: (playerId: string) => Promise<boolean>;
  initializeStanding: (teamName: string) => Promise<void>;
  generateMockRoster: (teamId?: string) => Promise<void>;
  generateAllMockRosters: () => Promise<void>;
  setImpersonatedTeam: (teamId: string | null) => void;
}

const FantasyContext = createContext<FantasyContextType | undefined>(undefined);

const MOCK_ADMIN_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@dev.local',
  app_metadata: { role: 'admin' },
  user_metadata: { name: 'Developer Admin' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

export const FantasyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isDevelopmentMode = import.meta.env.DEV;
  const [user, setUser] = useState<User | null>(isDevelopmentMode ? MOCK_ADMIN_USER : null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mySquad, setMySquad] = useState<UserSquad[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedTeamId, setImpersonatedTeamId] = useState<string | null>(null);

  useEffect(() => {

    if (isDevelopmentMode) {
      setUser(MOCK_ADMIN_USER);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentTournament) {
      const displayName = currentTournament.name || currentTournament.tournament_name;
      console.log('✅ Torneo Attivo:', displayName);
    }
  }, [currentTournament]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await refreshPlayers();
        await loadCurrentTournament();

        if (user) {
          if (isDevelopmentMode) {
            await ensureDevTeamExists();
          }
          refreshSquad();
          loadStanding();
        }
      } catch (error) {
        console.error('❌ Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const ensureDevTeamExists = async () => {
    const { data: existingTeam } = await supabase
      .from('league_teams')
      .select('id')
      .eq('user_id', MOCK_ADMIN_USER.id)
      .maybeSingle();

    if (!existingTeam) {
      console.log('🔨 Creating dev team...');
      const { error } = await supabase
        .from('league_teams')
        .insert({
          user_id: MOCK_ADMIN_USER.id,
          name: 'Dev Team',
          credits: 1000
        });

      if (error) {
        console.error('❌ Error creating dev team:', error);
      } else {
        console.log('✅ Dev team created successfully');
      }
    } else {
      console.log('✅ Dev team already exists');
    }
  };

  const refreshPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('ranking', { ascending: true });

    setPlayers(data || []);
  };

  const refreshSquad = async () => {
    if (!user) {
      console.log('⚠️ refreshSquad: No user');
      return;
    }

    console.log('🔍 refreshSquad: Loading team for user:', user.id);

    // Use impersonated team if set, otherwise use user's team
    let teamData = null;
    if (impersonatedTeamId) {
      console.log('👤 IMPERSONATION MODE: Using team ID:', impersonatedTeamId);
      const { data, error } = await supabase
        .from('league_teams')
        .select('id')
        .eq('id', impersonatedTeamId)
        .maybeSingle();

      if (error) {
        console.error('❌ refreshSquad: Error loading impersonated team:', error);
      }
      teamData = data;
    } else {
      // First get the user's team from league_teams
      const { data, error } = await supabase
        .from('league_teams')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ refreshSquad: Error loading team:', error);
      }
      teamData = data;
    }

    if (!teamData) {
      console.log('⚠️ refreshSquad: No team found for user');
      setMySquad([]);
      return;
    }

    console.log('✅ refreshSquad: Team found:', teamData.id);

    // Then get all players for that team
    const { data, error } = await supabase
      .from('team_players')
      .select(`
        id,
        player_id,
        auction_price,
        acquired_at,
        player:players(*)
      `)
      .eq('team_id', teamData.id);

    if (error) {
      console.error('❌ refreshSquad: Error loading players:', error);
    } else {
      console.log('✅ refreshSquad: Loaded', data?.length || 0, 'players');
      setMySquad(data as any);
    }
  };

  const autoGenerateMatchups = async (tournamentId: string) => {
    console.log('🏆 Auto-generating matchups for:', tournamentId);

    const { data: myTeam } = await supabase
      .from('league_teams')
      .select('id')
      .eq('user_id', MOCK_ADMIN_USER.id)
      .maybeSingle();

    if (!myTeam) {
      console.log('⚠️ No team found for user');
      return;
    }

    const { data: existingMatchups } = await supabase
      .from('matchups')
      .select('id')
      .eq('tournament_id', tournamentId)
      .or(`home_team_id.eq.${myTeam.id},away_team_id.eq.${myTeam.id}`);

    if (existingMatchups && existingMatchups.length > 0) {
      console.log('✅ Matchups already exist');
      return;
    }

    const { data: botTeams } = await supabase
      .from('league_teams')
      .select('id, name')
      .neq('user_id', MOCK_ADMIN_USER.id)
      .limit(2);

    if (!botTeams || botTeams.length < 2) {
      console.log('⚠️ Not enough bot teams');
      return;
    }

    for (const botTeam of botTeams) {
      await supabase.from('matchups').insert({
        tournament_id: tournamentId,
        home_team_id: myTeam.id,
        away_team_id: botTeam.id,
        home_score: 0,
        away_score: 0,
        home_championship_points: 0,
        away_championship_points: 0,
        is_completed: false
      });
    }

    console.log('✅ Generated 2 matchups');
  };

  const loadCurrentTournament = async () => {
    console.log('🎾 loadCurrentTournament: START');

    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('id, name, tournament_name, round_number, category, is_active, status, opponents_count, weight, start_date, created_at')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading tournament:', error);
        return;
      }

      if (tournamentData) {
        // Map category to type for backwards compatibility
        const tournament = {
          ...tournamentData,
          type: tournamentData.category
        } as Tournament;

        console.log('✅ FOUND ACTIVE TOURNAMENT:', tournament.name || tournament.tournament_name);
        console.log('   Round:', tournament.round_number, 'Type:', tournament.category);
        setCurrentTournament(tournament);

        if (isDevelopmentMode) {
          await autoGenerateMatchups(tournament.id);
        }
      } else {
        console.warn('⚠️ No active tournament found');
        setCurrentTournament(null);
      }
    } catch (error) {
      console.error('❌ Query failed:', error);
      setCurrentTournament(null);
    }
  };

  const refreshTournament = async () => {
    await loadCurrentTournament();
  };

  const loadStanding = async () => {
    if (!user) {
      console.log('⚠️ loadStanding: No user');
      return;
    }

    console.log('🔍 loadStanding: Loading standing for user:', user.id);

    // Load from league_teams - handle impersonation
    let teamData = null;
    if (impersonatedTeamId) {
      console.log('👤 IMPERSONATION MODE: Loading standing for team:', impersonatedTeamId);
      const { data, error: teamError } = await supabase
        .from('league_teams')
        .select('id, name, credits')
        .eq('id', impersonatedTeamId)
        .maybeSingle();

      if (teamError) {
        console.error('❌ loadStanding: Error loading impersonated team:', teamError);
      }
      teamData = data;
    } else {
      const { data, error: teamError } = await supabase
        .from('league_teams')
        .select('id, name, credits')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teamError) {
        console.error('❌ loadStanding: Error loading team:', teamError);
      }
      teamData = data;
    }

    if (!teamData) {
      console.log('⚠️ loadStanding: No team found');
      setStanding(null);
      return;
    }

    console.log('✅ loadStanding: Team found:', teamData.name);

    // Get league standing data
    const { data: leagueData } = await supabase
      .from('championship_standings')
      .select('*')
      .eq('team_id', teamData.id)
      .maybeSingle();

    if (leagueData) {
      setStanding({
        id: leagueData.id,
        user_id: user.id,
        team_id: teamData.id,
        team_name: teamData.name,
        total_points: leagueData.points || 0,
        matches_won: leagueData.wins || 0,
        matches_drawn: 0,
        matches_lost: leagueData.losses || 0,
        budget_remaining: teamData.credits,
        created_at: leagueData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    } else {
      console.log('📊 Creating initial championship_standings record');
      const { data: newStanding, error: createError } = await supabase
        .from('championship_standings')
        .insert({
          team_id: teamData.id,
          points: 0,
          wins: 0,
          losses: 0,
          played: 0,
          total_points_scored: 0,
          rank: 0,
          season: '2026'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating standing:', createError);
      }

      setStanding({
        id: newStanding?.id || teamData.id,
        user_id: user.id,
        team_id: teamData.id,
        team_name: teamData.name,
        total_points: 0,
        matches_won: 0,
        matches_drawn: 0,
        matches_lost: 0,
        budget_remaining: teamData.credits,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }
  };

  const initializeStanding = async (teamName: string) => {
    if (!user) return;

    // Create team in league_teams
    const { data, error } = await supabase
      .from('league_teams')
      .insert({
        user_id: user.id,
        name: teamName,
        credits: 1000
      })
      .select()
      .single();

    if (!error && data) {
      await loadStanding();
    }
  };

  const addPlayerToSquad = async (playerId: string, auctionPrice: number): Promise<boolean> => {
    if (!user) return false;

    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    if (auctionPrice < 1 || auctionPrice > 1000) {
      alert('Auction price must be between 1 and 1000 credits!');
      return false;
    }

    const atpCount = mySquad.filter(s => s.player?.category === 'ATP').length;
    const wtaCount = mySquad.filter(s => s.player?.category === 'WTA').length;

    if (player.category === 'ATP' && atpCount >= 10) {
      alert('You already have 10 ATP players!');
      return false;
    }

    if (player.category === 'WTA' && wtaCount >= 10) {
      alert('You already have 10 WTA players!');
      return false;
    }

    const totalCost = mySquad.reduce((sum, s) => sum + s.auction_price, 0);
    if (totalCost + auctionPrice > 1000) {
      alert('Not enough budget!');
      return false;
    }

    // Get user's team
    const { data: teamData } = await supabase
      .from('league_teams')
      .select('id, credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!teamData) {
      alert('Team not found!');
      return false;
    }

    if (auctionPrice > teamData.credits) {
      alert('Not enough budget!');
      return false;
    }

    // Add player to team_players
    const { error } = await supabase
      .from('team_players')
      .insert({
        team_id: teamData.id,
        player_id: playerId,
        auction_price: auctionPrice
      });

    if (!error) {
      // Update team credits
      await supabase
        .from('league_teams')
        .update({ credits: teamData.credits - auctionPrice })
        .eq('id', teamData.id);

      await refreshSquad();
      await loadStanding();
      return true;
    }

    return false;
  };

  const removePlayerFromSquad = async (playerId: string): Promise<boolean> => {
    if (!user) return false;

    // Get user's team
    const { data: teamData } = await supabase
      .from('league_teams')
      .select('id, credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!teamData) return false;

    // Get the player's auction price before deleting
    const { data: playerData } = await supabase
      .from('team_players')
      .select('auction_price')
      .eq('team_id', teamData.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (!playerData) return false;

    // Delete from team_players
    const { error } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamData.id)
      .eq('player_id', playerId);

    if (!error) {
      // Return credits to team
      await supabase
        .from('league_teams')
        .update({ credits: teamData.credits + playerData.auction_price })
        .eq('id', teamData.id);

      await refreshSquad();
      await loadStanding();
      return true;
    }

    return false;
  };

  const generateMockRoster = async (providedTeamId?: string) => {
    console.log('🎲 Generating mock roster...');

    let teamId: string;

    if (providedTeamId) {
      teamId = providedTeamId;
      console.log('📋 Using provided team ID:', teamId);
    } else {
      if (!user) {
        alert('You must be logged in to generate a mock roster');
        return;
      }

      console.log('👤 Generating for user:', user.id);

      let teamData = await supabase
        .from('league_teams')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamData.data) {
        console.log('🔨 Creating team for user...');
        const { data: newTeam, error: createError } = await supabase
          .from('league_teams')
          .insert({
            user_id: user.id,
            name: 'Test Squad',
            credits: 1000
          })
          .select()
          .single();

        if (createError || !newTeam) {
          console.error('❌ Error creating team:', createError);
          alert('Failed to create team: ' + createError?.message);
          return;
        }
        teamData.data = newTeam;
        console.log('✅ Team created:', newTeam.id);
      }

      teamId = teamData.data.id;
    }

    // Get team details including current credits
    const { data: teamData } = await supabase
      .from('league_teams')
      .select('credits, name')
      .eq('id', teamId)
      .single();

    if (!teamData) {
      alert('Team not found');
      return;
    }

    console.log(`📊 Team ${teamData.name} has ${teamData.credits} credits`);

    // Clear existing players and reset credits
    console.log('🧹 Clearing existing players...');
    await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId);

    await supabase
      .from('league_teams')
      .update({ credits: 1000 })
      .eq('id', teamId);

    let currentCredits = 1000;

    // Get ALL already owned players across ALL teams
    console.log('🔒 Fetching already owned players...');
    const { data: ownedPlayers } = await supabase
      .from('team_players')
      .select('player_id');

    const ownedPlayerIds = new Set((ownedPlayers || []).map(tp => tp.player_id));
    console.log(`🔒 ${ownedPlayerIds.size} players are already owned by other teams`);

    // Get 10 ATP players - excluding owned ones
    console.log('🔍 Fetching available ATP players...');
    const { data: allAtpPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'ATP')
      .order('fixed_ranking');

    const availableAtpPlayers = (allAtpPlayers || []).filter(p => !ownedPlayerIds.has(p.id));
    console.log(`✅ ${availableAtpPlayers.length} ATP players available`);

    if (availableAtpPlayers.length < 10) {
      alert(`Not enough available ATP players (need 10, found ${availableAtpPlayers.length})`);
      return;
    }

    // Get 10 WTA players - excluding owned ones
    console.log('🔍 Fetching available WTA players...');
    const { data: allWtaPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'WTA')
      .order('fixed_ranking');

    const availableWtaPlayers = (allWtaPlayers || []).filter(p => !ownedPlayerIds.has(p.id));
    console.log(`✅ ${availableWtaPlayers.length} WTA players available`);

    if (availableWtaPlayers.length < 10) {
      alert(`Not enough available WTA players (need 10, found ${availableWtaPlayers.length})`);
      return;
    }

    // Select 10 ATP players - shuffle and take first 10 to ensure uniqueness
    const shuffledAtp = [...availableAtpPlayers].sort(() => Math.random() - 0.5);
    const selectedAtp = shuffledAtp.slice(0, 10);

    // Select 10 WTA players - shuffle and take first 10 to ensure uniqueness
    const shuffledWta = [...availableWtaPlayers].sort(() => Math.random() - 0.5);
    const selectedWta = shuffledWta.slice(0, 10);

    let allSelectedPlayers = [...selectedAtp, ...selectedWta];
    console.log(`💾 Inserting ${allSelectedPlayers.length} players into team...`);

    let successCount = 0;
    let attemptedPlayerIds = new Set<string>();
    const addedPlayerIds = new Set<string>();

    // Keep trying until we have exactly 20 players or run out of options
    while (successCount < 20) {
      // Find next player to try
      const player = allSelectedPlayers.find(p => !attemptedPlayerIds.has(p.id));

      if (!player) {
        console.log('🔄 Need more players, fetching additional options...');

        // Need more ATP players?
        const needAtpCount = 10 - Array.from(addedPlayerIds).filter(id =>
          selectedAtp.find(p => p.id === id)
        ).length;

        const needWtaCount = 10 - Array.from(addedPlayerIds).filter(id =>
          selectedWta.find(p => p.id === id)
        ).length;

        if (needAtpCount > 0) {
          const moreAtp = availableAtpPlayers
            .filter(p => !attemptedPlayerIds.has(p.id))
            .slice(0, needAtpCount);
          allSelectedPlayers.push(...moreAtp);
        }

        if (needWtaCount > 0) {
          const moreWta = availableWtaPlayers
            .filter(p => !attemptedPlayerIds.has(p.id))
            .slice(0, needWtaCount);
          allSelectedPlayers.push(...moreWta);
        }

        if (allSelectedPlayers.filter(p => !attemptedPlayerIds.has(p.id)).length === 0) {
          console.error('❌ No more players available to try');
          break;
        }
        continue;
      }

      attemptedPlayerIds.add(player.id);
      const auctionPrice = Math.floor(Math.random() * 40) + 10;

      if (currentCredits < auctionPrice) {
        console.warn(`⚠️ Not enough credits for ${player.first_name} ${player.last_name}`);
        continue;
      }

      const { error } = await supabase
        .from('team_players')
        .insert({
          team_id: teamId,
          player_id: player.id,
          auction_price: auctionPrice
        });

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          console.warn(`⚠️ ${player.first_name} ${player.last_name} already owned, trying another...`);
        } else {
          console.error(`❌ Failed to add ${player.first_name} ${player.last_name}:`, error.message);
        }
      } else {
        currentCredits -= auctionPrice;
        await supabase
          .from('league_teams')
          .update({ credits: currentCredits })
          .eq('id', teamId);

        addedPlayerIds.add(player.id);
        console.log(`✅ Added ${player.first_name} ${player.last_name} for ${auctionPrice} credits (${currentCredits} remaining)`);
        successCount++;
      }
    }

    console.log(`🎉 Roster generation complete: ${successCount} players added`);

    if (successCount < 20) {
      alert(`⚠️ Only ${successCount}/20 players were added. Not enough available players.`);
    } else {
      alert(`✅ Mock roster generated! 20 players added to squad.`);
    }

    await refreshSquad();
    await loadStanding();
  };

  const generateAllMockRosters = async () => {
    console.log('🚀 Generating mock rosters for ALL teams...');

    // Get all teams in the league
    const { data: allTeams, error: teamsError } = await supabase
      .from('league_teams')
      .select('id, name');

    if (teamsError || !allTeams) {
      console.error('❌ Error fetching teams:', teamsError);
      alert('Failed to fetch teams: ' + teamsError?.message);
      return;
    }

    if (allTeams.length === 0) {
      alert('No teams found in the league. Create teams first!');
      return;
    }

    console.log(`📋 Found ${allTeams.length} teams to populate`);

    // Clear ALL existing team players first
    console.log('🧹 Clearing all existing team rosters...');
    await supabase.from('team_players').delete().neq('team_id', '00000000-0000-0000-0000-000000000000');

    // Reset all team credits to 1000
    console.log('💰 Resetting all team credits to 1000...');
    await supabase.from('league_teams').update({ credits: 1000 }).neq('id', '00000000-0000-0000-0000-000000000000');

    // Get all available players
    const { data: allAtpPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'ATP')
      .order('fixed_ranking');

    const { data: allWtaPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'WTA')
      .order('fixed_ranking');

    if (!allAtpPlayers || allAtpPlayers.length < 10 * allTeams.length) {
      alert(`Not enough ATP players (need ${10 * allTeams.length}, have ${allAtpPlayers?.length || 0})`);
      return;
    }

    if (!allWtaPlayers || allWtaPlayers.length < 10 * allTeams.length) {
      alert(`Not enough WTA players (need ${10 * allTeams.length}, have ${allWtaPlayers?.length || 0})`);
      return;
    }

    // Shuffle all players to randomize distribution
    const shuffledAtpPlayers = [...allAtpPlayers].sort(() => Math.random() - 0.5);
    const shuffledWtaPlayers = [...allWtaPlayers].sort(() => Math.random() - 0.5);

    // Track globally owned players across all teams
    const globalOwnedPlayerIds = new Set<string>();

    let successCount = 0;
    let failCount = 0;

    // Process each team sequentially
    for (const team of allTeams) {
      console.log(`🎲 Generating roster for team: ${team.name} (${team.id})`);

      let teamCredits = 1000;
      let teamSuccessCount = 0;

      // Get available ATP players (not yet owned globally)
      const availableAtp = shuffledAtpPlayers.filter(p => !globalOwnedPlayerIds.has(p.id));

      // Get available WTA players (not yet owned globally)
      const availableWta = shuffledWtaPlayers.filter(p => !globalOwnedPlayerIds.has(p.id));

      console.log(`  📊 Available: ${availableAtp.length} ATP, ${availableWta.length} WTA`);

      if (availableAtp.length < 10) {
        console.error(`❌ Not enough available ATP players for ${team.name}`);
        failCount++;
        continue;
      }

      if (availableWta.length < 10) {
        console.error(`❌ Not enough available WTA players for ${team.name}`);
        failCount++;
        continue;
      }

      // Select 10 ATP players
      const selectedAtp = availableAtp.slice(0, 10);

      // Select 10 WTA players
      const selectedWta = availableWta.slice(0, 10);

      const allSelectedPlayers = [...selectedAtp, ...selectedWta];

      // Insert players one by one with retry logic
      for (const player of allSelectedPlayers) {
        const auctionPrice = Math.floor(Math.random() * 40) + 10;

        if (teamCredits < auctionPrice) {
          console.warn(`  ⚠️ Not enough credits for ${player.first_name} ${player.last_name}`);
          continue;
        }

        const { error } = await supabase
          .from('team_players')
          .insert({
            team_id: team.id,
            player_id: player.id,
            auction_price: auctionPrice
          });

        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            console.warn(`  ⚠️ ${player.first_name} ${player.last_name} already owned (conflict)`);
          } else {
            console.error(`  ❌ Failed to add ${player.first_name} ${player.last_name}:`, error.message);
          }
        } else {
          teamCredits -= auctionPrice;
          globalOwnedPlayerIds.add(player.id);
          teamSuccessCount++;
        }
      }

      // Update team credits in database
      await supabase
        .from('league_teams')
        .update({ credits: teamCredits })
        .eq('id', team.id);

      if (teamSuccessCount === 20) {
        console.log(`✅ Team ${team.name} populated with 20 players (${teamCredits} credits remaining)`);
        successCount++;
      } else {
        console.error(`❌ Team ${team.name} only got ${teamSuccessCount}/20 players`);
        failCount++;
      }
    }

    console.log(`🎉 Roster generation complete: ${successCount} teams populated, ${failCount} failed`);
    alert(`✅ Mock rosters generated!\n\n${successCount} teams populated successfully${failCount > 0 ? `\n${failCount} teams failed` : ''}`);

    // Refresh squad if current user has a team
    await refreshSquad();
    await loadStanding();
  };

  const budgetRemaining = standing?.budget_remaining ?? 1000;
  const isAdmin = isDevelopmentMode && user?.id === MOCK_ADMIN_USER.id;

  const setImpersonatedTeam = (teamId: string | null) => {
    setImpersonatedTeamId(teamId);
    if (teamId) {
      console.log('👤 Switching to team:', teamId);
      refreshSquad();
      loadStanding();
    }
  };

  useEffect(() => {
    if (impersonatedTeamId) {
      refreshSquad();
      loadStanding();
    }
  }, [impersonatedTeamId]);

  return (
    <FantasyContext.Provider
      value={{
        user,
        players,
        mySquad,
        currentTournament,
        standing,
        budgetRemaining,
        loading,
        impersonatedTeamId,
        isAdmin,
        refreshSquad,
        refreshPlayers,
        refreshTournament,
        addPlayerToSquad,
        removePlayerFromSquad,
        initializeStanding,
        generateMockRoster,
        generateAllMockRosters,
        setImpersonatedTeam,
      }}
    >
      {children}
    </FantasyContext.Provider>
  );
};

export const useFantasy = () => {
  const context = useContext(FantasyContext);
  if (context === undefined) {
    throw new Error('useFantasy must be used within a FantasyProvider');
  }
  return context;
};
