import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Save, AlertCircle } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  tour: 'ATP' | 'WTA';
  ranking: number;
}

interface TeamLineupManagerProps {
  teamId: string;
  tournamentId: string;
  lineupSlots: number;
}

export function TeamLineupManager({ teamId, tournamentId, lineupSlots }: TeamLineupManagerProps) {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [reserves, setReserves] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamPlayers();
    loadSavedLineup();
  }, [teamId, tournamentId]);

  const loadTeamPlayers = async () => {
    const { data } = await supabase
      .from('team_players')
      .select(`
        player_id,
        players!inner(id, name, tour, ranking)
      `)
      .eq('team_id', teamId);

    if (data) {
      const players = data.map((tp: any) => tp.players);
      setAvailablePlayers(players);
    }
  };

  const loadSavedLineup = async () => {
    const { data } = await supabase
      .from('team_lineups')
      .select('player_ids')
      .eq('team_id', teamId)
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (data?.player_ids) {
      const lineup = data.player_ids as any;
      setStarters(lineup.starters || []);
      setReserves(lineup.reserves || []);
    }
  };

  const handleSaveLineup = async () => {
    if (starters.length !== lineupSlots) {
      alert(`Please select exactly ${lineupSlots} starters`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_lineups')
        .upsert({
          team_id: teamId,
          tournament_id: tournamentId,
          player_ids: {
            starters,
            reserves,
          },
        }, {
          onConflict: 'team_id,tournament_id',
        });

      if (error) throw error;
      alert('Lineup saved successfully!');
    } catch (error) {
      console.error('Error saving lineup:', error);
      alert('Error saving lineup');
    } finally {
      setLoading(false);
    }
  };

  const addStarter = (playerId: string) => {
    if (starters.length >= lineupSlots) {
      alert(`Maximum ${lineupSlots} starters allowed`);
      return;
    }
    if (starters.includes(playerId) || reserves.includes(playerId)) {
      alert('Player already in lineup');
      return;
    }
    setStarters([...starters, playerId]);
  };

  const removeStarter = (playerId: string) => {
    setStarters(starters.filter((id) => id !== playerId));
  };

  const addReserve = (playerId: string) => {
    if (starters.includes(playerId) || reserves.includes(playerId)) {
      alert('Player already in lineup');
      return;
    }
    setReserves([...reserves, playerId]);
  };

  const removeReserve = (playerId: string) => {
    setReserves(reserves.filter((id) => id !== playerId));
  };

  const getPlayerById = (id: string) => availablePlayers.find((p) => p.id === id);

  const unselectedPlayers = availablePlayers.filter(
    (p) => !starters.includes(p.id) && !reserves.includes(p.id)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lineup Manager ({lineupSlots} slots)
          </h3>
          <button
            onClick={handleSaveLineup}
            disabled={loading || starters.length !== lineupSlots}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Lineup'}
          </button>
        </div>

        {starters.length !== lineupSlots && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Select exactly {lineupSlots} starters. Currently selected: {starters.length}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-green-700">Starters ({starters.length}/{lineupSlots})</h4>
            <div className="space-y-2">
              {starters.map((playerId, idx) => {
                const player = getPlayerById(playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="bg-white p-2 rounded border flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.tour} #{player.ranking}</p>
                    </div>
                    <button
                      onClick={() => removeStarter(playerId)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Reserves ({reserves.length})</h4>
            <div className="space-y-2">
              {reserves.map((playerId) => {
                const player = getPlayerById(playerId);
                if (!player) return null;
                return (
                  <div key={playerId} className="bg-white p-2 rounded border flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.tour} #{player.ranking}</p>
                    </div>
                    <button
                      onClick={() => removeReserve(playerId)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3">Available Players</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unselectedPlayers.map((player) => (
                <div key={player.id} className="bg-white p-2 rounded border">
                  <p className="font-medium text-sm">{player.name}</p>
                  <p className="text-xs text-gray-500">{player.tour} #{player.ranking}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => addStarter(player.id)}
                      disabled={starters.length >= lineupSlots}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                    >
                      Add as Starter
                    </button>
                    <button
                      onClick={() => addReserve(player.id)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add as Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 mb-2">Auto-Substitution</h4>
        <p className="text-sm text-blue-800">
          If a starter has 0 points, the system will automatically substitute them with the first reserve
          who has non-zero points during matchup calculation.
        </p>
      </div>
    </div>
  );
}
