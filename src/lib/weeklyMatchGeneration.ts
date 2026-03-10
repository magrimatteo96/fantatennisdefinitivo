import { supabase } from './supabase';

export async function generateWeeklyMatches(tournamentId: string, teamId: string): Promise<boolean> {
  try {
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('weight, tournament_name')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      console.error('Error fetching tournament:', tournamentError);
      return false;
    }

    const { data: existingMatchups, error: existingError } = await supabase
      .from('matchups')
      .select('id')
      .eq('tournament_id', tournamentId)
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
      .limit(1);

    if (existingError) {
      console.error('Error checking existing matchups:', existingError);
      return false;
    }

    if (existingMatchups && existingMatchups.length > 0) {
      console.log('Matchups already exist for this tournament and team');
      return true;
    }

    const { data: allTeams, error: teamsError } = await supabase
      .from('league_teams')
      .select('id, name')
      .neq('id', teamId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return false;
    }

    if (!allTeams || allTeams.length === 0) {
      console.log('No other teams available for matchups');
      return false;
    }

    const matchupsToCreate = tournament.weight;
    const shuffledTeams = [...allTeams].sort(() => Math.random() - 0.5);
    const opponentTeams = shuffledTeams.slice(0, matchupsToCreate);

    const matchupsData = opponentTeams.map((opponent, index) => ({
      tournament_id: tournamentId,
      team_a_id: teamId,
      team_b_id: opponent.id,
      is_completed: false,
      team_a_score: 0,
      team_b_score: 0,
      team_a_championship_points: 0,
      team_b_championship_points: 0
    }));

    const { error: insertError } = await supabase
      .from('matchups')
      .insert(matchupsData);

    if (insertError) {
      console.error('Error creating matchups:', insertError);
      return false;
    }

    console.log(`✅ Created ${matchupsData.length} matchups for tournament ${tournament.tournament_name}`);
    return true;
  } catch (error) {
    console.error('Error in generateWeeklyMatches:', error);
    return false;
  }
}

export async function generateMatchupsForAllTeams(tournamentId: string): Promise<boolean> {
  try {
    console.log('🚀 generateMatchupsForAllTeams: START');
    console.log('📋 Tournament ID:', tournamentId);

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('opponents_count, name')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      console.error('❌ Error fetching tournament:', tournamentError);
      return false;
    }

    const opponentsCount = tournament.opponents_count || 1;
    console.log('✅ Tournament loaded:', tournament.name, 'Opponents:', opponentsCount);

    const { data: allTeams, error: teamsError } = await supabase
      .from('league_teams')
      .select('id, name');

    if (teamsError || !allTeams || allTeams.length === 0) {
      console.error('❌ Error fetching teams or no teams found:', teamsError);
      return false;
    }

    console.log('✅ Loaded', allTeams.length, 'teams');

    console.log('🧹 Deleting existing matchups for tournament...');
    const { error: deleteError } = await supabase
      .from('matchups')
      .delete()
      .eq('tournament_id', tournamentId);

    if (deleteError) {
      console.error('⚠️ Error deleting existing matchups:', deleteError);
    } else {
      console.log('✅ Old matchups cleared');
    }

    const matchupsToCreate: any[] = [];
    const usedPairs = new Set<string>();

    for (const team of allTeams) {
      const matchdayId = crypto.randomUUID();

      const otherTeams = allTeams.filter(t => t.id !== team.id);
      const shuffledOpponents = [...otherTeams].sort(() => Math.random() - 0.5);
      const selectedOpponents = shuffledOpponents.slice(0, opponentsCount);

      console.log(`  🎯 Team ${team.name}: ${selectedOpponents.length} opponents`);

      for (const opponent of selectedOpponents) {
        const pairKey1 = `${team.id}_${opponent.id}`;
        const pairKey2 = `${opponent.id}_${team.id}`;

        if (!usedPairs.has(pairKey1) && !usedPairs.has(pairKey2)) {
          matchupsToCreate.push({
            tournament_id: tournamentId,
            matchday_id: matchdayId,
            home_team_id: team.id,
            away_team_id: opponent.id,
            is_completed: false,
            home_score: 0,
            away_score: 0
          });

          usedPairs.add(pairKey1);
          usedPairs.add(pairKey2);
        }
      }
    }

    console.log(`💾 Preparing to insert ${matchupsToCreate.length} matchups...`);

    if (matchupsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('matchups')
        .insert(matchupsToCreate);

      if (insertError) {
        console.error('❌ Error creating matchups:', insertError);
        return false;
      }

      console.log(`✅ SUCCESS! Created ${matchupsToCreate.length} matchups`);
      return true;
    } else {
      console.log('⚠️ No matchups to create');
      return true;
    }
  } catch (error) {
    console.error('Error in generateMatchupsForAllTeams:', error);
    return false;
  }
}
