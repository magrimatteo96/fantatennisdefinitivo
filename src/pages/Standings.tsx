import React, { useEffect, useState } from 'react';
import { BarChart3, Trophy, TrendingUp, Medal, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Standing {
  team_id: string;
  team_name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  matches_played: number;
  total_fanta_points: number;
}

export const Standings: React.FC = () => {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('championship_standings')
      .select(`
        team_id,
        points,
        wins,
        draws,
        losses,
        matches_played,
        total_fanta_points,
        league_teams!inner(name)
      `)
      .order('points', { ascending: false })
      .order('total_fanta_points', { ascending: false });

    if (data) {
      const formattedStandings = data.map((s: any) => ({
        team_id: s.team_id,
        team_name: s.league_teams.name,
        points: s.points,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        matches_played: s.matches_played,
        total_fanta_points: s.total_fanta_points,
      }));
      setStandings(formattedStandings);
    }
    setLoading(false);
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position === 2) return 'text-gray-400';
    if (position === 3) return 'text-amber-600';
    return 'text-slate-500';
  };

  const getMedalIcon = (position: number) => {
    if (position <= 3) return Medal;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center space-x-3">
          <BarChart3 className="w-10 h-10 text-[#ccff00]" />
          <span>Season Standings</span>
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ccff00] mx-auto"></div>
            <p className="text-slate-400 mt-4">Loading standings...</p>
          </div>
        ) : standings.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 border-2 border-slate-600 text-center">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Standings Yet</h2>
            <p className="text-slate-400">
              Standings will appear once managers create their teams and compete in tournaments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl border-2 border-slate-600 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 bg-slate-700 text-slate-300 font-bold text-sm">
                <div className="col-span-1 text-center">Pos</div>
                <div className="col-span-3">Team Name</div>
                <div className="col-span-1 text-center">MP</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">D</div>
                <div className="col-span-1 text-center">L</div>
                <div className="col-span-2 text-center">Pts</div>
                <div className="col-span-2 text-center">Fanta Pts</div>
              </div>

              {standings.map((standing, index) => {
                const position = index + 1;
                const MedalIcon = getMedalIcon(position);
                const isTopThree = position <= 3;

                return (
                  <div
                    key={standing.team_id}
                    className={`grid grid-cols-12 gap-4 p-4 border-t-2 border-slate-700 hover:bg-slate-750 transition-all ${
                      isTopThree ? 'bg-slate-750' : ''
                    }`}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      {MedalIcon ? (
                        <MedalIcon className={`w-6 h-6 ${getMedalColor(position)}`} />
                      ) : (
                        <span className="text-slate-400 font-bold">{position}</span>
                      )}
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className={`font-bold ${isTopThree ? 'text-[#ccff00]' : 'text-white'}`}>
                        {standing.team_name}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-slate-300">
                      {standing.matches_played}
                    </div>
                    <div className="col-span-1 text-center text-green-400 font-semibold">
                      {standing.wins}
                    </div>
                    <div className="col-span-1 text-center text-yellow-400 font-semibold">
                      {standing.draws}
                    </div>
                    <div className="col-span-1 text-center text-red-400 font-semibold">
                      {standing.losses}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Trophy className="w-4 h-4 text-[#ccff00]" />
                        <span className="text-white font-bold text-lg">{standing.points}</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Award className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-300 font-semibold">{standing.total_fanta_points}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
              <h2 className="text-xl font-bold text-white mb-4">League Scoring System</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-[#ccff00] font-bold mb-2">Championship Points</h3>
                  <ul className="space-y-1 text-slate-300">
                    <li>Win: <span className="text-green-400 font-semibold">3 points</span></li>
                    <li>Draw: <span className="text-yellow-400 font-semibold">1 point</span></li>
                    <li>Loss: <span className="text-red-400 font-semibold">0 points</span></li>
                  </ul>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-[#ccff00] font-bold mb-2">Position Duels</h3>
                  <p className="text-slate-300">
                    Each lineup slot faces its opponent. Higher real points wins the duel and earns 3 points for the team.
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-[#ccff00] font-bold mb-2">ATP/WTA Bonuses</h3>
                  <ul className="space-y-1 text-slate-300">
                    <li>ATP Bonus: <span className="font-semibold">+3 points</span> to team with highest ATP total</li>
                    <li>WTA Bonus: <span className="font-semibold">+3 points</span> to team with highest WTA total</li>
                  </ul>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-[#ccff00] font-bold mb-2">Tiebreaker</h3>
                  <p className="text-slate-300">
                    If teams have equal championship points, total Fanta Points (sum of all matchup scores) determines ranking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
