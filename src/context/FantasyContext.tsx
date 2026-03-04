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
      console.log('✅ Torneo Attivo:', currentTournament.name);
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
      .order('tour')
      .order('ranking');

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
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading tournament:', error);
        return;
      }

      if (tournamentData) {
        console.log('✅ FOUND ACTIVE TOURNAMENT:', tournamentData.name);
        setCurrentTournament(tournamentData as any);

        if (isDevelopmentMode) {
          await autoGenerateMatchups(tournamentData.id);
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

    // Load from league_teams instead of standings
    const { data: teamData, error: teamError } = await supabase
      .from('league_teams')
      .select('id, name, credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (teamError) {
      console.error('❌ loadStanding: Error loading team:', teamError);
    }

    if (!teamData) {
      console.log('⚠️ loadStanding: No team found');
      setStanding(null);
      return;
    }

    console.log('✅ loadStanding: Team found:', teamData.name);

    // Get league standing data
    const { data: leagueData } = await supabase
      .from('league_standings')
      .select('*')
      .eq('team_id', teamData.id)
      .maybeSingle();

    if (leagueData) {
      setStanding({
        id: leagueData.id,
        user_id: user.id,
        team_id: teamData.id,
        team_name: teamData.name,
        total_points: leagueData.total_points,
        matches_won: leagueData.matches_won,
        matches_drawn: leagueData.matches_drawn,
        matches_lost: leagueData.matches_lost,
        budget_remaining: teamData.credits,
        created_at: leagueData.created_at || new Date().toISOString(),
        updated_at: leagueData.updated_at || new Date().toISOString(),
      } as any);
    } else {
      console.log('📊 Creating initial league_standings record');
      const { data: newStanding, error: createError } = await supabase
        .from('league_standings')
        .insert({
          team_id: teamData.id,
          total_points: 0,
          matches_won: 0,
          matches_drawn: 0,
          matches_lost: 0
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

    const atpCount = mySquad.filter(s => s.player?.tour === 'ATP').length;
    const wtaCount = mySquad.filter(s => s.player?.tour === 'WTA').length;

    if (player.tour === 'ATP' && atpCount >= 10) {
      alert('You already have 10 ATP players!');
      return false;
    }

    if (player.tour === 'WTA' && wtaCount >= 10) {
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
      // Team ID provided directly (from Admin panel)
      teamId = providedTeamId;
      console.log('📋 Using provided team ID:', teamId);
    } else {
      // No team ID provided, use logged-in user's team
      if (!user) {
        alert('You must be logged in to generate a mock roster');
        return;
      }

      console.log('👤 Generating for user:', user.id);

      // Get or create user's team
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

    // Clear existing players
    console.log('🧹 Clearing existing players...');
    await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId);

    // Get 10 ATP players - mix of high and low ranking
    console.log('🔍 Fetching ATP players...');
    const { data: allAtpPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'ATP')
      .order('fixed_ranking');

    if (!allAtpPlayers || allAtpPlayers.length < 10) {
      alert('Not enough ATP players in database');
      return;
    }

    // Select top 5 (ranking 1-5) and 5 random from lower rankings (50+)
    const topAtp = allAtpPlayers.slice(0, 5);
    const lowRankingAtp = allAtpPlayers.filter(p => (p.fixed_ranking || p.ranking) >= 50);
    const randomLowAtp = lowRankingAtp
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    const selectedAtp = [...topAtp, ...randomLowAtp];

    // Get 10 WTA players - mix of high and low ranking
    console.log('🔍 Fetching WTA players...');
    const { data: allWtaPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('tour', 'WTA')
      .order('fixed_ranking');

    if (!allWtaPlayers || allWtaPlayers.length < 10) {
      alert('Not enough WTA players in database');
      return;
    }

    // Select top 5 (ranking 1-5) and 5 random from lower rankings (50+)
    const topWta = allWtaPlayers.slice(0, 5);
    const lowRankingWta = allWtaPlayers.filter(p => (p.fixed_ranking || p.ranking) >= 50);
    const randomLowWta = lowRankingWta
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    const selectedWta = [...topWta, ...randomLowWta];

    // Insert all 20 players into team_players
    const allSelectedPlayers = [...selectedAtp, ...selectedWta];
    console.log('💾 Inserting 20 players into team...');

    const insertPromises = allSelectedPlayers.map(player =>
      supabase
        .from('team_players')
        .insert({
          team_id: teamId,
          player_id: player.id,
          auction_price: Math.floor(Math.random() * 50) + 10 // Random price 10-60
        })
    );

    const results = await Promise.all(insertPromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('❌ Errors inserting players:', errors);
      alert('Some players could not be added');
    } else {
      console.log('✅ All 20 players added successfully!');
      alert('✅ Mock roster generated! 20 players added to your squad.');
    }

    // Refresh squad to update UI
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

    if (!allAtpPlayers || allAtpPlayers.length < 10 || !allWtaPlayers || allWtaPlayers.length < 10) {
      alert('Not enough players in database (need at least 10 ATP and 10 WTA)');
      return;
    }

    // Create a pool of available players for each team
    const availableAtpPlayers = [...allAtpPlayers];
    const availableWtaPlayers = [...allWtaPlayers];

    let successCount = 0;
    let failCount = 0;

    // Process each team
    for (const team of allTeams) {
      console.log(`🎲 Generating roster for team: ${team.name} (${team.id})`);

      // Clear existing players for this team
      await supabase
        .from('team_players')
        .delete()
        .eq('team_id', team.id);

      // Select 10 ATP players randomly from available pool
      const selectedAtp = [];
      const atpPoolCopy = [...availableAtpPlayers].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(10, atpPoolCopy.length); i++) {
        selectedAtp.push(atpPoolCopy[i]);
      }

      // Select 10 WTA players randomly from available pool
      const selectedWta = [];
      const wtaPoolCopy = [...availableWtaPlayers].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(10, wtaPoolCopy.length); i++) {
        selectedWta.push(wtaPoolCopy[i]);
      }

      // Insert all 20 players
      const allSelectedPlayers = [...selectedAtp, ...selectedWta];
      const insertPromises = allSelectedPlayers.map(player =>
        supabase
          .from('team_players')
          .insert({
            team_id: team.id,
            player_id: player.id,
            auction_price: Math.floor(Math.random() * 50) + 10 // Random price 10-60
          })
      );

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error(`❌ Error populating team ${team.name}:`, errors);
        failCount++;
      } else {
        console.log(`✅ Team ${team.name} populated with 20 players`);
        successCount++;
      }
    }

    console.log(`🎉 Roster generation complete: ${successCount} teams populated, ${failCount} failed`);
    alert(`✅ Mock rosters generated!\n\n${successCount} teams populated successfully${failCount > 0 ? `\n${failCount} teams failed` : ''}`);

    // Refresh squad if current user has a team
    await refreshSquad();
    await loadStanding();
  };

  const budgetRemaining = standing?.budget_remaining ||
    (1000 - mySquad.reduce((sum, s) => sum + s.auction_price, 0));

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
