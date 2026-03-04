import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, Award, Calendar } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  tour: string;
  ranking: number;
  total_points: number;
}

interface MatchResult {
  tournament_id: string;
  points: number;
  tournament: {
    name: string;
    type: string;
    week: number;
  };
}

interface PlayerStats extends Player {
  results: MatchResult[];
  totalFantasyPoints: number;
  tournamentsPlayed: number;
  avgPoints: number;
}

export default function PlayerStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerStats(selectedPlayer);
    }
  }, [selectedPlayer]);

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('tour, ranking');

    if (data) {
      setPlayers(data);
    }
  };

  const loadPlayerStats = async (playerId: string) => {
    setLoading(true);
    try {
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      const { data: results } = await supabase
        .from('matchday_results')
        .select(`
          tournament_id,
          points,
          tournament:tournaments(name, type, week)
        `)
        .eq('player_id', playerId)
        .order('tournament_id', { ascending: false });

      if (player) {
        const totalFantasyPoints = results?.reduce((sum, r) => sum + r.points, 0) || 0;
        const tournamentsPlayed = results?.length || 0;
        const avgPoints = tournamentsPlayed > 0 ? Math.round(totalFantasyPoints / tournamentsPlayed) : 0;

        setPlayerStats({
          ...player,
          results: results || [],
          totalFantasyPoints,
          tournamentsPlayed,
          avgPoints,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Player Statistics</h1>
        <p className="text-gray-600">View detailed performance statistics for all players</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Search Player</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type player name..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Player</label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a player...</option>
            {filteredPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.tour} #{p.ranking})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {!loading && playerStats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{playerStats.name}</h2>
                <p className="text-gray-600">{playerStats.tour} Tour • Ranking #{playerStats.ranking}</p>
              </div>
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Fantasy Points</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{playerStats.totalFantasyPoints}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Tournaments Played</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{playerStats.tournamentsPlayed}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Average Points</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{playerStats.avgPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Tournament History</h3>

            {playerStats.results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tournament results recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {playerStats.results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold">{result.tournament.name}</h4>
                      <p className="text-sm text-gray-600">
                        {result.tournament.type} • Week {result.tournament.week}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{result.points}</p>
                      <p className="text-xs text-gray-500">fantasy points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !selectedPlayer && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a player to view their statistics</p>
        </div>
      )}
    </div>
  );
}
