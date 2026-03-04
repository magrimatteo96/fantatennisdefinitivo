import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Account created! You can now sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-16 h-16 text-[#ccff00]" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">
            Fantatennis <span className="text-[#ccff00]">Manager</span>
          </h1>
          <p className="text-slate-400">Build your dream tennis team and compete!</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border-2 border-slate-700 shadow-2xl">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                !isSignUp
                  ? 'bg-[#ccff00] text-slate-900'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isSignUp
                  ? 'bg-[#ccff00] text-slate-900'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-[#ccff00] hover:bg-[#b8e600] text-slate-900 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-slate-700">
            <p className="text-slate-400 text-sm text-center">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-[#ccff00] hover:underline font-semibold"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 bg-slate-800 bg-opacity-50 rounded-xl p-6 border-2 border-slate-700">
          <h3 className="text-white font-bold mb-3">How to Play:</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start space-x-2">
              <span className="text-[#ccff00] font-bold">1.</span>
              <span>Build a squad of 20 players (10 ATP + 10 WTA) with 1000 credits</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#ccff00] font-bold">2.</span>
              <span>Create weekly lineups based on tournament type (SLAM/MASTER/250)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#ccff00] font-bold">3.</span>
              <span>Earn Fantapunti based on real ATP/WTA points your players earn</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#ccff00] font-bold">4.</span>
              <span>Compete against other managers and climb the standings!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
