import { useState, useEffect } from 'react';
import { supabase, getLineupSlots } from '../lib/supabase';
import { Calendar, TrendingUp, Users } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  tournament_name: string;
  category: string;
  type: string;
  round_number: number;
  is_active: boolean;
}

interface LeagueTeam {
  id: string;
  name: string;
  credits: number;
}

interface Matchup {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  is_completed: boolean;
}

interface MatchDisplay {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
  tournamentSlots: number;
}

export default function Matches() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<MatchDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadTournaments();
    loadTeams();
  }, []);

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('round_number', { ascending: true });

    if (data) {
      setTournaments(data);
    }
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from('league_teams')
      .select('id, name');

    if (data) {
      const teamMap = new Map(data.map(t => [t.id, t.name]));
      setTeams(teamMap);
    }
  };

  const loadMatches = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      const { data: matchups } = await supabase
        .from('matchups')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .order('created_at', { ascending: true });

      if (!matchups || matchups.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const displayMatches: MatchDisplay[] = matchups.map(matchup => ({
        id: matchup.id,
        homeTeam: teams.get(matchup.home_team_id) || 'Unknown',
        awayTeam: teams.get(matchup.away_team_id) || 'Unknown',
        homeScore: matchup.home_score,
        awayScore: matchup.away_score,
        isCompleted: matchup.is_completed,
        tournamentSlots: getLineupSlots(selectedTournament.category)
      }));

      setMatches(displayMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTournament && teams.size > 0) {
      loadMatches();
    }
  }, [selectedTournament, teams]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">2026 League Matches</h1>
        </div>
        <p className="text-gray-600">Tournament schedule and head-to-head matchups</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Tournament Round
        </label>
        <select
          value={selectedTournament?.id || ''}
          onChange={(e) => {
            const tournament = tournaments.find(t => t.id === e.target.value);
            setSelectedTournament(tournament || null);
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Choose a tournament...</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              T{t.round_number}: {t.tournament_name || t.name} ({t.category}) - {getLineupSlots(t.category)} slots
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-gray-600">Loading matches...</p>
        </div>
      )}

      {!loading && matches.length === 0 && selectedTournament && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Calendar className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-800">No matches scheduled for this tournament</p>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Match Scoring System</h3>
            </div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Each position duel (Slot 1 vs Slot 1, etc.): Win = 3pts, Draw = 1pt, Loss = 0pts</li>
              <li>• Tournament uses {selectedTournament ? getLineupSlots(selectedTournament.category) : 0} lineup slots</li>
              <li>• Highest total match score wins the round</li>
            </ul>
          </div>

          <div className="grid gap-6">
            {matches.map((match) => (
              <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <h3 className="text-2xl font-bold text-white mb-2">{match.homeTeam}</h3>
                      <div className="text-5xl font-bold text-white">{match.homeScore}</div>
                      <div className="text-sm text-green-100 mt-2">match points</div>
                    </div>

                    <div className="px-8">
                      <div className="text-white text-3xl font-bold">VS</div>
                    </div>

                    <div className="flex-1 text-center">
                      <h3 className="text-2xl font-bold text-white mb-2">{match.awayTeam}</h3>
                      <div className="text-5xl font-bold text-white">{match.awayScore}</div>
                      <div className="text-sm text-green-100 mt-2">match points</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="text-center">
                    {match.isCompleted ? (
                      <>
                        {match.homeScore > match.awayScore && (
                          <div className="text-green-700 font-semibold text-lg">
                            Winner: {match.homeTeam}
                          </div>
                        )}
                        {match.awayScore > match.homeScore && (
                          <div className="text-green-700 font-semibold text-lg">
                            Winner: {match.awayTeam}
                          </div>
                        )}
                        {match.homeScore === match.awayScore && (
                          <div className="text-gray-700 font-semibold text-lg">
                            Match Draw
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500 italic">
                        Match not yet completed - Lineups pending
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
