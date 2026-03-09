import React, { useState, useEffect } from 'react';
import { useFantasy } from '../context/FantasyContext';
import { Calendar as CalendarIcon, Trophy, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Tournament {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  round_number: number;
  lineup_slots: number;
  is_active: boolean;
  duration_days: number;
  opponents_count: number;
}

export const Calendar: React.FC = () => {
  const { currentTournament } = useFantasy();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error loading tournaments:', error);
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const getTournamentBadgeColor = (type: string) => {
    switch (type) {
      case 'SLAM': return 'bg-red-600 text-white';
      case '1000': return 'bg-[#ccff00] text-slate-900';
      case '500': return 'bg-blue-600 text-white';
      case '250': return 'bg-slate-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getTournamentLabel = (type: string) => {
    switch (type) {
      case 'SLAM': return 'Grand Slam';
      case '1000': return 'Masters 1000';
      case '500': return 'ATP 500';
      case '250': return 'ATP 250';
      default: return type;
    }
  };

  const isCurrentTournament = (tournament: Tournament) => {
    return currentTournament?.id === tournament.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-center py-12">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <CalendarIcon className="w-10 h-10 text-[#ccff00]" />
          <h1 className="text-4xl font-bold text-white">2026 Tournament Calendar</h1>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700/50 border-b border-slate-600">
                  <th className="text-left p-4 text-slate-300 font-semibold">Round</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Tournament Name</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Dates</th>
                  <th className="text-left p-4 text-slate-300 font-semibold">Category</th>
                  <th className="text-center p-4 text-slate-300 font-semibold">Weight</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament, index) => {
                  const isCurrent = isCurrentTournament(tournament);
                  const roundNumber = index + 1;
                  return (
                    <tr
                      key={tournament.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                        isCurrent ? 'bg-[#ccff00]/10 border-[#ccff00]/30' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold ${isCurrent ? 'text-[#ccff00]' : 'text-slate-400'}`}>
                            #{roundNumber}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-[#ccff00] text-slate-900 text-xs font-bold rounded">
                              LIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {isCurrent && <Trophy className="w-4 h-4 text-[#ccff00]" />}
                          <span className={`font-semibold ${isCurrent ? 'text-[#ccff00]' : 'text-white'}`}>
                            {tournament.tournament_name || 'Torneo Senza Nome'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300 text-sm">
                          <div>{new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          <div className="text-slate-500">
                            {new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getTournamentBadgeColor(tournament.type)}`}>
                          {getTournamentLabel(tournament.type)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-lg font-bold ${isCurrent ? 'text-[#ccff00]' : 'text-slate-400'}`}>
                          {tournament.opponents_count}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Tournament Weights Explained</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-red-600 text-white font-bold rounded">Grand Slam</span>
              <span className="text-slate-400">Weight 4 - 4 weekly matchups</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-[#ccff00] text-slate-900 font-bold rounded">Masters 1000</span>
              <span className="text-slate-400">Weight 2 - 2 weekly matchups</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded">ATP 500</span>
              <span className="text-slate-400">Weight 1 - 1 weekly matchup</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-slate-600 text-white font-bold rounded">ATP 250</span>
              <span className="text-slate-400">Weight 1 - 1 weekly matchup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
