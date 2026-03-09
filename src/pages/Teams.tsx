import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, DollarSign, ChevronRight, Search, X, Plus, Crown } from 'lucide-react';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { CountryFlag } from '../components/CountryFlag';

interface LeagueTeam {
  id: string;
  name: string;
  credits: number;
  user_id: string | null;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  category: 'ATP' | 'WTA';
  ranking: number;
  price: number;
  country?: string;
  image_url?: string;
}

interface TeamPlayer extends Player {
  auction_price: number;
  acquired_at: string;
}

interface TeamWithRoster extends LeagueTeam {
  players: TeamPlayer[];
  atpPlayers: TeamPlayer[];
  wtaPlayers: TeamPlayer[];
  totalSpent: number;
}

export default function Teams() {
  const [teams, setTeams] = useState<TeamWithRoster[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadTeams();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadTeams = async () => {
    setLoading(true);
    console.log('=== CARICAMENTO SQUADRE INIZIATO ===');

    const { data: teamsData, error } = await supabase
      .from('league_teams')
      .select('*')
      .order('name', { ascending: true });

    console.log('Query Supabase completata:', {
      teamsData,
      error,
      numeroSquadre: teamsData?.length || 0
    });

    if (error) {
      console.error('ERRORE SUPABASE:', error);
      setTeams([]);
      setLoading(false);
      return;
    }

    if (!teamsData || teamsData.length === 0) {
      console.error('DATABASE VUOTO: nessuna squadra trovata nella tabella league_teams');
      setTeams([]);
      setLoading(false);
      return;
    }

    const teamsWithRosters = await Promise.all(
      teamsData.map(async (team) => {
        const { data: playerData, error: playerError } = await supabase
          .from('team_players')
          .select(`
            id,
            auction_price,
            acquired_at,
            player_id,
            players (
              id,
              first_name,
              last_name,
              category,
              ranking,
              price,
              country,
              image_url
            )
          `)
          .eq('team_id', team.id);

        if (playerError) {
          console.error('Error loading players for team', team.name, playerError);
        }

        const players: TeamPlayer[] = playerData?.map(tp => {
          if (!tp.players) return null;
          return {
            id: tp.players.id,
            first_name: tp.players.first_name || '',
            last_name: tp.players.last_name || '',
            category: tp.players.category as 'ATP' | 'WTA',
            ranking: tp.players.ranking || 999,
            price: tp.players.price || 0,
            country: tp.players.country,
            image_url: tp.players.image_url,
            auction_price: tp.auction_price || 0,
            acquired_at: tp.acquired_at,
          };
        }).filter(p => p !== null) as TeamPlayer[] || [];

        const atpPlayers = players.filter(p => p.category === 'ATP').sort((a, b) => a.ranking - b.ranking);
        const wtaPlayers = players.filter(p => p.category === 'WTA').sort((a, b) => a.ranking - b.ranking);
        const totalSpent = players.reduce((sum, p) => sum + p.auction_price, 0);

        return {
          ...team,
          players,
          atpPlayers,
          wtaPlayers,
          totalSpent,
        };
      })
    );

    console.log('=== CARICAMENTO COMPLETATO ===');
    console.log('Squadre caricate con successo:', teamsWithRosters.length);
    setTeams(teamsWithRosters);
    setLoading(false);
  };

  const debugDatabase = async () => {
    console.log('=== DEBUG DATABASE START ===');
    const { data: rawTeams, error } = await supabase
      .from('league_teams')
      .select('*');

    console.log('Dati grezzi dalla tabella league_teams:');
    console.log('Data:', rawTeams);
    console.log('Error:', error);
    console.log('Numero squadre:', rawTeams?.length || 0);

    if (rawTeams && rawTeams.length > 0) {
      console.log('Prima squadra:', rawTeams[0]);
      alert(`DATABASE OK: ${rawTeams.length} squadre trovate. Controlla la console per i dettagli.`);
    } else if (error) {
      console.error('ERRORE DATABASE:', error);
      alert('ERRORE: ' + error.message);
    } else {
      console.error('DATABASE VUOTO');
      alert('DATABASE VUOTO: la tabella league_teams non contiene dati!');
    }
    console.log('=== DEBUG DATABASE END ===');
  };

  const searchPlayers = async () => {
    if (!selectedTeam || !searchQuery.trim()) return;

    setSearchLoading(true);
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
      .order('ranking', { ascending: true })
      .limit(50);

    if (!allPlayers) {
      setSearchLoading(false);
      return;
    }

    const { data: assignedPlayerIds } = await supabase
      .from('team_players')
      .select('player_id');

    const assignedIds = new Set(assignedPlayerIds?.map(tp => tp.player_id) || []);
    const available = allPlayers.filter(p => !assignedIds.has(p.id));

    setAvailablePlayers(available);
    setSearchLoading(false);
  };

  const addPlayerToTeam = async (player: Player) => {
    if (!selectedTeam) return;

    const atpCount = selectedTeam.atpPlayers.length;
    const wtaCount = selectedTeam.wtaPlayers.length;

    if (player.category === 'ATP' && atpCount >= 10) {
      alert('Questa squadra ha già 10 giocatori ATP');
      return;
    }
    if (player.category === 'WTA' && wtaCount >= 10) {
      alert('Questa squadra ha già 10 giocatrici WTA');
      return;
    }

    if (selectedTeam.totalSpent + player.price > 1000) {
      alert('Budget insufficiente per questo acquisto');
      return;
    }

    const { error } = await supabase
      .from('team_players')
      .insert({
        team_id: selectedTeam.id,
        player_id: player.id,
        auction_price: player.price,
      });

    if (!error) {
      await loadTeams();
      setShowPlayerSearch(false);
      setSearchQuery('');
      setAvailablePlayers([]);
    }
  };

  const removePlayerFromTeam = async (playerId: string) => {
    if (!selectedTeam || !confirm('Rimuovere questo giocatore dalla rosa?')) return;

    if (!canEditTeam(selectedTeam)) {
      alert('Non puoi modificare questa squadra!');
      return;
    }

    const { error } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', selectedTeam.id)
      .eq('player_id', playerId);

    if (!error) {
      await loadTeams();
    }
  };

  const canEditTeam = (team: TeamWithRoster): boolean => {
    return team.user_id === currentUserId;
  };

  const getTeamBadge = (team: TeamWithRoster) => {
    if (team.user_id === currentUserId) {
      return (
        <span className="inline-block bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          MIA SQUADRA
        </span>
      );
    }
    if (team.user_id !== null && team.user_id !== currentUserId) {
      return (
        <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          SOCIO
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Caricamento squadre...</p>
        </div>
      </div>
    );
  }

  if (!loading && teams.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border-4 border-red-600 rounded-lg p-8 mb-6">
          <h1 className="text-4xl font-black text-red-800 mb-4">
            DATABASE VUOTO O NON RAGGIUNGIBILE
          </h1>
          <p className="text-lg text-red-700 mb-2">
            La tabella 'league_teams' non restituisce dati.
          </p>
          <p className="text-sm text-red-600">
            Premi il bottone DEBUG DB qui sotto e controlla la console del browser (F12).
          </p>
        </div>

        <button
          onClick={debugDatabase}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black text-2xl py-6 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105"
        >
          DEBUG DB - CLICCA QUI
        </button>
      </div>
    );
  }

  if (selectedTeam) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <button
          onClick={() => setSelectedTeam(null)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          Torna alle squadre
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-800">{selectedTeam.name}</h1>
                {getTeamBadge(selectedTeam)}
              </div>
              <p className="text-gray-600 mt-1">
                Rosa: {selectedTeam.players.length}/20 giocatori
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Budget Rimanente</div>
              <div className="text-3xl font-bold text-green-600">
                {selectedTeam.credits} crediti
              </div>
              <div className="text-sm text-gray-500">
                Spesi: {selectedTeam.totalSpent}/1000
              </div>
            </div>
          </div>

          {selectedTeam.players.length < 20 && canEditTeam(selectedTeam) && (
            <button
              onClick={() => setShowPlayerSearch(!showPlayerSearch)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Aggiungi Giocatore
            </button>
          )}
          {selectedTeam.players.length < 20 && !canEditTeam(selectedTeam) && (
            <div className="w-full bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-center">
              Non puoi modificare questa squadra
            </div>
          )}
        </div>

        {showPlayerSearch && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
                  placeholder="Cerca giocatore per nome..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
              </div>
              <button
                onClick={searchPlayers}
                disabled={searchLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Cerca
              </button>
              <button
                onClick={() => {
                  setShowPlayerSearch(false);
                  setSearchQuery('');
                  setAvailablePlayers([]);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {searchLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!searchLoading && availablePlayers.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-semibold">{`${player.first_name} ${player.last_name}`}</div>
                      <div className="text-sm text-gray-600">
                        {player.category} • Ranking: {player.ranking}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-blue-600">
                        {player.price} crediti
                      </div>
                      <button
                        onClick={() => addPlayerToTeam(player)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searchLoading && searchQuery && availablePlayers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nessun giocatore disponibile trovato
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              ATP ({selectedTeam.atpPlayers.length}/10)
            </h2>
            {selectedTeam.atpPlayers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nessun giocatore ATP</p>
            ) : (
              <div className="space-y-3">
                {selectedTeam.atpPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        name={`${player.first_name} ${player.last_name}`}
                        tour={player.category}
                        imageUrl={player.image_url}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CountryFlag countryCode={player.country || 'XX'} size="md" />
                          <div className="font-bold text-gray-800">{`${player.first_name} ${player.last_name}`}</div>
                          {index === 0 && (
                            <Crown className="w-5 h-5 text-yellow-500" title="Capitano" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-xs text-gray-600">
                            Ranking: <span className="font-semibold">#{player.ranking}</span>
                          </div>
                          <div className="text-xs font-semibold text-blue-600">
                            {player.auction_price} crediti
                          </div>
                        </div>
                      </div>
                      {canEditTeam(selectedTeam) && (
                        <button
                          onClick={() => removePlayerFromTeam(player.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-pink-600 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              WTA ({selectedTeam.wtaPlayers.length}/10)
            </h2>
            {selectedTeam.wtaPlayers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nessuna giocatrice WTA</p>
            ) : (
              <div className="space-y-3">
                {selectedTeam.wtaPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="p-4 bg-gradient-to-r from-pink-50 to-fuchsia-100 rounded-xl border-2 border-pink-200 hover:border-pink-400 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        name={`${player.first_name} ${player.last_name}`}
                        tour={player.category}
                        imageUrl={player.image_url}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CountryFlag countryCode={player.country || 'XX'} size="md" />
                          <div className="font-bold text-gray-800">{`${player.first_name} ${player.last_name}`}</div>
                          {index === 0 && (
                            <Crown className="w-5 h-5 text-yellow-500" title="Capitano" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-xs text-gray-600">
                            Ranking: <span className="font-semibold">#{player.ranking}</span>
                          </div>
                          <div className="text-xs font-semibold text-pink-600">
                            {player.auction_price} crediti
                          </div>
                        </div>
                      </div>
                      {canEditTeam(selectedTeam) && (
                        <button
                          onClick={() => removePlayerFromTeam(player.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Le Squadre</h1>
        </div>
        <p className="text-gray-600">Gestisci le rose delle {teams.length} squadre della lega</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            onClick={() => setSelectedTeam(team)}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">{team.name}</h3>
                {getTeamBadge(team)}
              </div>
              <div className="flex items-center gap-2 text-green-100">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">{team.credits} crediti</span>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Giocatori</span>
                  <span className="font-bold text-gray-800">
                    {team.players.length}/20
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ATP</span>
                  <span className="font-semibold text-blue-600">
                    {team.atpPlayers.length}/10
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">WTA</span>
                  <span className="font-semibold text-pink-600">
                    {team.wtaPlayers.length}/10
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Spesa totale</span>
                    <span className="font-bold text-gray-800">
                      {team.totalSpent} / 1000
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-green-600 font-semibold">
                Visualizza rosa
                <ChevronRight className="w-5 h-5 ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
