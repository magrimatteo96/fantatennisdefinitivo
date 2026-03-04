import React, { useState } from 'react';
import { useFantasy } from '../context/FantasyContext';
import { ShoppingCart, Plus, Minus, Search, DollarSign, TrendingUp, X } from 'lucide-react';
import { Player } from '../lib/supabase';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { CountryFlag } from '../components/CountryFlag';

export const Market: React.FC = () => {
  const { players, mySquad, budgetRemaining, addPlayerToSquad, removePlayerFromSquad } = useFantasy();
  const [searchTerm, setSearchTerm] = useState('');
  const [tourFilter, setTourFilter] = useState<'ALL' | 'ATP' | 'WTA'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [auctionPrice, setAuctionPrice] = useState('');

  console.log('🎯 Market: Received players:', players.length);
  console.log('🎯 Market: mySquad:', mySquad.length);

  const mySquadPlayerIds = mySquad.map(s => s.player_id);
  const atpCount = mySquad.filter(s => s.player?.tour === 'ATP').length;
  const wtaCount = mySquad.filter(s => s.player?.tour === 'WTA').length;

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.ranking.toString().includes(searchTerm);
    const matchesTour = tourFilter === 'ALL' || player.tour === tourFilter;
    return matchesSearch && matchesTour;
  });

  console.log('🎯 Market: Filtered players:', filteredPlayers.length);

  const isPlayerInSquad = (playerId: string) => mySquadPlayerIds.includes(playerId);

  const canAddPlayer = (player: Player) => {
    if (isPlayerInSquad(player.id)) return false;
    if (player.tour === 'ATP' && atpCount >= 10) return false;
    if (player.tour === 'WTA' && wtaCount >= 10) return false;
    return true;
  };

  const handleOpenAuctionModal = (player: Player) => {
    setSelectedPlayer(player);
    setAuctionPrice('');
  };

  const handleCloseAuctionModal = () => {
    setSelectedPlayer(null);
    setAuctionPrice('');
  };

  const handleConfirmAuction = async () => {
    if (!selectedPlayer) return;

    const price = parseInt(auctionPrice);
    if (isNaN(price) || price < 1) {
      alert('Please enter a valid auction price (minimum 1 credit)');
      return;
    }

    if (price > budgetRemaining) {
      alert(`Not enough budget! You have ${budgetRemaining} credits remaining.`);
      return;
    }

    const success = await addPlayerToSquad(selectedPlayer.id, price);
    if (success) {
      handleCloseAuctionModal();
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    await removePlayerFromSquad(playerId);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center space-x-3">
            <ShoppingCart className="w-10 h-10 text-[#ccff00]" />
            <span>Player Market</span>
          </h1>
          <div className="bg-slate-800 rounded-xl px-6 py-3 border-2 border-[#ccff00]">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-[#ccff00]" />
              <span className="text-white font-bold text-xl">{budgetRemaining}</span>
              <span className="text-slate-400 text-sm">/ 1000</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-6 border-2 border-slate-600">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or ranking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'ATP', 'WTA'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setTourFilter(filter as any)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    tourFilter === filter
                      ? 'bg-[#ccff00] text-slate-900'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="text-slate-300">
              <span className="text-[#ccff00] font-semibold">ATP:</span> {atpCount}/10
              <span className="mx-4">|</span>
              <span className="text-pink-400 font-semibold">WTA:</span> {wtaCount}/10
            </div>
            <div className="text-slate-400">
              Total Squad: {mySquad.length}/20
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPlayers.map(player => {
            const inSquad = isPlayerInSquad(player.id);
            const canAdd = canAddPlayer(player);

            return (
              <div
                key={player.id}
                className={`bg-slate-800 rounded-xl p-4 border-2 transition-all ${
                  inSquad
                    ? 'border-[#ccff00] bg-opacity-90'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <PlayerAvatar
                      name={player.name}
                      tour={player.tour}
                      imageUrl={player.image_url}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CountryFlag countryCode={(player as any).country || 'XX'} size="md" />
                        <h3 className="text-white font-bold text-lg">{player.name}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            player.tour === 'ATP'
                              ? 'bg-[#ccff00] text-slate-900'
                              : 'bg-pink-400 text-slate-900'
                          }`}
                        >
                          {player.tour}
                        </span>
                        <span className="text-slate-400 text-sm">#{player.ranking}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-slate-400 text-sm">
                          <TrendingUp className="w-4 h-4" />
                          <span>{player.total_points} pts</span>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-400 text-sm">
                          <span>Base Price: ${player.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    {inSquad ? (
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                      >
                        <Minus className="w-5 h-5" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAuctionModal(player)}
                        disabled={!canAdd}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                          canAdd
                            ? 'bg-[#ccff00] hover:bg-[#b8e600] text-slate-900'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-5 h-5" />
                        <span>Bid</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No players found matching your criteria</p>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border-2 border-[#ccff00] relative">
            <button
              onClick={handleCloseAuctionModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div
                className={`rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl mx-auto mb-4 ${
                  selectedPlayer.tour === 'ATP'
                    ? 'bg-[#ccff00] text-slate-900'
                    : 'bg-pink-400 text-slate-900'
                }`}
              >
                {selectedPlayer.ranking}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{selectedPlayer.name}</h2>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedPlayer.tour === 'ATP'
                    ? 'bg-[#ccff00] text-slate-900'
                    : 'bg-pink-400 text-slate-900'
                }`}
              >
                {selectedPlayer.tour}
              </span>
            </div>

            <div className="mb-6">
              <label className="block text-white text-lg font-bold mb-3">
                Enter Auction Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-[#ccff00]" />
                <input
                  type="number"
                  min="1"
                  max={budgetRemaining}
                  value={auctionPrice}
                  onChange={(e) => setAuctionPrice(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-700 text-white text-xl font-bold rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>Available Budget: ${budgetRemaining}</span>
                <span>Min: $1</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseAuctionModal}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAuction}
                className="flex-1 px-6 py-3 bg-[#ccff00] hover:bg-[#b8e600] text-slate-900 rounded-lg font-semibold transition-all"
              >
                Confirm Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
