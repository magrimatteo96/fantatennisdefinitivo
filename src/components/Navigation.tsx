import React, { useState } from 'react';
import { Trophy, ShoppingCart, Users, BarChart3, LogOut, Settings, FileText, TrendingUp, Calendar, UsersRound, Menu, X, CircleUser as UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  currentPage: 'dashboard' | 'market' | 'lineup' | 'standings' | 'calendar' | 'admin' | 'results' | 'stats' | 'matches' | 'teams' | 'matchup-results' | 'players';
  onNavigate: (page: 'dashboard' | 'market' | 'lineup' | 'standings' | 'calendar' | 'admin' | 'results' | 'stats' | 'matches' | 'teams' | 'matchup-results' | 'players') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleNavigate = (page: typeof currentPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Trophy },
    { id: 'teams' as const, label: 'Le Squadre', icon: UsersRound },
    { id: 'players' as const, label: 'Giocatori', icon: UserCircle },
    { id: 'market' as const, label: 'Market', icon: ShoppingCart },
    { id: 'lineup' as const, label: 'Lineup', icon: Users },
    { id: 'matches' as const, label: 'Matches', icon: Calendar },
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
    { id: 'matchup-results' as const, label: 'Matchup Results', icon: FileText },
    { id: 'standings' as const, label: 'Standings', icon: BarChart3 },
    { id: 'stats' as const, label: 'Stats', icon: TrendingUp },
    { id: 'admin' as const, label: 'Admin', icon: Settings },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b-2 border-[#ccff00] shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Trophy className="w-8 h-8 text-[#ccff00]" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              <span className="text-[#ccff00]">H2H</span> Fantasy Tennis
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#ccff00] text-slate-900 font-semibold'
                      : 'text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={handleSignOut}
              className="ml-4 flex items-center space-x-2 px-3 py-2 rounded-lg text-white hover:bg-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden text-white p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden pb-4">
            <div className="flex flex-col space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#ccff00] text-slate-900 font-semibold'
                        : 'text-white hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-red-600 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
