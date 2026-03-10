import React, { useState, useEffect } from 'react';
import { useFantasy } from '../context/FantasyContext';
import { Calendar, DollarSign, Users, Trophy, TrendingUp, Swords, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTeamOpponentsInTournament } from '../lib/matchupCalculations';
import { generateMatchupsForAllTeams } from '../lib/weeklyMatchGeneration';

interface Opponent {
  opponent_id: string;
  opponent_name: string;
  matchup_id: string;
  is_home: boolean;
  my_score: number;
  opponent_score: number;
  my_championship_points: number;
  is_completed: boolean;
}

export const Dashboard: React.FC = () => {
  const { mySquad, currentTournament, standing, budgetRemaining, user } = useFantasy();
  const [myOpponents, setMyOpponents] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const atpPlayers = mySquad.filter(s => s.player?.category === 'ATP');
  const wtaPlayers = mySquad.filter(s => s.player?.category === 'WTA');

  const isAdmin = user?.email === 'pivuz3@gmail.com' || user?.email === 'magrimatteo@gmail.com' || user?.email === 'admin@dev.local';

  // Helper function to get tournament display name
  const getTournamentName = () => {
    if (!currentTournament) return 'Unknown Tournament';
    return currentTournament.tournament_name || currentTournament.name || 'Unknown Tournament';
  };

  // Helper function to get tournament type
  const getTournamentType = () => {
    if (!currentTournament) return undefined;
    return currentTournament.type || currentTournament.category;
  };

  console.log('🔍 Dashboard Debug:');
  console.log('  - User Email:', user?.email);
  console.log('  - Is Admin:', isAdmin);
  console.log('  - Current Tournament:', getTournamentName());
  console.log('  - Round:', currentTournament?.round_number, 'Type:', getTournamentType());
  console.log('  - Standing:', standing?.team_name);
  console.log('  - Opponents Count:', myOpponents.length);

  useEffect(() => {
    console.log('🎾 Dashboard: currentTournament =', currentTournament);
    console.log('🎾 Dashboard: standing =', standing);
    loadOpponents();
  }, [standing, currentTournament]);

  const loadOpponents = async () => {
    setLoading(true);
    if (!standing || !currentTournament) {
      console.log('⚠️ loadOpponents: Missing standing or tournament');
      setMyOpponents([]);
      setLoading(false);
      return;
    }

    console.log('🔍 loadOpponents: Loading for team', standing.team_id, 'tournament', currentTournament.id);
    const opponents = await getTeamOpponentsInTournament(
      standing.team_id,
      currentTournament.id
    );

    console.log('✅ loadOpponents: Found', opponents.length, 'opponents');
    setMyOpponents(opponents);
    setLoading(false);
  };

  const handleGenerateMatches = async () => {
    if (!currentTournament) {
      alert('No active tournament');
      return;
    }

    setGenerating(true);
    console.log('🚀 FORCE GENERATING MATCHES for tournament:', getTournamentName());

    const success = await generateMatchupsForAllTeams(currentTournament.id);

    if (success) {
      alert('✅ Weekly matches generated successfully!');
      await loadOpponents();
    } else {
      alert('❌ Failed to generate matches. Check console for details.');
    }

    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center space-x-3">
          <Trophy className="w-10 h-10 text-[#ccff00]" />
          <span>Dashboard</span>
        </h1>

        {/* Debug Info (Remove later) */}
        <div className="mb-4 bg-slate-800 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400 font-mono text-sm">
            DEBUG: User={user?.email} | Admin={isAdmin ? 'YES' : 'NO'} | Tournament={getTournamentName()} | Round={currentTournament?.round_number || 'N/A'} | Type={getTournamentType() || 'N/A'} | Standing={standing?.team_name || 'NONE'}
          </p>
        </div>

        {/* Current Tournament Card */}
        {currentTournament && (
          <div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-[#ccff00]/20 rounded-xl p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="w-6 h-6 text-[#ccff00]" />
                  <h2 className="text-2xl font-bold text-white">Tournament in Progress</h2>
                </div>
                <p className="text-3xl font-bold text-[#ccff00] mb-2">{getTournamentName()}</p>
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-[#ccff00] text-slate-900 text-sm font-bold rounded-full">
                    {getTournamentType() === 'SLAM' ? 'Grand Slam' :
                     getTournamentType() === '1000' ? 'Masters 1000' :
                     getTournamentType() === '500' ? 'ATP 500' : 'ATP 250'}
                  </span>
                  <span className="text-slate-400">
                    {new Date(currentTournament.start_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end space-y-3">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Matchups Remaining</p>
                  <p className="text-4xl font-bold text-[#ccff00]">
                    {myOpponents.filter(o => !o.is_completed).length}
                  </p>
                </div>
                <button
                  onClick={handleGenerateMatches}
                  disabled={generating}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#ccff00] text-slate-900 font-bold rounded-lg hover:bg-[#b8e600] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  <span>{generating ? 'Generating...' : 'Generate Weekly Matches'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border-2 border-slate-600 hover:border-[#ccff00] transition-all">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-[#ccff00]" />
              <span className="text-3xl font-bold text-white">{mySquad.length}/20</span>
            </div>
            <h3 className="text-slate-300 text-sm font-semibold">Squad Size</h3>
            <p className="text-xs text-slate-400 mt-1">
              ATP: {atpPlayers.length}/10 | WTA: {wtaPlayers.length}/10
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border-2 border-slate-600 hover:border-[#ccff00] transition-all">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{budgetRemaining}</span>
            </div>
            <h3 className="text-slate-300 text-sm font-semibold">Budget Remaining</h3>
            <p className="text-xs text-slate-400 mt-1">Out of 1000 credits</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border-2 border-slate-600 hover:border-[#ccff00] transition-all">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-[#ccff00]" />
              <span className="text-3xl font-bold text-white">{standing?.total_points || 0}</span>
            </div>
            <h3 className="text-slate-300 text-sm font-semibold">Total Points</h3>
            <p className="text-xs text-slate-400 mt-1">
              {standing?.matches_won || 0}W - {standing?.matches_drawn || 0}D - {standing?.matches_lost || 0}L
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 border-2 border-slate-600 hover:border-[#ccff00] transition-all">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-blue-400" />
              <span className="text-sm font-bold text-white">Torneo Attivo</span>
            </div>
            <h3 className="text-slate-300 text-sm font-semibold">Current Tournament</h3>
            <p className="text-xs text-slate-400 mt-1">
              {getTournamentName()}
            </p>
            {currentTournament && (
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  getTournamentType() === 'SLAM' ? 'bg-purple-600 text-white' :
                  getTournamentType() === '1000' ? 'bg-orange-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {getTournamentType() === 'SLAM' ? 'SLAM (⚡3)' :
                   getTournamentType() === '1000' ? 'MASTER 1000 (⚡2)' :
                   getTournamentType() === '500' ? '500 (⚡2)' :
                   '250 (⚡1)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {!loading && myOpponents.length === 0 && currentTournament && (
          <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-8 border-2 border-yellow-500 text-center">
            <Swords className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Nessun Match Generato</h2>
            <p className="text-slate-300 mb-4">
              Non ci sono ancora match per il torneo <span className="text-[#ccff00] font-bold">{getTournamentName()}</span>
            </p>
            <p className="text-slate-400 text-sm">
              {isAdmin ? "Clicca il tasto 'Generate Weekly Matches' sopra per creare i match" : "Attendi che l'admin generi i match per questo torneo"}
            </p>
          </div>
        )}

        {!loading && myOpponents.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-orange-900 to-red-900 rounded-xl p-6 border-2 border-orange-500">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Swords className="w-8 h-8 text-orange-400" />
              Your H2H Matchups - {getTournamentName()}
            </h2>
            <div className="bg-white/5 rounded-lg p-4 mb-4 backdrop-blur-sm">
              {myOpponents.length === 3 ? (
                <p className="text-white text-center text-lg">
                  In questo <span className="text-purple-400 font-bold">SLAM</span> sfidi: <span className="text-[#ccff00] font-bold">{myOpponents.map(o => o.opponent_name).join(', ')}</span>
                </p>
              ) : myOpponents.length === 2 ? (
                <p className="text-white text-center text-lg">
                  In questo torneo sfidi: <span className="text-[#ccff00] font-bold">{myOpponents.map(o => o.opponent_name).join(' e ')}</span>
                </p>
              ) : (
                <p className="text-white text-center">
                  Sfidi <span className="text-[#ccff00] font-bold text-xl">{myOpponents[0].opponent_name}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myOpponents.map((opponent, idx) => (
                <div
                  key={opponent.matchup_id}
                  className="bg-white/10 rounded-lg p-5 backdrop-blur-sm border-2 border-white/20"
                >
                  <div className="text-center mb-3">
                    <div className="text-sm text-slate-300 mb-1">Opponent {idx + 1}</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {opponent.opponent_name}
                    </div>
                  </div>
                  {opponent.is_completed ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-4 text-xl font-bold">
                        <span className="text-white">{opponent.my_score}</span>
                        <span className="text-slate-400">-</span>
                        <span className="text-white">{opponent.opponent_score}</span>
                      </div>
                      <div className="text-center">
                        {opponent.my_championship_points === 3 && (
                          <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            WIN (+3 pts)
                          </span>
                        )}
                        {opponent.my_championship_points === 1 && (
                          <span className="inline-block bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            DRAW (+1 pt)
                          </span>
                        )}
                        {opponent.my_championship_points === 0 && (
                          <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            LOSS (0 pts)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-400 mb-2">VS</div>
                      <span className="inline-block bg-slate-600 text-slate-200 px-3 py-1 rounded-full text-xs font-semibold">
                        Not Started
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
              <span className="text-[#ccff00]">ATP</span>
              <span>Squad</span>
            </h2>
            {atpPlayers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No ATP players yet. Visit the Market!</p>
            ) : (
              <div className="space-y-2">
                {atpPlayers
                  .sort((a, b) => (a.player?.ranking || 999) - (b.player?.ranking || 999))
                  .map(squad => (
                    <div
                      key={squad.id}
                      className="flex items-center justify-between bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-[#ccff00] text-slate-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          {squad.player?.ranking}
                        </div>
                        <span className="text-white font-medium">{squad.player?.first_name} {squad.player?.last_name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-slate-300 text-sm">{squad.player?.total_points} pts</span>
                        <span className="text-[#ccff00] font-semibold">Paid: ${squad.auction_price}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
              <span className="text-pink-400">WTA</span>
              <span>Squad</span>
            </h2>
            {wtaPlayers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No WTA players yet. Visit the Market!</p>
            ) : (
              <div className="space-y-2">
                {wtaPlayers
                  .sort((a, b) => (a.player?.ranking || 999) - (b.player?.ranking || 999))
                  .map(squad => (
                    <div
                      key={squad.id}
                      className="flex items-center justify-between bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-pink-400 text-slate-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          {squad.player?.ranking}
                        </div>
                        <span className="text-white font-medium">{squad.player?.first_name} {squad.player?.last_name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-slate-300 text-sm">{squad.player?.total_points} pts</span>
                        <span className="text-[#ccff00] font-semibold">Paid: ${squad.auction_price}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {mySquad.length === 0 && (
          <div className="mt-8 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-8 border-2 border-[#ccff00] text-center">
            <Trophy className="w-16 h-16 text-[#ccff00] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Fantatennis Manager!</h2>
            <p className="text-slate-300 mb-4">
              Start building your dream team by visiting the Market and selecting 20 players (10 ATP + 10 WTA)
            </p>
            <p className="text-slate-400 text-sm">
              You have 1000 credits to build your squad. Choose wisely!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
