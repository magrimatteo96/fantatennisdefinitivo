import { supabase } from './supabase';

export interface MatchupGenerationResult {
  round_number: number;
  matchups_generated: number;
}

export async function generateMatchupsForTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('generate_round_robin_matchups', {
    p_tournament_id: tournamentId
  });

  if (error) {
    throw new Error(`Failed to generate matchups: ${error.message}`);
  }
}

export async function generateAllMatchups(): Promise<MatchupGenerationResult[]> {
  const { data, error } = await supabase.rpc('generate_all_matchups');

  if (error) {
    throw new Error(`Failed to generate all matchups: ${error.message}`);
  }

  return data || [];
}

export async function getTournamentMatchups(tournamentId: string) {
  const { data, error } = await supabase
    .from('matchups')
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      is_completed,
      home_team:league_teams!home_team_id(id, name),
      away_team:league_teams!away_team_id(id, name)
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at');

  if (error) {
    throw new Error(`Failed to fetch matchups: ${error.message}`);
  }

  return data;
}

export async function getTeamMatchupsForTournament(teamId: string, tournamentId: string) {
  const { data, error } = await supabase
    .from('matchups')
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      is_completed,
      home_team:league_teams!home_team_id(id, name),
      away_team:league_teams!away_team_id(id, name)
    `)
    .eq('tournament_id', tournamentId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('created_at');

  if (error) {
    throw new Error(`Failed to fetch team matchups: ${error.message}`);
  }

  return data;
}

export function getMatchupTypeLabel(opponentsCount: number): string {
  switch (opponentsCount) {
    case 3:
      return 'SLAM (Verde)';
    case 2:
      return 'Master 1000 (Giallo)';
    case 1:
      return '250/500 (Rosso)';
    default:
      return 'Unknown';
  }
}

export function getExpectedMatchCount(opponentsCount: number, totalTeams: number = 8): number {
  return (totalTeams * opponentsCount) / 2;
}
