import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Users } from 'lucide-react';
import { CountryFlag } from '../components/CountryFlag';

interface Player {
  id: string;
  name: string;
  tour: 'ATP' | 'WTA';
  ranking: number;
  fixed_ranking: number;
  price: number;
  total_points: number;
  country: string | null;
}

export const Players: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tourFilter, setTourFilter] = useState<'ALL' | 'ATP' | 'WTA'>('ALL');
  const [sortBy, setSortBy] = useState<'ranking' | 'name' | 'price'>('ranking');

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('fixed_ranking', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTour = tourFilter === 'ALL' || player.tour === tourFilter;
      return matchesSearch && matchesTour;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'ranking':
        default:
          return a.fixed_ranking - b.fixed_ranking;
      }
    });

  const atpCount = players.filter(p => p.tour === 'ATP').length;
  const wtaCount = players.filter(p => p.tour === 'WTA').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#ccff00] mx-auto mb-4"></div>
          <p className="text-white text-xl">Caricamento giocatori...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-10 h-10 text-[#ccff00]" />
            <h1 className="text-4xl font-bold text-white">Database Giocatori</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Totale: {players.length} giocatori ({atpCount} ATP, {wtaCount} WTA)
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca giocatore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              />
            </div>

            <div>
              <select
                value={tourFilter}
                onChange={(e) => setTourFilter(e.target.value as 'ALL' | 'ATP' | 'WTA')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              >
                <option value="ALL">Tutti i Tour</option>
                <option value="ATP">Solo ATP</option>
                <option value="WTA">Solo WTA</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'ranking' | 'name' | 'price')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              >
                <option value="ranking">Ordina per Ranking</option>
                <option value="name">Ordina per Nome</option>
                <option value="price">Ordina per Prezzo</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Mostrando {filteredPlayers.length} di {players.length} giocatori
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Ranking
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Paese
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Tour
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Prezzo
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#ccff00] uppercase tracking-wider">
                    Punti
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-[#ccff00]">
                          #{player.fixed_ranking}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-white">
                        {player.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.country && (
                        <CountryFlag countryCode={player.country} size="lg" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          player.tour === 'ATP'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-pink-900 text-pink-300'
                        }`}
                      >
                        {player.tour}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-xl font-bold text-[#ccff00]">
                        {player.price}
                      </span>
                      <span className="text-sm text-slate-400 ml-1">crediti</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-semibold text-white">
                        {player.total_points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Nessun giocatore trovato</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Players;
