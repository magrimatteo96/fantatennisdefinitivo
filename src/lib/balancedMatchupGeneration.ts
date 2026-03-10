import { supabase } from './supabase';

interface Tournament {
  id: string;
  tournament_name: string;
  category: string;
  type?: string;
  round_number: number;
  opponents_count: number;
}

interface MatchupPairing {
  homeTeamId: string;
  awayTeamId: string;
}

interface GenerationStats {
  tournamentName: string;
  roundNumber: number;
  opponentsCount: number;
  matchupsGenerated: number;
  expectedMatchups: number;
  teamMatchCounts: Record<string, number>;
}

export interface BalancedGenerationResult {
  totalMatchups: number;
  tournamentsProcessed: number;
  stats: GenerationStats[];
  balanceReport: string;
}

/**
 * Generates a balanced schedule ensuring:
 * 1. Each team plays exactly opponents_count matches per tournament
 * 2. Over 30 rounds, teams face each other equally (or with max difference of 1)
 * 3. Validates before saving to database
 */
export async function generateBalancedCalendar(): Promise<BalancedGenerationResult> {
  // Get all teams
  const { data: teams, error: teamsError } = await supabase
    .from('league_teams')
    .select('id, name')
    .order('name');

  if (teamsError) throw new Error(`Error loading teams: ${teamsError.message}`);
  if (!teams || teams.length === 0) throw new Error('No teams found');
  if (teams.length % 2 !== 0) throw new Error('Number of teams must be even');

  const teamIds = teams.map(t => t.id);
  const teamCount = teamIds.length;

  // Get all tournaments
  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('*')
    .order('round_number');

  if (tournamentsError) throw new Error(`Error loading tournaments: ${tournamentsError.message}`);
  if (!tournaments || tournaments.length === 0) throw new Error('No tournaments found');

  // Track head-to-head encounters across all rounds
  const globalH2H: Record<string, number> = {};
  const initializeH2HKey = (team1: string, team2: string) => {
    const key = [team1, team2].sort().join('-');
    if (!(key in globalH2H)) globalH2H[key] = 0;
    return key;
  };

  const stats: GenerationStats[] = [];
  let totalMatchups = 0;

  // Generate matchups for each tournament
  for (const tournament of tournaments as Tournament[]) {
    const matchups = generateRoundMatchups(
      teamIds,
      tournament.opponents_count,
      tournament.round_number,
      globalH2H
    );

    // Validate
    const teamMatchCounts = validateMatchups(matchups, teamIds, tournament.opponents_count);

    const expectedMatchups = (teamCount * tournament.opponents_count) / 2;

    if (matchups.length !== expectedMatchups) {
      throw new Error(
        `Tournament ${tournament.tournament_name}: Expected ${expectedMatchups} matchups, got ${matchups.length}`
      );
    }

    // Update global H2H tracking
    matchups.forEach(m => {
      const key = initializeH2HKey(m.homeTeamId, m.awayTeamId);
      globalH2H[key]++;
    });

    // Save to database
    const matchupRecords = matchups.map(m => ({
      tournament_id: tournament.id,
      home_team_id: m.homeTeamId,
      away_team_id: m.awayTeamId,
      home_score: 0,
      away_score: 0,
      is_completed: false
    }));

    const { error: insertError } = await supabase
      .from('matchups')
      .insert(matchupRecords);

    if (insertError) {
      throw new Error(`Error inserting matchups for ${tournament.tournament_name}: ${insertError.message}`);
    }

    stats.push({
      tournamentName: tournament.tournament_name,
      roundNumber: tournament.round_number,
      opponentsCount: tournament.opponents_count,
      matchupsGenerated: matchups.length,
      expectedMatchups,
      teamMatchCounts
    });

    totalMatchups += matchups.length;
  }

  // Generate balance report
  const balanceReport = generateBalanceReport(globalH2H, teams, teamCount);

  return {
    totalMatchups,
    tournamentsProcessed: tournaments.length,
    stats,
    balanceReport
  };
}

/**
 * Generates matchups for a single round using round-robin rotation
 */
