import { supabase } from './supabase';

interface LineupPlayer {
  id: string;
  points: number;
}

export async function calculateMatchResult(
  matchupId: string,
  homeTeamId: string,
  awayTeamId: string,
  tournamentId: string
): Promise<{ homeScore: number; awayScore: number }> {
  const { data: homeLineup } = await supabase
    .from('team_lineups')
    .select('player_ids')
    .eq('team_id', homeTeamId)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  const { data: awayLineup } = await supabase
    .from('team_lineups')
    .select('player_ids')
    .eq('team_id', awayTeamId)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  if (!homeLineup || !awayLineup) {
    return { homeScore: 0, awayScore: 0 };
  }

  const homePlayers = homeLineup.player_ids as string[];
  const awayPlayers = awayLineup.player_ids as string[];

  const { data: playerResults } = await supabase
    .from('matchday_results')
    .select('player_id, atp_points_earned')
    .eq('tournament_id', tournamentId);

  const playerPointsMap = new Map(
    playerResults?.map(r => [r.player_id, r.atp_points_earned || 0]) || []
  );

  let homeScore = 0;
  let awayScore = 0;

  const maxSlots = Math.max(homePlayers.length, awayPlayers.length);

  for (let i = 0; i < maxSlots; i++) {
    const homePlayerId = homePlayers[i] || null;
    const awayPlayerId = awayPlayers[i] || null;

    const homePoints = homePlayerId ? playerPointsMap.get(homePlayerId) || 0 : 0;
    const awayPoints = awayPlayerId ? playerPointsMap.get(awayPlayerId) || 0 : 0;

    let homeSlotPoints = 0;
    let awaySlotPoints = 0;

    if (homePoints > awayPoints) {
      homeSlotPoints = 3;
    } else if (awayPoints > homePoints) {
      awaySlotPoints = 3;
    } else if (homePoints === awayPoints && homePoints > 0) {
      homeSlotPoints = 1;
      awaySlotPoints = 1;
    }

    homeScore += homeSlotPoints;
    awayScore += awaySlotPoints;

    await supabase.from('match_results').insert({
      matchup_id: matchupId,
      position: i + 1,
      home_player_id: homePlayerId,
      away_player_id: awayPlayerId,
      home_points: homeSlotPoints,
      away_points: awaySlotPoints,
    });
  }

  await supabase
    .from('matchups')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      is_completed: true,
    })
    .eq('id', matchupId);

  return { homeScore, awayScore };
}

export async function calculateAllMatchesForTournament(tournamentId: string) {
  const { data: matchups } = await supabase
    .from('matchups')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('is_completed', false);

  if (!matchups) return;

  for (const matchup of matchups) {
    await calculateMatchResult(
      matchup.id,
      matchup.home_team_id,
      matchup.away_team_id,
      tournamentId
    );
  }
}

export async function getLeagueStandings() {
  const { data: teams } = await supabase
    .from('league_teams')
    .select('id, name');

  if (!teams) return [];

  const standings = await Promise.all(
    teams.map(async (team) => {
      const { data: homeMatches } = await supabase
        .from('matchups')
        .select('home_score, away_score, is_completed')
        .eq('home_team_id', team.id)
        .eq('is_completed', true);

      const { data: awayMatches } = await supabase
        .from('matchups')
        .select('home_score, away_score, is_completed')
        .eq('away_team_id', team.id)
        .eq('is_completed', true);

      let points = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;

      homeMatches?.forEach(match => {
        if (match.home_score > match.away_score) {
          wins++;
          points += 3;
        } else if (match.home_score === match.away_score) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      });

      awayMatches?.forEach(match => {
        if (match.away_score > match.home_score) {
          wins++;
          points += 3;
        } else if (match.home_score === match.away_score) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      });

      return {
        team_name: team.name,
        points,
        wins,
        draws,
        losses,
        matches_played: wins + draws + losses,
      };
    })
  );

  return standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
}
