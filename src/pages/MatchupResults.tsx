import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Award, TrendingUp } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  round_number: number;
  type: string;
}

interface Matchup {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  home_championship_points: number;
  away_championship_points: number;
  atp_bonus_winner: string | null;
  wta_bonus_winner: string | null;
  home_atp_total: number;
  away_atp_total: number;
  home_wta_total: number;
  away_wta_total: number;
  is_completed: boolean;
}

export default function MatchupResults() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadMatchups();
    }
  }, [selectedTournament]);

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

  const loadMatchups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matchups')
      .select(`*, home_team:teams!matchups_home_team_id_fkey(name), away_team:teams!matchups_away_team_id_fkey(name)`)
      .eq('tournament_id', selectedTournament);

    if (data) {
      const formattedMatchups = data.map((m: any) => ({
        id: m.id,
        home_team_name: m.home_team.name,
        away_team_name: m.away_team.name,
        home_score: m.home_score,
        away_score: m.away_score,
        home_championship_points: m.home_championship_points,
        away_championship_points: m.away_championship_points,
        atp_bonus_winner: m.atp_bonus_winner,
        wta_bonus_winner: m.wta_bonus_winner,
        home_atp_total: m.home_atp_total,
        away_atp_total: m.away_atp_total,
        home_wta_total: m.home_wta_total,
        away_wta_total: m.away_wta_total,
        is_completed: m.is_completed,
      }));
      setMatchups(formattedMatchups);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Matchup Results</h1>
        <p className="text-gray-600">View detailed results including ATP/WTA bonuses</p>
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-2">Select Tournament</label>
        <select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              Round {t.round_number}: {t.name} ({t.type})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading matchups...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchups.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No matchups found for this tournament</p>
            </div>
          ) : (
            matchups.map((matchup) => (
              <div
                key={matchup.id}
                className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-8 border-4 ${
                  matchup.is_completed ? 'border-green-500' : 'border-slate-600'
                }`}
              >
                <div className="grid grid-cols-3 gap-6 items-center mb-6">
                  <div className="text-right">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl mb-3 border-4 border-blue-400">
                      {matchup.home_team_name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{matchup.home_team_name}</h3>
                    <div className="flex items-center justify-end gap-3">
                      <div className="bg-slate-700 rounded-lg px-6 py-3 border-2 border-slate-500">
                        <span className="text-4xl font-bold text-green-400">{matchup.home_score}</span>
                      </div>
                      {matchup.home_championship_points === 3 && (
                        <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-2 shadow-lg">
                      <span className="text-3xl font-black text-slate-900">VS</span>
                    </div>
                    {matchup.is_completed && (
                      <div className="mt-3 inline-block px-4 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                        COMPLETED
                      </div>
                    )}
                  </div>

                  <div className="text-left">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600 text-white font-bold text-2xl mb-3 border-4 border-red-400">
                      {matchup.away_team_name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{matchup.away_team_name}</h3>
                    <div className="flex items-center gap-3">
                      {matchup.away_championship_points === 3 && (
                        <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
                      )}
                      <div className="bg-slate-700 rounded-lg px-6 py-3 border-2 border-slate-500">
                        <span className="text-4xl font-bold text-green-400">{matchup.away_score}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {matchup.is_completed && (
                  <div className="border-t-4 border-slate-600 pt-6 mt-6">
                    <h4 className="font-bold text-lg text-yellow-400 mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Bonus Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-4 border-2 border-blue-600">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-5 h-5 text-blue-300" />
                          <span className="font-bold text-white">ATP Bonus</span>
                        </div>
                        <div className="space-y-2">
                          <div className={`flex justify-between text-sm p-2 rounded ${matchup.atp_bonus_winner === 'home' ? 'bg-green-600 font-bold' : 'bg-slate-800'}`}>
                            <span className="text-white">{matchup.home_team_name}</span>
                            <span className="text-white">
                              {matchup.home_atp_total}
                              {matchup.atp_bonus_winner === 'home' && ' 🏆 +3'}
                            </span>
                          </div>
                          <div className={`flex justify-between text-sm p-2 rounded ${matchup.atp_bonus_winner === 'away' ? 'bg-green-600 font-bold' : 'bg-slate-800'}`}>
                            <span className="text-white">{matchup.away_team_name}</span>
                            <span className="text-white">
                              {matchup.away_atp_total}
                              {matchup.atp_bonus_winner === 'away' && ' 🏆 +3'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-pink-900 to-fuchsia-800 rounded-xl p-4 border-2 border-pink-600">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-5 h-5 text-pink-300" />
                          <span className="font-bold text-white">WTA Bonus</span>
                        </div>
                        <div className="space-y-2">
                          <div className={`flex justify-between text-sm p-2 rounded ${matchup.wta_bonus_winner === 'home' ? 'bg-green-600 font-bold' : 'bg-slate-800'}`}>
                            <span className="text-white">{matchup.home_team_name}</span>
                            <span className="text-white">
                              {matchup.home_wta_total}
                              {matchup.wta_bonus_winner === 'home' && ' 🏆 +3'}
                            </span>
                          </div>
                          <div className={`flex justify-between text-sm p-2 rounded ${matchup.wta_bonus_winner === 'away' ? 'bg-green-600 font-bold' : 'bg-slate-800'}`}>
                            <span className="text-white">{matchup.away_team_name}</span>
                            <span className="text-white">
                              {matchup.away_wta_total}
                              {matchup.wta_bonus_winner === 'away' && ' 🏆 +3'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center justify-center gap-3 text-slate-900">
                        <TrendingUp className="w-6 h-6" />
                        <span className="font-bold text-lg">Championship Points:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-2xl">
                            {matchup.home_championship_points}
                          </span>
                          <span className="font-bold">-</span>
                          <span className="font-black text-2xl">
                            {matchup.away_championship_points}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
