import React, { useState } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import { useFantasy } from '../context/FantasyContext';

interface TeamSetupProps {
  onComplete: () => void;
}

export const TeamSetup: React.FC<TeamSetupProps> = ({ onComplete }) => {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const { initializeStanding } = useFantasy();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    try {
      await initializeStanding(teamName.trim());
      onComplete();
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Trophy className="w-20 h-20 text-[#ccff00] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to Fantatennis Manager!</h1>
          <p className="text-slate-400 text-lg">Let's get started by creating your team</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border-2 border-[#ccff00] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white text-lg font-bold mb-3">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                maxLength={30}
                className="w-full px-4 py-4 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none text-lg"
                placeholder="Enter your team name..."
              />
              <p className="text-slate-400 text-sm mt-2">
                Choose a unique name for your fantasy tennis team (max 30 characters)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-[#ccff00] hover:bg-[#b8e600] text-slate-900 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
              ) : (
                <>
                  <span>Create Team</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
          <h3 className="text-white font-bold text-lg mb-4">What's Next?</h3>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-start space-x-3">
              <div className="bg-[#ccff00] text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-semibold">Visit the Market</p>
                <p className="text-sm text-slate-400">Build your squad with 1000 credits (10 ATP + 10 WTA players)</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-[#ccff00] text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-semibold">Create Your Lineup</p>
                <p className="text-sm text-slate-400">Set your formation based on the tournament type</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-[#ccff00] text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-semibold">Compete & Win</p>
                <p className="text-sm text-slate-400">Earn points based on real tennis results and climb the standings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
