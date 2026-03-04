import React, { useState } from 'react';
import { FantasyProvider, useFantasy } from './context/FantasyContext';
import { Auth } from './components/Auth';
import { TeamSetup } from './components/TeamSetup';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Market } from './pages/Market';
import { Lineup } from './pages/Lineup';
import { Standings } from './pages/Standings';
import { Calendar } from './pages/Calendar';
import Admin from './pages/Admin';
import Results from './pages/Results';
import PlayerStats from './pages/PlayerStats';
import Matches from './pages/Matches';
import Teams from './pages/Teams';
import MatchupResults from './pages/MatchupResults';
import Players from './pages/Players';

type Page = 'dashboard' | 'market' | 'lineup' | 'standings' | 'calendar' | 'admin' | 'results' | 'stats' | 'matches' | 'teams' | 'matchup-results' | 'players';

const AppContent: React.FC = () => {
  const { user, standing, loading } = useFantasy();
  const [currentPage, setCurrentPage] = useState<Page>('admin');
  const [setupComplete, setSetupComplete] = useState(false);

  const isDevelopmentMode = import.meta.env.DEV;

  if (loading && !isDevelopmentMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#ccff00] mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Fantatennis Manager...</p>
        </div>
      </div>
    );
  }

  if (!user && !isDevelopmentMode) {
    return <Auth />;
  }

  if (!standing && !setupComplete && !isDevelopmentMode) {
    return <TeamSetup onComplete={() => setSetupComplete(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'teams':
        return <Teams />;
      case 'players':
        return <Players />;
      case 'market':
        return <Market />;
      case 'lineup':
        return <Lineup />;
      case 'matches':
        return <Matches />;
      case 'standings':
        return <Standings />;
      case 'calendar':
        return <Calendar />;
      case 'admin':
        return <Admin />;
      case 'results':
        return <Results />;
      case 'matchup-results':
        return <MatchupResults />;
      case 'stats':
        return <PlayerStats />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  );
};

function App() {
  return (
    <FantasyProvider>
      <AppContent />
    </FantasyProvider>
  );
}

export default App;
