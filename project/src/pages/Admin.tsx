import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Calendar, Calculator, RefreshCw, Users, Award, Upload, CircleUser as UserCircle, CreditCard as Edit2, Trash2, Plus, X, Save, Shield, Target } from 'lucide-react';
import { calculateAllMatchupsForTournament } from '../lib/matchupCalculations';
import GlobalMatchdaysManager from '../components/GlobalMatchdaysManager';
import { useFantasy } from '../context/FantasyContext';

interface Player {
  id: string;
  name: string;
  tour: 'ATP' | 'WTA';
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
type SuperAdminTab = 'matchdays' | 'playerslist' | 'playerpoints' | 'bulkupload';
type LeagueTab = 'setup' | 'matchups';

export default function Admin() {
  const { generateMockRoster, generateAllMockRosters } = useFantasy();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState<boolean>(false);

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
  const [playerForm, setPlayerForm] = useState({ name: '', tour: 'ATP' as 'ATP' | 'WTA', ranking: 1, price: 50 });

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
      .order('round_number', { ascending: true });

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
      .select('id, name, tour, total_points, ranking, price')
      .order('name', { ascending: true });

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
          (p) => p.name.toLowerCase() === playerName.toLowerCase()
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

  const handleGenerateMatchups = async () => {
    const teamCount = teams.length;

    if (teamCount < 4 || teamCount % 2 !== 0) {
      alert(`La lega deve avere un numero pari di squadre (4, 6, 8, 10). Attualmente ci sono ${teamCount} squadre.`);
      return;
    }

    if (!confirm(`Genera gli scontri diretti per tutte le 30 giornate?\n\nLa lega ha ${teamCount} squadre.\nGli abbinamenti seguiranno il sistema Round-Robin:\n\n• SLAM: 3 avversari per squadra\n• Master 1000: 2 avversari per squadra\n• 250/500: 1 avversario per squadra`)) {
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('generate_all_matchups');

      if (error) throw error;

      const totalMatchups = result?.reduce((sum: number, r: any) => sum + r.matchups_generated, 0) || 0;

      let message = `✅ Scontri generati per ${result?.length || 0} giornate!\n\n`;
      message += `Totale matchup: ${totalMatchups}\n\n`;
      message += `La lega con ${teamCount} squadre è pronta!`;

      alert(message);
      await loadTournaments();
    } catch (error) {
      alert(`Errore generazione matchup: ${(error as Error).message}`);
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
        await generateMockRoster(team.id);
      }
      alert('✅ Roster di test generati per tutte le squadre!');
      await loadTeams();
    } catch (error) {
      alert('Errore generazione roster test');
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
    if (!playerForm.name.trim()) {
      alert('Inserisci il nome del giocatore');
      return;
    }

    try {
      setLoading(true);
      await supabase.from('players').insert([
        {
          name: playerForm.name.trim(),
          tour: playerForm.tour,
          ranking: playerForm.ranking,
          price: playerForm.price,
          total_points: 0
        }
      ]);

      alert('✅ Giocatore aggiunto!');
      setShowAddModal(false);
      setPlayerForm({ name: '', tour: 'ATP', ranking: 1, price: 50 });
      await loadPlayers();
    } catch (error) {
      alert('Errore aggiunta giocatore');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = async () => {
    if (!selectedPlayer || !playerForm.name.trim()) return;

    try {
      setLoading(true);
      await supabase
        .from('players')
        .update({
          name: playerForm.name.trim(),
          tour: playerForm.tour,
          ranking: playerForm.ranking,
          price: playerForm.price
        })
        .eq('id', selectedPlayer.id);

      alert('✅ Giocatore aggiornato!');
      setShowEditModal(false);
      setSelectedPlayer(null);
      setPlayerForm({ name: '', tour: 'ATP', ranking: 1, price: 50 });
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
      name: player.name,
      tour: player.tour,
      ranking: player.ranking || 1,
      price: player.price || 50
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (player: Player) => {
    setSelectedPlayer(player);
    setShowDeleteModal(true);
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
                          <td className="px-4 py-3 text-white">{player.name}</td>
                          <td className="px-4 py-3 text-gray-300">{player.tour}</td>
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
                        Round {t.round_number}: {t.name}
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
                            <td className="px-4 py-3 text-white">{player.name}</td>
                            <td className="px-4 py-3 text-gray-300">{player.tour}</td>
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
                        Round {t.round_number}: {t.name}
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
                    Sistema Round-Robin Dinamico: supporta leghe da 4, 6, 8 o 10 squadre.
                    Gli scontri vengono generati automaticamente per tutte le 30 giornate rispettando il peso dei tornei.
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
                    onClick={handleCalculateAllResults}
                    disabled={calculating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                  >
                    <Calculator className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                    Calcola Risultati Tutte le Giornate
                  </button>
                </div>

                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">Come Funziona</h3>
                  <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                    <li>SLAM (es. Australian Open): ogni squadra affronta 3 avversari</li>
                    <li>Master 1000: ogni squadra affronta 2 avversari</li>
                    <li>ATP 250/500: ogni squadra affronta 1 avversario</li>
                    <li>Il sistema funziona con qualsiasi numero pari di squadre (4-10)</li>
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
                Questi strumenti servono solo per il testing e il reset dei dati durante lo sviluppo.
                Non utilizzare in produzione.
              </p>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Testing Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await generateAllMockRosters();
                        await loadTeams();
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Generate Mock Rosters for ALL Teams
                  </button>

                  <button
                    onClick={handleResetLeague}
                    disabled={loading}
                    className="px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Reset League (Clear All Rosters)
                  </button>
                </div>

                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">Info</h4>
                  <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                    <li>Generate ALL: Popola automaticamente tutte le squadre della lega con 20 giocatori casuali ciascuna (10 ATP + 10 WTA)</li>
                    <li>Reset League: Cancella tutti i roster e ricomincia da zero</li>
                    <li>Usa questi strumenti solo durante il testing</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestione Squadre Individuali
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Reset singola squadra senza toccare le altre. Utile per testare salvataggi e assegnazioni.
                </p>

                {teams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna squadra registrata
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <div>
                          <div className="font-semibold text-white">{team.name}</div>
                          <div className="text-sm text-gray-400">{team.credits} crediti</div>
                        </div>
                        <button
                          onClick={() => handleResetSingleTeam(team.id, team.name)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center gap-2 font-semibold text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Reset Roster
                        </button>
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
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tour</label>
                <select
                  value={playerForm.tour}
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
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tour</label>
                <select
                  value={playerForm.tour}
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
              Sei sicuro di voler eliminare <span className="font-bold text-white">{selectedPlayer.name}</span>?
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