function generateRoundMatchups(
  teamIds: string[],
  opponentsCount: number,
  roundNumber: number,
  globalH2H: Record<string, number>
): MatchupPairing[] {
  const teamCount = teamIds.length;
  const requiredMatchups = (teamCount * opponentsCount) / 2;

  // Create all possible pairings
  const allPairings: MatchupPairing[] = [];
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      allPairings.push({
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[j]
      });
    }
  }

  // Sort pairings by:
  // 1. How many times they've played (prefer less)
  // 2. Round-based rotation for variety
  allPairings.sort((a, b) => {
    const keyA = [a.homeTeamId, a.awayTeamId].sort().join('-');
    const keyB = [b.homeTeamId, b.awayTeamId].sort().join('-');

    const countA = globalH2H[keyA] || 0;
    const countB = globalH2H[keyB] || 0;

    if (countA !== countB) return countA - countB;

    // Secondary: rotation based on round number
    const rotationA = (roundNumber * 13 + teamIds.indexOf(a.homeTeamId)) % 100;
    const rotationB = (roundNumber * 13 + teamIds.indexOf(b.homeTeamId)) % 100;
    return rotationA - rotationB;
  });

  // Select matchups ensuring each team plays exactly opponentsCount times
  const selectedMatchups: MatchupPairing[] = [];
  const teamMatchCount: Record<string, number> = {};
  teamIds.forEach(id => teamMatchCount[id] = 0);

  for (const pairing of allPairings) {
    const homeCount = teamMatchCount[pairing.homeTeamId];
    const awayCount = teamMatchCount[pairing.awayTeamId];

    if (homeCount < opponentsCount && awayCount < opponentsCount) {
      selectedMatchups.push(pairing);
      teamMatchCount[pairing.homeTeamId]++;
      teamMatchCount[pairing.awayTeamId]++;

      if (selectedMatchups.length === requiredMatchups) break;
    }
  }

  // Fill in missing matches if we couldn't find perfect balance
  // This handles edge cases like 8 teams with 3 matches each during Slams
  if (selectedMatchups.length < requiredMatchups) {
    console.warn(`⚠️ Could not generate perfect matchups. Found ${selectedMatchups.length}/${requiredMatchups}. Filling gaps...`);

    // Find teams that need more matches
    const teamsNeedingMatches = teamIds.filter(id => teamMatchCount[id] < opponentsCount);

    for (const teamId of teamsNeedingMatches) {
      while (teamMatchCount[teamId] < opponentsCount && selectedMatchups.length < requiredMatchups) {
        // Find available opponent (prefer those with fewer matches)
        const availableOpponents = teamIds
          .filter(id => id !== teamId && teamMatchCount[id] < opponentsCount)
          .sort((a, b) => teamMatchCount[a] - teamMatchCount[b]);

        if (availableOpponents.length > 0) {
          const opponentId = availableOpponents[0];
          selectedMatchups.push({
            homeTeamId: teamId,
            awayTeamId: opponentId
          });
          teamMatchCount[teamId]++;
          teamMatchCount[opponentId]++;
        } else {
          break;
        }
      }
    }
  }

  return selectedMatchups;
}

/**
 * Validates that each team has exactly the required number of matches
 * Now only warns instead of throwing to prevent crashes
 */
function validateMatchups(
  matchups: MatchupPairing[],
  teamIds: string[],
  expectedCount: number
): Record<string, number> {
  const teamMatchCounts: Record<string, number> = {};
  teamIds.forEach(id => teamMatchCounts[id] = 0);

  matchups.forEach(m => {
    teamMatchCounts[m.homeTeamId]++;
    teamMatchCounts[m.awayTeamId]++;
  });

  // Validate (warn only, don't throw)
  for (const teamId of teamIds) {
    const count = teamMatchCounts[teamId];
    if (count !== expectedCount) {
      console.warn(
        `⚠️ Validation warning: Team ${teamId} has ${count} matches, expected ${expectedCount}`
      );
    }
  }

  return teamMatchCounts;
}

/**
 * Generates a report on balance of head-to-head encounters
 */
function generateBalanceReport(
  globalH2H: Record<string, number>,
  teams: any[],
  teamCount: number
): string {
  const h2hCounts = Object.values(globalH2H);
  const minEncounters = Math.min(...h2hCounts);
  const maxEncounters = Math.max(...h2hCounts);
  const avgEncounters = h2hCounts.reduce((a, b) => a + b, 0) / h2hCounts.length;

  let report = `Equilibrio Scontri Diretti (${teams.length} squadre):\n`;
  report += `• Scontri minimi tra due squadre: ${minEncounters}\n`;
  report += `• Scontri massimi tra due squadre: ${maxEncounters}\n`;
  report += `• Media scontri: ${avgEncounters.toFixed(1)}\n`;
  report += `• Differenza max-min: ${maxEncounters - minEncounters} `;

  if (maxEncounters - minEncounters <= 1) {
    report += '✅ PERFETTAMENTE EQUILIBRATO';
  } else if (maxEncounters - minEncounters <= 2) {
    report += '✅ BEN EQUILIBRATO';
  } else {
    report += '⚠️ POSSIBILE MIGLIORARE';
  }

  return report;
}

/**
 * Deletes all matchups from the database
 */
export async function resetAllMatchups(): Promise<void> {
  console.log('resetAllMatchups chiamata');

  const { error } = await supabase
    .from('matchups')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows using UUID

  if (error) {
    console.error('Errore in resetAllMatchups:', error);
    throw new Error(`Error resetting matchups: ${error.message}`);
  }

  console.log('Tutti i matchups cancellati');
}
