import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Calendar, Calculator, RefreshCw, Users, Award, Upload, CircleUser as UserCircle, CreditCard as Edit2, Trash2, Plus, X, Save, Shield, Target } from 'lucide-react';
import { calculateAllMatchupsForTournament } from '../lib/matchupCalculations';
import GlobalMatchdaysManager from '../components/GlobalMatchdaysManager';
import { useFantasy } from '../context/FantasyContext';
import { generateBalancedCalendar, resetAllMatchups, BalancedGenerationResult } from '../lib/balancedMatchupGeneration';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  category: 'ATP' | 'WTA';
  total_points: number;
  ranking?: number;
  price: number;
}

interface Team {
  id: string;
  name: string;
  user_id: string | null;
  credits: number;
}

type MainSection = 'superadmin' | 'league' | 'devtools';
type SuperAdminTab = 'matchdays' | 'roundmanagement' | 'playerslist' | 'playerpoints' | 'bulkupload';
type LeagueTab = 'setup' | 'matchups';

export default function Admin() {
  const { generateMockRoster, generateAllMockRosters, setImpersonatedTeam, impersonatedTeamId, currentTournament, isAdmin } = useFantasy();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<BalancedGenerationResult | null>(null);

  const [mainSection, setMainSection] = useState<MainSection>('superadmin');
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('matchdays');
  const [leagueTab, setLeagueTab] = useState<LeagueTab>('setup');

  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [playerPoints, setPlayerPoints] = useState<Record<string, number>>({});
  const [bulkPointsText, setBulkPointsText] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState({ first_name: '', last_name: '', category: 'ATP' as 'ATP' | 'WTA', ranking: 1, price: 50 });

  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    loadPlayers();
    loadTeams();
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });

    if (data) {
      setTournaments(data);
      if (data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0].id);
      }
    }
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, category, total_points, ranking, price')
      .order('ranking', { ascending: true });

    if (error) {
      alert('Error loading players: ' + error.message);
      return;
    }

    if (data) {
      setPlayers(data);
      const points: Record<string, number> = {};
      data.forEach(player => {
        points[player.id] = player.total_points || 0;
      });
      setPlayerPoints(points);
    }
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from('league_teams')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setTeams(data);
    }
  };

  const loadPlayerPointsForTournament = async () => {
    if (!selectedTournament) return;

    const { data } = await supabase
      .from('player_tournament_points')
      .select('player_id, points')
      .eq('tournament_id', selectedTournament);

    if (data) {
      const points: Record<string, number> = {};
      data.forEach((p) => {
        points[p.player_id] = p.points;
      });
      setPlayerPoints(points);
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      loadPlayerPointsForTournament();
    }
  }, [selectedTournament]);

  const handleBulkPointsUpload = async () => {
    if (!selectedTournament) {
      alert('Please select a tournament first');
      return;
    }

    if (!bulkPointsText.trim()) {
      alert('Please enter player points data');
      return;
    }

    setLoading(true);
    try {
      const lines = bulkPointsText.trim().split('\n');
      const updates: Array<{ player_id: string; points: number }> = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const parts = trimmedLine.split(/[,:]/);
        if (parts.length < 2) continue;

        const playerName = parts[0].trim();
        const points = parseInt(parts[1].trim());

        if (isNaN(points)) continue;

        const player = players.find(
          (p) => `${p.first_name} ${p.last_name}`.toLowerCase() === playerName.toLowerCase()
        );

        if (player) {
          updates.push({ player_id: player.id, points });
        }
      }

      if (updates.length === 0) {
        alert('No valid player data found');
        return;
      }

      for (const update of updates) {
        await supabase.from('player_tournament_points').upsert(
          {
            player_id: update.player_id,
            tournament_id: selectedTournament,
            points: update.points,
          },
          { onConflict: 'player_id,tournament_id' }
        );
      }

      alert(`Successfully updated ${updates.length} player points!`);
      setBulkPointsText('');
      await loadPlayerPointsForTournament();
    } catch (error) {
      alert('Error uploading player points');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayerPoints = async (playerId: string, tournamentId: string) => {
    const points = playerPoints[playerId];
    if (points === undefined || points < 0) {
      alert('Invalid points value');
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('player_tournament_points')
        .upsert({
          player_id: playerId,
          tournament_id: tournamentId,
          points: points
        }, {
          onConflict: 'player_id,tournament_id'
        });

      const { data: allPoints } = await supabase
        .from('player_tournament_points')
        .select('points')
        .eq('player_id', playerId);

      const totalPoints = allPoints?.reduce((sum, p) => sum + p.points, 0) || 0;

      await supabase
        .from('players')
        .update({ current_points: totalPoints })
        .eq('id', playerId);

      await loadPlayers();
    } catch (error) {
      alert('Error updating player points');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCalendar = async () => {
    console.log('Funzione reset partita');

    if (!window.confirm('Sei sicuro di voler cancellare tutto il calendario?')) {
      console.log('Reset annullato dall\'utente');
      return;
    }

    setLoading(true);
    setGenerationResult(null);
    try {
      console.log('Inizio cancellazione matchups...');

      // Cancella tutti i matchups usando UUID corretto
      const { error } = await supabase
        .from('matchups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Errore durante la cancellazione:', error);
        throw error;
      }

      console.log('Matchups cancellati con successo');
      alert('Calendario resettato con successo!');
    } catch (error) {
      console.error('Errore completo:', error);
      alert(`Errore durante il reset: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMatchups = async () => {
    const teamCount = teams.length;

    if (teamCount < 4 || teamCount % 2 !== 0) {
      alert(`La lega deve avere un numero pari di squadre (4, 6, 8, 10). Attualmente ci sono ${teamCount} squadre.`);
      return;
    }

    if (!confirm(
      `🎾 GENERAZIONE CALENDARIO EQUILIBRATO\n\n` +
      `La lega ha ${teamCount} squadre.\n\n` +
      `Il sistema garantisce:\n` +
      `• SLAM: esattamente 3 match per squadra\n` +
      `• Master 1000: esattamente 2 match per squadra\n` +
      `• ATP 250/500: esattamente 1 match per squadra\n` +
      `• Equilibrio perfetto: ogni squadra affronta le altre lo stesso numero di volte\n\n` +
      `Procedere con la generazione?`
    )) {
      return;
    }

    setLoading(true);
    setGenerationResult(null);
    try {
      // First reset existing matchups
      await resetAllMatchups();

      // Generate new balanced calendar
      const result = await generateBalancedCalendar();
      setGenerationResult(result);

      // Show detailed summary
      let message = `✅ CALENDARIO GENERATO CON SUCCESSO!\n\n`;
      message += `📊 Statistiche Globali:\n`;
      message += `• Giornate processate: ${result.tournamentsProcessed}\n`;
      message += `• Matchup totali generati: ${result.totalMatchups}\n`;
      message += `• Squadre nella lega: ${teamCount}\n\n`;

      const slamRounds = result.stats.filter(s => s.opponentsCount === 3);
      const masterRounds = result.stats.filter(s => s.opponentsCount === 2);
      const regularRounds = result.stats.filter(s => s.opponentsCount === 1);

      message += `🏆 Giornate SLAM (${slamRounds.length}): ${slamRounds.reduce((sum, s) => sum + s.matchupsGenerated, 0)} matchup\n`;
      message += `   → Ogni squadra gioca 3 match per SLAM\n\n`;
      message += `⭐ Giornate Master 1000 (${masterRounds.length}): ${masterRounds.reduce((sum, s) => sum + s.matchupsGenerated, 0)} matchup\n`;
      message += `   → Ogni squadra gioca 2 match per Master\n\n`;
      message += `🎾 Giornate 250/500 (${regularRounds.length}): ${regularRounds.reduce((sum, s) => sum + s.matchupsGenerated, 0)} matchup\n`;
      message += `   → Ogni squadra gioca 1 match per 250/500\n\n`;

      message += `⚖️ ${result.balanceReport}`;

      alert(message);
      await loadTournaments();
    } catch (error) {
      alert(`❌ Errore generazione matchup: ${(error as Error).message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAllResults = async () => {
    if (!confirm('Calcolare i risultati di TUTTE le giornate? Questa operazione processerà tutti i matchup con i punteggi dei giocatori schierati.')) {
      return;
    }

    setCalculating(true);
    try {
      for (const tournament of tournaments) {
        await calculateAllMatchupsForTournament(tournament.id);
      }
      alert('✅ Risultati calcolati per tutte le giornate!');
      await loadTournaments();
    } catch (error) {
      alert('Errore calcolo risultati: ' + (error as Error).message);
    } finally {
      setCalculating(false);
    }
  };

  const handleResetLeague = async () => {
    const confirmation = prompt(
      'ATTENZIONE: Questa operazione cancellerà tutti i roster e resetterà i crediti a 1000.\n' +
      'Scrivi "RESET" per confermare:'
    );

    if (confirmation !== 'RESET') return;

    setLoading(true);
    try {
      await supabase.from('team_players').delete().neq('team_id', '00000000-0000-0000-0000-000000000000');

      await supabase
        .from('league_teams')
        .update({ credits: 1000 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      alert('✅ Lega resettata! Pronta per l\'asta.');
      await loadTeams();
    } catch (error) {
      alert('Errore reset lega');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSquad = async () => {
    if (!confirm('Generare un roster di test con 20 giocatori casuali per tutte le squadre? (10 ATP + 10 WTA)')) return;

    setLoading(true);
    try {
      for (const team of teams) {
        console.log('🎲 Generating roster for team:', team.name, 'ID:', team.id);
        if (!team.id || typeof team.id !== 'string') {
          console.error('❌ Invalid team ID:', team);
          throw new Error(`Invalid team ID for ${team.name}`);
        }
        await generateMockRoster(team.id);
      }
      alert('✅ Roster di test generati per tutte le squadre!');
      await loadTeams();
    } catch (error: any) {
      const errorMsg = `Errore generazione roster test: ${error.message}`;
      alert(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSingleTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Sei sicuro di voler svuotare la squadra "${teamName}"?\n\nQuesta operazione cancellerà tutti i 20 giocatori e resetterà i crediti a 1000.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete all players from this team
      await supabase
        .from('team_players')
        .delete()
        .eq('team_id', teamId);

      // Reset credits to 1000
      await supabase
        .from('league_teams')
        .update({ credits: 1000 })
        .eq('id', teamId);

      alert(`✅ Squadra "${teamName}" resettata con successo!`);
      await loadTeams();
    } catch (error) {
      alert('Errore nel reset della squadra');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!playerForm.first_name.trim() || !playerForm.last_name.trim()) {
      alert('Inserisci il nome e cognome del giocatore');
      return;
    }

    try {
      setLoading(true);
      await supabase.from('players').insert([
        {
          first_name: playerForm.first_name.trim(),
          last_name: playerForm.last_name.trim(),
          tour: playerForm.category,
          ranking: playerForm.ranking,
          price: playerForm.price,
          total_points: 0
        }
      ]);

      alert('✅ Giocatore aggiunto!');
      setShowAddModal(false);
      setPlayerForm({ first_name: '', last_name: '', category: 'ATP', ranking: 1, price: 50 });
      await loadPlayers();
    } catch (error) {
      alert('Errore aggiunta giocatore');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = async () => {
    if (!selectedPlayer || !playerForm.first_name.trim() || !playerForm.last_name.trim()) return;

    try {
      setLoading(true);
      await supabase
        .from('players')
        .update({
          first_name: playerForm.first_name.trim(),
          last_name: playerForm.last_name.trim(),
          tour: playerForm.category,
          ranking: playerForm.ranking,
          price: playerForm.price
        })
        .eq('id', selectedPlayer.id);

      alert('✅ Giocatore aggiornato!');
      setShowEditModal(false);
      setSelectedPlayer(null);
      setPlayerForm({ first_name: '', last_name: '', category: 'ATP', ranking: 1, price: 50 });
      await loadPlayers();
    } catch (error) {
      alert('Errore modifica giocatore');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;

    try {
      setLoading(true);
      await supabase
        .from('players')
        .delete()
        .eq('id', selectedPlayer.id);

      alert('✅ Giocatore eliminato!');
      setShowDeleteModal(false);
      setSelectedPlayer(null);
      await loadPlayers();
    } catch (error) {
      alert('Errore eliminazione giocatore');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setPlayerForm({
      first_name: player.first_name,
      last_name: player.last_name,
      tour: player.category,
      ranking: player.ranking || 1,
      price: player.price || 50
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (player: Player) => {
    setSelectedPlayer(player);
    setShowDeleteModal(true);
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`ATTENZIONE: Eliminare definitivamente la squadra "${teamName}"?\n\nQuesta operazione cancellerà:\n- La squadra\n- Tutti i giocatori nel roster\n- Tutte le formazioni salvate\n- Tutti i dati associati\n\nQuesta azione NON può essere annullata.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await supabase.from('team_lineups').delete().eq('team_id', teamId);
      await supabase.from('team_players').delete().eq('team_id', teamId);
      await supabase.from('championship_standings').delete().eq('team_id', teamId);

      const { error: deleteError } = await supabase
        .from('league_teams')
        .delete()
        .eq('id', teamId);

      if (deleteError) throw deleteError;

      alert(`Squadra "${teamName}" eliminata con successo!`);
      await loadTeams();
    } catch (err: any) {
      const errorMsg = `Errore eliminazione squadra: ${err.message}`;
      setError(errorMsg);
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestTeam = async () => {
    const teamName = prompt('Nome della nuova squadra test:');
    if (!teamName || !teamName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { data: newTeam, error: createError } = await supabase
        .from('league_teams')
        .insert({
          name: teamName.trim(),
          credits: 1000,
          user_id: null
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newTeam || !newTeam.id) throw new Error('Team creation failed - no ID returned');

      console.log('✅ Created team:', newTeam.name, 'with ID:', newTeam.id);
      await generateMockRoster(newTeam.id);

      alert(`Squadra "${teamName}" creata con 20 giocatori!`);
      await loadTeams();
    } catch (err: any) {
      const errorMsg = `Errore creazione squadra: ${err.message}`;
      setError(errorMsg);
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAutoLineup = async (teamId: string, teamName: string) => {
    if (!currentTournament) {
      alert('Nessun torneo attivo! Seleziona prima un torneo attivo.');
      return;
    }

    if (!confirm(`Generare una formazione automatica per "${teamName}"?\n\nTorneo: ${(currentTournament as any).tournament_name}\nSlot: ${(currentTournament as any).lineup_slots}`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: roster } = await supabase
        .from('team_players')
        .select('player_id, player:players(*)')
        .eq('team_id', teamId);

      if (!roster || roster.length < 20) {
        throw new Error(`La squadra deve avere almeno 20 giocatori. Trovati: ${roster?.length || 0}`);
      }

      const atpPlayers = roster.filter((p: any) => p.player?.category === 'ATP').map((p: any) => p.player_id);
      const wtaPlayers = roster.filter((p: any) => p.player?.category === 'WTA').map((p: any) => p.player_id);

      if (atpPlayers.length < 10 || wtaPlayers.length < 10) {
        throw new Error(`Serve un roster bilanciato: 10 ATP e 10 WTA. Trovati: ${atpPlayers.length} ATP, ${wtaPlayers.length} WTA`);
      }

      const singlesCount = Math.floor((currentTournament.lineup_slots - currentTournament.opponents_count) / 2);
      const doublesCount = currentTournament.opponents_count;

      const selectedAtpSingles = atpPlayers.sort(() => Math.random() - 0.5).slice(0, singlesCount);
      const selectedWtaSingles = wtaPlayers.sort(() => Math.random() - 0.5).slice(0, singlesCount);

      const remainingAtp = atpPlayers.filter(id => !selectedAtpSingles.includes(id));
      const remainingWta = wtaPlayers.filter(id => !selectedWtaSingles.includes(id));

      const doublesAtpPicks = remainingAtp.sort(() => Math.random() - 0.5).slice(0, doublesCount);
      const doublesWtaPicks = remainingWta.sort(() => Math.random() - 0.5).slice(0, doublesCount);

      const mixedDoubles = doublesAtpPicks.map((atpId, i) => ({
        atp: atpId,
        wta: doublesWtaPicks[i]
      }));

      const allSelectedIds = [
        ...selectedAtpSingles,
        ...selectedWtaSingles,
        ...doublesAtpPicks,
        ...doublesWtaPicks
      ];

      const captain = allSelectedIds[Math.floor(Math.random() * allSelectedIds.length)];

      await supabase
        .from('team_lineups')
        .delete()
        .eq('team_id', teamId)
        .eq('tournament_id', currentTournament.id);

      const { error: saveError } = await supabase
        .from('team_lineups')
        .insert({
          team_id: teamId,
          tournament_id: currentTournament.id,
          player_ids: {
            atpSingles: selectedAtpSingles,
            wtaSingles: selectedWtaSingles,
            mixedDoubles: mixedDoubles,
            captain: captain
          }
        });

      if (saveError) throw saveError;

      alert(`Formazione automatica generata per "${teamName}"!\n\n${singlesCount} ATP + ${singlesCount} WTA + ${doublesCount} Doppi Misti`);
    } catch (err: any) {
      const errorMsg = `Errore generazione lineup: ${err.message}`;
      setError(errorMsg);
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Gestione completa del database globale e della tua lega</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMainSection('superadmin')}
            className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              mainSection === 'superadmin'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Shield className="w-6 h-6" />
            SUPER ADMIN
            <span className="text-xs opacity-75">(Database Globale)</span>
          </button>
          <button
            onClick={() => setMainSection('league')}
            className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              mainSection === 'league'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Target className="w-6 h-6" />
            LEAGUE MANAGER
            <span className="text-xs opacity-75">(La Mia Lega)</span>
          </button>
          <button
            onClick={() => setMainSection('devtools')}
            className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              mainSection === 'devtools'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <RefreshCw className="w-6 h-6" />
            DEVELOPER TOOLS
            <span className="text-xs opacity-75">(Testing)</span>
          </button>
        </div>

        {mainSection === 'superadmin' && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSuperAdminTab('matchdays')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  superAdminTab === 'matchdays'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Global Matchdays (30)
              </button>
              <button
                onClick={() => setSuperAdminTab('roundmanagement')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  superAdminTab === 'roundmanagement'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Target className="w-4 h-4" />
                Gestione Turni
              </button>
              <button
                onClick={() => setSuperAdminTab('playerslist')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  superAdminTab === 'playerslist'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                Players List
              </button>
              <button
                onClick={() => setSuperAdminTab('playerpoints')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  superAdminTab === 'playerpoints'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Award className="w-4 h-4" />
                Player Points
              </button>
              <button
                onClick={() => setSuperAdminTab('bulkupload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  superAdminTab === 'bulkupload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
            </div>

            {superAdminTab === 'matchdays' && <GlobalMatchdaysManager />}

            {superAdminTab === 'roundmanagement' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5" />
                    Gestione Turni
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Chiudi il turno corrente per bloccare le formazioni e calcolare i risultati di tutti i match simultanei
                  </p>
                </div>

                {currentTournament ? (
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{currentTournament.name}</h3>
                          <p className="text-sm text-gray-400">
                            Turno {currentTournament.round_number} - {currentTournament.type}
                          </p>
                          <p className="text-sm text-gray-400">
                            Avversari: {currentTournament.opponents_count || 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentTournament.status === 'completed'
                              ? 'bg-green-600 text-white'
                              : currentTournament.status === 'active'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {currentTournament.status === 'completed' ? 'Completato' :
                             currentTournament.status === 'active' ? 'Attivo' : 'In arrivo'}
                          </span>
                        </div>
                      </div>

                      {currentTournament.start_date && (
                        <p className="text-sm text-gray-400">
                          Data inizio: {new Date(currentTournament.start_date).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>

                    {currentTournament.status !== 'completed' && (
                      <button
                        onClick={async () => {
                          if (!confirm('Sei sicuro di voler chiudere questo turno e calcolare i punti?')) return;

                          setLoading(true);
                          try {
                            const { error: statusError } = await supabase
                              .from('tournaments')
                              .update({ status: 'completed' })
                              .eq('id', currentTournament.id);

                            if (statusError) throw statusError;

                            await calculateAllMatchupsForTournament(currentTournament.id);

                            alert('Turno chiuso e punti calcolati con successo!');
                            window.location.reload();
                          } catch (err: any) {
                            console.error('Error closing round:', err);
                            alert('Errore nella chiusura del turno: ' + err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                      >
                        <Calculator className="w-5 h-5" />
                        {loading ? 'Chiusura in corso...' : 'Chiudi Turno e Calcola Punti'}
                      </button>
                    )}

                    {currentTournament.status === 'completed' && (
                      <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 text-center">
                        <p className="text-green-400 font-medium">
                          Questo turno è stato completato. I punti sono stati calcolati.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Nessun torneo attivo. Attiva un turno dalla sezione Global Matchdays.
                  </div>
                )}
              </div>
            )}

            {superAdminTab === 'playerslist' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCircle className="w-5 h-5" />
                    Lista Giocatori ({players.length})
                  </h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Nome</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tour</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Ranking</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Prezzo</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {players.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-white">{player.first_name} {player.last_name}</td>
                          <td className="px-4 py-3 text-gray-300">{player.category}</td>
                          <td className="px-4 py-3 text-gray-300">{player.ranking || '-'}</td>
                          <td className="px-4 py-3 text-gray-300">{player.price} cr</td>
                          <td className="px-4 py-3 text-center space-x-2">
                            <button
                              onClick={() => openEditModal(player)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                            >
                              <Edit2 className="w-3 h-3 inline" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(player)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm"
                            >
                              <Trash2 className="w-3 h-3 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {superAdminTab === 'playerpoints' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Punteggi Giocatori per Giornata
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Seleziona Giornata</label>
                  <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">-- Seleziona --</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tournament_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTournament && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Giocatore</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tour</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Punti</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {players.map((player) => (
                          <tr key={player.id} className="hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-white">{player.first_name} {player.last_name}</td>
                            <td className="px-4 py-3 text-gray-300">{player.category}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                value={playerPoints[player.id] || 0}
                                onChange={(e) =>
                                  setPlayerPoints({ ...playerPoints, [player.id]: parseInt(e.target.value) || 0 })
                                }
                                className="w-20 px-2 py-1 bg-gray-700 text-white rounded text-center"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleUpdatePlayerPoints(player.id, selectedTournament)}
                                disabled={loading}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm disabled:opacity-50"
                              >
                                <Save className="w-3 h-3 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {superAdminTab === 'bulkupload' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Caricamento Massivo Punti
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Seleziona Giornata</label>
                  <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">-- Seleziona --</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tournament_name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={bulkPointsText}
                  onChange={(e) => setBulkPointsText(e.target.value)}
                  placeholder="Nome Giocatore: Punti&#10;Es:&#10;Sinner, 100&#10;Alcaraz, 80"
                  className="w-full h-64 px-4 py-2 bg-gray-700 text-white rounded-lg font-mono text-sm"
                />

                <button
                  onClick={handleBulkPointsUpload}
                  disabled={loading || !selectedTournament}
                  className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Carica Punti
                </button>
              </div>
            )}
          </div>
        )}

        {mainSection === 'league' && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setLeagueTab('setup')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  leagueTab === 'setup'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Users className="w-4 h-4" />
                League Setup
              </button>
              <button
                onClick={() => setLeagueTab('matchups')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  leagueTab === 'matchups'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Trophy className="w-4 h-4" />
                League Matchups
              </button>
            </div>

            {leagueTab === 'setup' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Squadre Registrate ({teams.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teams.map((team) => (
                    <div key={team.id} className="p-4 bg-gray-700 rounded-lg">
                      <div className="font-semibold text-white">{team.name}</div>
                      <div className="text-sm text-gray-400">{team.credits} crediti</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {leagueTab === 'matchups' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Generazione Scontri Diretti
                </h2>

                <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6">
                  <p className="text-blue-300 text-sm">
                    <strong>Sistema Equilibrato:</strong> Ogni squadra gioca esattamente il numero di match previsto per ogni tipo di torneo.
                    L'algoritmo garantisce che ogni squadra affronti tutte le altre equamente nel corso delle 30 giornate.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleGenerateMatchups}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                  >
                    <Calendar className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Genera Calendario Matchup (30 Giornate)
                  </button>

                  <button
                    onClick={handleResetCalendar}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                  >
                    <Trash2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Resetta Calendario Matchup
                  </button>

                  <button
                    onClick={handleCalculateAllResults}
                    disabled={calculating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                  >
                    <Calculator className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                    Calcola Risultati Tutte le Giornate
                  </button>
                </div>

                {generationResult && (
                  <div className="mt-6 p-5 bg-green-900/30 border border-green-500 rounded-lg">
                    <h3 className="text-green-400 font-bold text-lg mb-3 flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Riepilogo Generazione
                    </h3>
                    <div className="space-y-2 text-gray-200 text-sm">
                      <p><strong>Giornate processate:</strong> {generationResult.tournamentsProcessed}</p>
                      <p><strong>Matchup totali:</strong> {generationResult.totalMatchups}</p>
                      <p><strong>Squadre nella lega:</strong> {teams.length}</p>

                      <div className="mt-3 pt-3 border-t border-green-500/30">
                        <p className="text-xs text-green-300 whitespace-pre-line">{generationResult.balanceReport}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">Regolamento Match</h3>
                  <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                    <li><strong>SLAM</strong> (es. Australian Open): ogni squadra gioca esattamente 3 match</li>
                    <li><strong>Master 1000</strong>: ogni squadra gioca esattamente 2 match</li>
                    <li><strong>ATP 250/500</strong>: ogni squadra gioca esattamente 1 match</li>
                    <li><strong>Equilibrio</strong>: ogni squadra affronterà tutte le altre lo stesso numero di volte (±1)</li>
                    <li>Il sistema supporta leghe con 4, 6, 8 o 10 squadre</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {mainSection === 'devtools' && (
          <div className="space-y-6">
            <div className="bg-orange-900/20 border-2 border-orange-500 rounded-lg p-6">
              <h2 className="text-xl font-bold text-orange-400 mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                DEVELOPER TOOLS
              </h2>
              <p className="text-orange-300 text-sm mb-6">
                Strumenti avanzati per testing, debug e simulazione. Gestisci squadre, genera formazioni automatiche e impersona utenti.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Impersonificazione Squadra
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Visualizza l'app dal punto di vista di una squadra specifica. Tutte le pagine (Dashboard, Mercato, Lineup) mostreranno i dati di quella squadra.
                </p>
                <select
                  value={impersonatedTeamId || ''}
                  onChange={(e) => setImpersonatedTeam(e.target.value || null)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border-2 border-blue-500"
                >
                  <option value="">🏠 Modalità Normale (La Mia Squadra)</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      👤 {team.name} ({team.credits} crediti)
                    </option>
                  ))}
                </select>
                {impersonatedTeamId && (
                  <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500 rounded-lg">
                    <p className="text-blue-300 text-sm font-semibold">
                      🎭 Modalità Impersonificazione Attiva
                    </p>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions (Admin Only)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={handleCreateTestTeam}
                      disabled={loading}
                      className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
                    >
                      <Plus className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      Crea Squadra Test + Roster
                    </button>

                    <button
                      onClick={async () => {
                        setLoading(true);
                        setError(null);
                        try {
                          await generateAllMockRosters();
                          await loadTeams();
                        } catch (err: any) {
                          setError(`Errore: ${err.message}`);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      Popola TUTTE le Squadre
                    </button>

                    <button
                      onClick={handleResetLeague}
                      disabled={loading}
                      className="px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Reset League Completo
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Guida Rapida</h4>
                    <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                      <li>Crea Squadra Test: Crea una nuova squadra con 20 giocatori casuali pre-assegnati</li>
                      <li>Popola TUTTE: Assegna 20 giocatori a tutte le squadre esistenti (10 ATP + 10 WTA)</li>
                      <li>Reset League: Cancella tutti i roster e ricomincia da zero</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Gestione Squadre ({teams.length})
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Gestisci, testa e simula le squadre della lega
                    </p>
                  </div>
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna squadra registrata
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white text-lg">{team.name}</div>
                            <div className="text-sm text-gray-400">{team.credits} crediti rimasti</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenerateAutoLineup(team.id, team.name)}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center gap-2 font-semibold text-sm"
                              title="Genera formazione automatica per il torneo attivo"
                            >
                              <Trophy className="w-4 h-4" />
                              Auto-Lineup
                            </button>
                            <button
                              onClick={() => handleResetSingleTeam(team.id, team.name)}
                              disabled={loading}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2 font-semibold text-sm"
                              title="Svuota roster e resetta crediti"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reset
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team.id, team.name)}
                              disabled={loading}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center gap-2 font-semibold text-sm"
                              title="Elimina definitivamente la squadra"
                            >
                              <Trash2 className="w-4 h-4" />
                              Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Aggiungi Giocatore</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={playerForm.first_name}
                  onChange={(e) => setPlayerForm({ ...playerForm, first_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  placeholder="Nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cognome</label>
                <input
                  type="text"
                  value={playerForm.last_name}
                  onChange={(e) => setPlayerForm({ ...playerForm, last_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  placeholder="Cognome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tour</label>
                <select
                  value={playerForm.category}
                  onChange={(e) => setPlayerForm({ ...playerForm, tour: e.target.value as 'ATP' | 'WTA' })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                >
                  <option value="ATP">ATP</option>
                  <option value="WTA">WTA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ranking</label>
                <input
                  type="number"
                  value={playerForm.ranking}
                  onChange={(e) => setPlayerForm({ ...playerForm, ranking: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prezzo</label>
                <input
                  type="number"
                  value={playerForm.price}
                  onChange={(e) => setPlayerForm({ ...playerForm, price: parseInt(e.target.value) || 50 })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <button
                onClick={handleAddPlayer}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Modifica Giocatore</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={playerForm.first_name}
                  onChange={(e) => setPlayerForm({ ...playerForm, first_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  placeholder="Nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cognome</label>
                <input
                  type="text"
                  value={playerForm.last_name}
                  onChange={(e) => setPlayerForm({ ...playerForm, last_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                  placeholder="Cognome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tour</label>
                <select
                  value={playerForm.category}
                  onChange={(e) => setPlayerForm({ ...playerForm, tour: e.target.value as 'ATP' | 'WTA' })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                >
                  <option value="ATP">ATP</option>
                  <option value="WTA">WTA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ranking</label>
                <input
                  type="number"
                  value={playerForm.ranking}
                  onChange={(e) => setPlayerForm({ ...playerForm, ranking: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prezzo</label>
                <input
                  type="number"
                  value={playerForm.price}
                  onChange={(e) => setPlayerForm({ ...playerForm, price: parseInt(e.target.value) || 50 })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <button
                onClick={handleEditPlayer}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Conferma Eliminazione</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              Sei sicuro di voler eliminare <span className="font-bold text-white">{selectedPlayer.first_name} {selectedPlayer.last_name}</span>?
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleDeletePlayer}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
