import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Save, Plus, Trash2, Play } from 'lucide-react';
import { calculateHeadToHeadMatch, generateRoundRobinMatches } from '../lib/matchCalculations';

interface Tournament {
  id: string;
  name: string;
  type: string;
  week: number;
  is_active: boolean;
}

interface Player {
  id: string;
  name: string;
  tour: string;
  ranking: number;
}

interface MatchResult {
  player_id: string;
  player_name: string;
  points: number;
}

export default function Results() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, []);

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('week', { ascending: false });

    if (data) {
      setTournaments(data);
    }
  };

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('tour, ranking');

    if (data) {
      setPlayers(data);
    }
  };

  const addResult = () => {
    setResults([...results, { player_id: '', player_name: '', points: 0 }]);
  };

  const updateResult = (index: number, field: 'player_id' | 'points', value: string | number) => {
    const newResults = [...results];
    if (field === 'player_id') {
      const player = players.find(p => p.id === value);
      newResults[index] = {
        ...newResults[index],
        player_id: value as string,
        player_name: player?.name || '',
      };
    } else {
      newResults[index] = { ...newResults[index], [field]: value };
    }
    setResults(newResults);
  };

  const removeResult = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const saveResults = async () => {
    if (!selectedTournament) {
      alert('Please select a tournament');
      return;
    }

    if (results.length === 0) {
      alert('Please add at least one result');
      return;
    }

    setLoading(true);
    try {
      const validResults = results.filter(r => r.player_id && r.points > 0);

      for (const result of validResults) {
        await supabase.from('matchday_results').upsert({
          tournament_id: selectedTournament,
          player_id: result.player_id,
          points: result.points,
        }, {
          onConflict: 'tournament_id,player_id',
        });
      }

      await calculateStandings(selectedTournament);

      alert('Results saved and standings updated successfully!');
      setResults([]);
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Error saving results');
    } finally {
      setLoading(false);
    }
  };

  const calculateStandings = async (tournamentId: string) => {
    const { data: lineups } = await supabase
      .from('lineups')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (!lineups || lineups.length === 0) {
      alert('No lineups found for this tournament');
      return;
    }

    const { data: matchResults } = await supabase
      .from('matchday_results')
      .select('*')
      .eq('tournament_id', tournamentId);

    const playerPoints = new Map(matchResults?.map(r => [r.player_id, r.points]) || []);

    const matches = generateRoundRobinMatches(lineups);

    const teamStats = new Map<string, { wins: number; draws: number; losses: number; points: number }>();

    lineups.forEach(lineup => {
      teamStats.set(lineup.user_id, { wins: 0, draws: 0, losses: 0, points: 0 });
    });

    for (const [homeLineup, awayLineup] of matches) {
      const matchResult = calculateHeadToHeadMatch(
        homeLineup,
        awayLineup,
        playerPoints,
        homeLineup.captain_player_id,
        awayLineup.captain_player_id
      );

      const homeStats = teamStats.get(matchResult.homeTeamId)!;
      const awayStats = teamStats.get(matchResult.awayTeamId)!;

      if (matchResult.homeMatchPoints > matchResult.awayMatchPoints) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (matchResult.awayMatchPoints > matchResult.homeMatchPoints) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        awayStats.draws++;
        homeStats.points += 1;
        awayStats.points += 1;
      }
    }

    for (const [userId, stats] of teamStats.entries()) {
      const { data: currentStanding } = await supabase
        .from('standings')
        .select('season_points, wins, draws, losses')
        .eq('user_id', userId)
        .single();

      await supabase
        .from('standings')
        .update({
          season_points: (currentStanding?.season_points || 0) + stats.points,
          wins: (currentStanding?.wins || 0) + stats.wins,
          draws: (currentStanding?.draws || 0) + stats.draws,
          losses: (currentStanding?.losses || 0) + stats.losses,
        })
        .eq('user_id', userId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Match Results</h1>
        <p className="text-gray-600">Enter player performance results for tournaments</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Tournament</label>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a tournament...</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                Week {t.week} - {t.name} ({t.type})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Player Results</h2>
          <button
            onClick={addResult}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Result
          </button>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No results added yet. Click "Add Result" to start.
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {results.map((result, index) => (
              <div key={index} className="flex gap-3 items-center">
                <select
                  value={result.player_id}
                  onChange={(e) => updateResult(index, 'player_id', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tour} #{p.ranking})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={result.points}
                  onChange={(e) => updateResult(index, 'points', parseInt(e.target.value) || 0)}
                  placeholder="Points"
                  className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={() => removeResult(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={saveResults}
          disabled={loading || !selectedTournament || results.length === 0}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Saving...' : 'Save Results & Update Standings'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-blue-600" />
          How Scoring Works
        </h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>Enter the fantasy points earned by each player in the tournament</li>
          <li>Points will be automatically assigned to teams that have that player in their lineup</li>
          <li>Captain earns double points automatically</li>
          <li>Team standings will be updated after saving</li>
        </ul>
      </div>
    </div>
  );
}
