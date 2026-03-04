import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Funzione per calcolare il prezzo basato sul ranking
function calculatePrice(ranking) {
  if (ranking <= 10) return 150;
  if (ranking <= 20) return 120;
  if (ranking <= 30) return 100;
  if (ranking <= 50) return 70;
  if (ranking <= 75) return 50;
  if (ranking <= 100) return 30;
  if (ranking <= 125) return 15;
  return 5;
}

// Funzione per selezionare giocatori in modo equilibrato
function selectBalancedPlayers(players, count, maxBudget) {
  const sorted = [...players].sort((a, b) => a.ranking - b.ranking);
  const selected = [];
  let remainingBudget = maxBudget;

  // Strategia: mix di top, middle e low ranked players
  const topCount = Math.floor(count * 0.2); // 20% top players
  const midCount = Math.floor(count * 0.5); // 50% mid players
  const lowCount = count - topCount - midCount; // 30% low players

  // Dividi i giocatori in categorie
  const topTier = sorted.slice(0, 30);
  const midTier = sorted.slice(30, 100);
  const lowTier = sorted.slice(100);

  // Shuffle function
  const shuffle = (arr) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Seleziona giocatori da ogni tier
  const shuffledTop = shuffle(topTier);
  const shuffledMid = shuffle(midTier);
  const shuffledLow = shuffle(lowTier);

  // Aggiungi top players
  for (let i = 0; i < topCount && i < shuffledTop.length; i++) {
    const player = shuffledTop[i];
    const price = calculatePrice(player.ranking);
    if (remainingBudget - price >= (count - selected.length - 1) * 5) {
      selected.push({ player, price });
      remainingBudget -= price;
    }
  }

  // Aggiungi mid players
  for (let i = 0; i < midCount && i < shuffledMid.length; i++) {
    const player = shuffledMid[i];
    const price = calculatePrice(player.ranking);
    if (remainingBudget - price >= (count - selected.length - 1) * 5) {
      selected.push({ player, price });
      remainingBudget -= price;
    }
  }

  // Aggiungi low players per completare
  for (let i = 0; i < shuffledLow.length && selected.length < count; i++) {
    const player = shuffledLow[i];
    const price = calculatePrice(player.ranking);
    if (remainingBudget - price >= (count - selected.length - 1) * 5) {
      selected.push({ player, price });
      remainingBudget -= price;
    }
  }

  return selected;
}

async function populateTeams() {
  try {
    console.log('🚀 Starting team population...\n');

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('league_teams')
      .select('id, name, credits');

    if (teamsError) throw teamsError;

    console.log(`Found ${teams.length} teams\n`);

    // Get all players from database
    const { data: dbPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, tour, ranking, price');

    if (playersError) throw playersError;

    console.log(`Found ${dbPlayers.length} players in database\n`);

    // Separa ATP e WTA
    const atpPlayers = dbPlayers.filter(p => p.tour === 'ATP');
    const wtaPlayers = dbPlayers.filter(p => p.tour === 'WTA');

    console.log(`ATP Players: ${atpPlayers.length}`);
    console.log(`WTA Players: ${wtaPlayers.length}\n`);

    // Traccia giocatori già assegnati
    const usedAtpIds = new Set();
    const usedWtaIds = new Set();

    // Popola ogni team
    for (const team of teams) {
      console.log(`\n📋 Processing ${team.name}...`);

      // Filtra giocatori disponibili
      const availableAtp = atpPlayers.filter(p => !usedAtpIds.has(p.id));
      const availableWta = wtaPlayers.filter(p => !usedWtaIds.has(p.id));

      if (availableAtp.length < 10 || availableWta.length < 10) {
        console.log(`⚠️  Not enough players available for ${team.name}`);
        continue;
      }

      // Seleziona 10 ATP e 10 WTA in modo bilanciato
      const selectedAtp = selectBalancedPlayers(availableAtp, 10, 500);
      const selectedWta = selectBalancedPlayers(availableWta, 10, 500);

      // Calcola totale speso
      const totalSpent = [...selectedAtp, ...selectedWta].reduce((sum, s) => sum + s.price, 0);
      const remainingCredits = 1000 - totalSpent;

      console.log(`  Selected ${selectedAtp.length} ATP + ${selectedWta.length} WTA players`);
      console.log(`  Total cost: ${totalSpent} credits`);
      console.log(`  Remaining: ${remainingCredits} credits`);

      // Inserisci i giocatori nel team
      const playersToInsert = [...selectedAtp, ...selectedWta].map(({ player, price }) => ({
        team_id: team.id,
        player_id: player.id,
        auction_price: price
      }));

      const { error: insertError } = await supabase
        .from('team_players')
        .insert(playersToInsert);

      if (insertError) {
        console.error(`  ❌ Error inserting players: ${insertError.message}`);
        continue;
      }

      // Aggiorna crediti del team
      const { error: updateError } = await supabase
        .from('league_teams')
        .update({ credits: remainingCredits })
        .eq('id', team.id);

      if (updateError) {
        console.error(`  ❌ Error updating credits: ${updateError.message}`);
        continue;
      }

      // Marca giocatori come usati
      selectedAtp.forEach(s => usedAtpIds.add(s.player.id));
      selectedWta.forEach(s => usedWtaIds.add(s.player.id));

      console.log(`  ✅ ${team.name} populated successfully!`);

      // Mostra i top 3 players
      const allSelected = [...selectedAtp, ...selectedWta].sort((a, b) => a.player.ranking - b.player.ranking);
      console.log(`  Top 3: ${allSelected.slice(0, 3).map(s => `${s.player.name} (${s.player.ranking})`).join(', ')}`);
    }

    console.log('\n\n✨ Team population completed!\n');

    // Mostra riepilogo
    const { data: finalTeams } = await supabase
      .from('league_teams')
      .select(`
        name,
        credits,
        team_players (
          id
        )
      `);

    console.log('📊 FINAL SUMMARY:');
    finalTeams?.forEach(team => {
      console.log(`  ${team.name}: ${team.team_players?.length || 0} players, ${team.credits} credits remaining`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

populateTeams();
