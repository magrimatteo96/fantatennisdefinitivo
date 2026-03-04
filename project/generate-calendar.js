import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function generateCalendar() {
  console.log('🏆 Generating complete tournament calendar...\n');

  // Get all tournaments
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, round_number, name')
    .order('round_number', { ascending: true });

  // Get all teams
  const { data: teams } = await supabase
    .from('league_teams')
    .select('id, name')
    .order('name', { ascending: true });

  if (tournaments.length !== 27) {
    console.error(`❌ Expected 27 tournaments, found ${tournaments.length}`);
    return;
  }

  if (teams.length !== 8) {
    console.error(`❌ Expected 8 teams, found ${teams.length}`);
    return;
  }

  console.log(`✓ Found ${tournaments.length} tournaments`);
  console.log(`✓ Found ${teams.length} teams\n`);

  // Circle method for round-robin with 8 teams
  // We need 7 rounds to complete one cycle (each team plays each other once)
  // With 27 tournaments, we'll have 3 complete cycles + 6 extra rounds

  const matchups = [];

  for (let tournamentIdx = 0; tournamentIdx < tournaments.length; tournamentIdx++) {
    const tournament = tournaments[tournamentIdx];
    const roundInCycle = tournamentIdx % 7;

    // Create a copy of team indices [0,1,2,3,4,5,6,7]
    const indices = [0, 1, 2, 3, 4, 5, 6, 7];

    // Circle method: fix position 0, rotate others
    // For round N, team at position i plays team at position (8-1-i)
    const rotations = roundInCycle;

    // Apply rotations: keep first position fixed, rotate the rest
    for (let r = 0; r < rotations; r++) {
      const temp = indices[7];
      for (let i = 7; i > 1; i--) {
        indices[i] = indices[i - 1];
      }
      indices[1] = temp;
    }

    // Create 4 matches for this round
    // Match pairs: (0,7), (1,6), (2,5), (3,4)
    for (let matchIdx = 0; matchIdx < 4; matchIdx++) {
      const homeIdx = indices[matchIdx];
      const awayIdx = indices[7 - matchIdx];

      matchups.push({
        tournament_id: tournament.id,
        home_team_id: teams[homeIdx].id,
        away_team_id: teams[awayIdx].id,
        home_score: 0,
        away_score: 0,
        is_completed: false
      });
    }

    console.log(`Round ${tournament.round_number} (${tournament.name}):`);
    for (let matchIdx = 0; matchIdx < 4; matchIdx++) {
      const homeIdx = indices[matchIdx];
      const awayIdx = indices[7 - matchIdx];
      console.log(`  ${teams[homeIdx].name} vs ${teams[awayIdx].name}`);
    }
    console.log('');
  }

  console.log(`\n📅 Creating ${matchups.length} matchups...`);

  // Insert all matchups
  const { error } = await supabase
    .from('matchups')
    .insert(matchups);

  if (error) {
    console.error('❌ Error inserting matchups:', error);
    return;
  }

  console.log(`\n✅ Calendar created successfully!`);
  console.log(`   Total matchups: ${matchups.length}`);
  console.log(`   Expected: ${27 * 4} (27 tournaments × 4 matches)`);
}

generateCalendar().catch(console.error);
