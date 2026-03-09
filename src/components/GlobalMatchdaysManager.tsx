import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Play, RefreshCw } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  type: string;
  round_number: number;
  opponents_count: number;
  is_active: boolean;
}

export default function GlobalMatchdaysManager() {
  const [matchdays, setMatchdays] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [activeMatchday, setActiveMatchday] = useState<Tournament | null>(null);

  useEffect(() => {
    loadMatchdays();
  }, []);

  const loadMatchdays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('round_number', { ascending: true });

    if (error) {
      alert('Errore caricamento giornate: ' + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setMatchdays(data);
      const active = data.find(m => m.is_active);
      setActiveMatchday(active || null);
    }
    setLoading(false);
  };

  const initializeCalendar = async () => {
    if (!confirm('Questo cancellerà tutti i tornei esistenti e popolerà il calendario con i 30 turni dal CSV. Continuare?')) {
      return;
    }

    setInitializing(true);

    try {
      // Step 1: Delete all existing tournaments
      console.log('🧹 Cancellazione tornei esistenti...');
      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Step 2: Insert all 30 tournaments based on CSV
      console.log('📝 Inserimento 30 giornate dal CSV...');

      const tournamentsData = [
        { round_number: 1, name: 'Australian Open', type: 'SLAM (3 Sett)', opponents_count: 3, lineup_slots: 12, is_active: true, duration_days: 21 },
        { round_number: 2, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 3, name: 'ATP/WTA 500-250', type: 'Misto 500/250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 4, name: 'Master 1000', type: 'Master 1000', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 7 },
        { round_number: 5, name: 'Master 1000', type: 'Master 1000', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 7 },
        { round_number: 6, name: 'ATP/WTA 500-250', type: 'Misto 500/250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 7, name: 'Indian Wells', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 8, name: 'Miami Open', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 9, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 10, name: 'Monte Carlo Masters', type: 'ATP 1000 solo maschi', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 7 },
        { round_number: 11, name: 'ATP/WTA 500-250', type: 'Misto 500/250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 12, name: 'Madrid Open', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 13, name: 'Rome Masters', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 14, name: 'Roland Garros', type: 'SLAM + Lead-up (3 Sett)', opponents_count: 3, lineup_slots: 12, is_active: false, duration_days: 21 },
        { round_number: 15, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 16, name: 'ATP/WTA 500', type: '500', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 17, name: 'Wimbledon', type: 'SLAM (3 Sett)', opponents_count: 3, lineup_slots: 12, is_active: false, duration_days: 21 },
        { round_number: 18, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 19, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 20, name: 'ATP/WTA 500', type: '500', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 21, name: 'Canada Masters', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 22, name: 'Cincinnati Masters', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 23, name: 'US Open', type: 'SLAM (2 Sett)', opponents_count: 3, lineup_slots: 12, is_active: false, duration_days: 14 },
        { round_number: 24, name: 'WTA 250', type: '250 solo donne', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 25, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 26, name: 'Master 1000', type: 'MASTER 1000', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 7 },
        { round_number: 27, name: 'Shanghai Masters', type: 'MASTER 1000 (12 Giorni)', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 12 },
        { round_number: 28, name: 'ATP 250', type: '250', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 29, name: 'ATP/WTA 500', type: '500', opponents_count: 1, lineup_slots: 10, is_active: false, duration_days: 7 },
        { round_number: 30, name: 'Paris Masters', type: 'MASTER 1000', opponents_count: 2, lineup_slots: 12, is_active: false, duration_days: 7 },
      ];

      const { error: insertError } = await supabase
        .from('tournaments')
        .insert(tournamentsData);

      if (insertError) throw insertError;

      console.log('✅ 30 giornate inserite con successo!');
      alert('✅ Calendario inizializzato! 30 giornate caricate. Australian Open impostato come attivo.');

      // Reload matchdays to show in table
      await loadMatchdays();

    } catch (error: any) {
      console.error('❌ Errore inizializzazione:', error);
      alert('Errore durante l\'inizializzazione: ' + error.message);
    } finally {
      setInitializing(false);
    }
  };

  const setActive = async (tournamentId: string) => {
    setLoading(true);

    // Use the database function to ensure single active matchday
    const { error } = await supabase.rpc('set_active_matchday', {
      p_tournament_id: tournamentId
    });

    if (error) {
      alert('Errore attivazione giornata: ' + error.message);
      setLoading(false);
      return;
    }

    alert('✅ Giornata attivata! Ora puoi salvare le Lineup.');
    await loadMatchdays();
  };

  const getTypeLabel = (type: string | null | undefined) => {
    if (!type) return '🎾 Tournament';
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('SLAM')) return '🏆 SLAM (3 match)';
    if (typeUpper.includes('1000') || typeUpper.includes('MASTER')) return '⭐ Master 1000 (2 match)';
    if (typeUpper.includes('500')) return '🎾 ATP 500 (1 match)';
    return '🎾 ATP 250 (1 match)';
  };

  if (loading && matchdays.length === 0) {
    return <div className="text-center py-8 text-gray-400">Caricamento giornate...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-white">
            <Calendar className="w-6 h-6" />
            Calendario Globale 30 Giornate
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {matchdays.length === 0
              ? 'Usa il pulsante di inizializzazione per caricare il calendario dal CSV.'
              : 'Le 30 giornate sono caricate. Imposta quale è attualmente attiva per permettere il salvataggio delle Lineup.'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={initializeCalendar}
            disabled={initializing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin' : ''}`} />
            {initializing ? 'Inizializzazione...' : '🔄 Inizializza Calendario da CSV'}
          </button>
          <button
            onClick={loadMatchdays}
            disabled={loading || initializing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </button>
        </div>
      </div>

      {activeMatchday && (
        <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <Play className="w-5 h-5" />
            Giornata Attiva: Round {activeMatchday.round_number ?? '?'} - {activeMatchday.name ?? 'Unknown'}
          </div>
          <p className="text-gray-300 text-sm mt-1">
            {getTypeLabel(activeMatchday.type)}
          </p>
        </div>
      )}

      {matchdays.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Calendario Non Inizializzato
          </h3>
          <p className="text-gray-400 mb-6">
            Clicca sul pulsante "Inizializza Calendario da CSV" per popolare le 30 giornate del campionato 2026.
          </p>
          <button
            onClick={initializeCalendar}
            disabled={initializing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 font-semibold text-lg"
          >
            <RefreshCw className={`w-5 h-5 ${initializing ? 'animate-spin' : ''}`} />
            {initializing ? 'Inizializzazione in corso...' : '🔄 Inizializza Calendario'}
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Round</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Nome Torneo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tipo</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Match/Squadra</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Stato</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {matchdays.map((matchday) => (
                  <tr
                    key={matchday.id}
                    className={`hover:bg-gray-700/50 ${matchday.is_active ? 'bg-green-900/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-white font-semibold">
                      {matchday.round_number ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {matchday.name ?? 'Unknown Tournament'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {getTypeLabel(matchday.type)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-200">
                      {matchday.opponents_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {matchday.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                          <Play className="w-3 h-3" />
                          ATTIVO
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Inattivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setActive(matchday.id)}
                        disabled={loading || matchday.is_active}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {matchday.is_active ? 'Già Attivo' : 'Imposta Attivo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
