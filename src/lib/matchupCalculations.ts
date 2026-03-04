import { supabase } from './supabase';

interface PlayerInLineup {
  player_id: string;
  is_reserve: boolean;
  slot_position: number;
}

interface PlayerWithPoints {
  id: string;
  name: string;
  tour: 'ATP' | 'WTA';
  points: number;
}

export async function calculateMatchupH2H(
  tournamentId: string,
  matchupId: string
): Promise<{
  homeScore: number;
  awayScore: number;
  homeChampionshipPoints: number;
  awayChampionshipPoints: number;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
}> {
  // Get matchup details
  const { data: matchup } = await supabase
    .from('matchups')
    .select('home_team_id, away_team_id')
    .eq('id', matchupId)
    .single();

  if (!matchup) throw new Error('Matchup not found');

  // Get lineups for both teams
  const { data: homeLineup } = await supabase
    .from('team_lineups')
    .select('player_ids')
    .eq('team_id', matchup.home_team_id)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  const { data: awayLineup } = await supabase
    .from('team_lineups')
    .select('player_ids')
    .eq('team_id', matchup.away_team_id)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  if (!homeLineup || !awayLineup) {
    throw new Error('Lineups not found for one or both teams');
  }

  // Parse lineups (assuming format: {starters: [...], reserves: [...]})
  const homeStarters = (homeLineup.player_ids as any)?.starters || [];
  const homeReserves = (homeLineup.player_ids as any)?.reserves || [];
  const awayStarters = (awayLineup.player_ids as any)?.starters || [];
  const awayReserves = (awayLineup.player_ids as any)?.reserves || [];

  // Get player points for this tournament
  const allPlayerIds = [
    ...homeStarters,
    ...homeReserves,
    ...awayStarters,
    ...awayReserves,
  ];

  const { data: playerPoints } = await supabase
    .from('player_tournament_points')
    .select('player_id, points')
    .eq('tournament_id', tournamentId)
    .in('player_id', allPlayerIds);

  const pointsMap = new Map(
    (playerPoints || []).map((p) => [p.player_id, p.points])
  );

  // Get player details for tour (ATP/WTA)
  const { data: players } = await supabase
    .from('players')
    .select('id, name, tour')
    .in('id', allPlayerIds);

  const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

  // Auto-substitute: replace 0-point starters with non-zero reserves
  function applyAutoSub(starters: string[], reserves: string[]): string[] {
    const finalLineup = [...starters];

    for (let i = 0; i < finalLineup.length; i++) {
      const starterPoints = pointsMap.get(finalLineup[i]) || 0;

      if (starterPoints === 0) {
        // Find a reserve with non-zero points
        for (const reserveId of reserves) {
          const reservePoints = pointsMap.get(reserveId) || 0;
          if (reservePoints > 0) {
            finalLineup[i] = reserveId;
            break;
          }
        }
      }
    }

    return finalLineup;
  }

  const homeFinalLineup = applyAutoSub(homeStarters, homeReserves);
  const awayFinalLineup = applyAutoSub(awayStarters, awayReserves);

  // Calculate head-to-head duels
  let homeScore = 0;
  let awayScore = 0;
  let homeWins = 0;
  let homeDraws = 0;
  let homeLosses = 0;
  let awayWins = 0;
  let awayDraws = 0;
  let awayLosses = 0;

  for (let i = 0; i < Math.min(homeFinalLineup.length, awayFinalLineup.length); i++) {
    const homePlayerPoints = pointsMap.get(homeFinalLineup[i]) || 0;
    const awayPlayerPoints = pointsMap.get(awayFinalLineup[i]) || 0;

    if (homePlayerPoints > awayPlayerPoints) {
      homeScore += 3;
      homeWins++;
      awayLosses++;
    } else if (awayPlayerPoints > homePlayerPoints) {
      awayScore += 3;
      awayWins++;
      homeLosses++;
    } else {
      homeScore += 1;
      awayScore += 1;
      homeDraws++;
      awayDraws++;
    }
  }

  // Determine championship points based on total score
  let homeChampionshipPoints = 0;
  let awayChampionshipPoints = 0;

  if (homeScore > awayScore) {
    homeChampionshipPoints = 3;
    awayChampionshipPoints = 0;
  } else if (awayScore > homeScore) {
    homeChampionshipPoints = 0;
    awayChampionshipPoints = 3;
  } else {
    homeChampionshipPoints = 1;
    awayChampionshipPoints = 1;
  }

  return {
    homeScore,
    awayScore,
    homeChampionshipPoints,
    awayChampionshipPoints,
    homeWins,
    homeDraws,
    homeLosses,
    awayWins,
    awayDraws,
    awayLosses,
  };
}

export async function calculateAllMatchupsForTournament(
  tournamentId: string
): Promise<void> {
  const { data: matchups } = await supabase
    .from('matchups')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (!matchups || matchups.length === 0) {
    throw new Error('No matchups found for this tournament');
  }

  for (const matchup of matchups) {
    const result = await calculateMatchupH2H(tournamentId, matchup.id);

    await supabase
      .from('matchups')
      .update({
        home_score: result.homeScore,
        away_score: result.awayScore,
        home_championship_points: result.homeChampionshipPoints,
        away_championship_points: result.awayChampionshipPoints,
        home_wins: result.homeWins,
        home_draws: result.homeDraws,
        home_losses: result.homeLosses,
        away_wins: result.awayWins,
        away_draws: result.awayDraws,
        away_losses: result.awayLosses,
        is_completed: true,
      })
      .eq('id', matchup.id);
  }
}

export async function getTeamOpponentsInTournament(
  teamId: string,
  tournamentId: string
): Promise<Array<{
  opponent_id: string;
  opponent_name: string;
  matchup_id: string;
  is_home: boolean;
  my_score: number;
  opponent_score: number;
  my_championship_points: number;
  is_completed: boolean;
}>> {
  const { data, error } = await supabase.rpc('get_team_opponents_in_tournament', {
    p_team_id: teamId,
    p_tournament_id: tournamentId,
  });

  if (error) {
    console.error('Error fetching team opponents:', error);
    return [];
  }

  return data || [];
}
