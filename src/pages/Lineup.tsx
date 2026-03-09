import React, { useState, useEffect } from 'react';
import { useFantasy } from '../context/FantasyContext';
import { Users, Save, AlertCircle, Crown, Wand2 } from 'lucide-react';
import { supabase, Player } from '../lib/supabase';

type TournamentType = 'SLAM' | '1000' | '500' | '250';

interface DoublePair {
  atp: Player | null;
  wta: Player | null;
}

interface DoublesReserves {
  puro: Player | null;
  libero: Player | null;
}

interface FormationState {
  atpSingles: (Player | null)[];
  wtaSingles: (Player | null)[];
  doubles: DoublePair[];
  captain: Player | null;
  reservesSinglesAtp: (Player | null)[];
  reservesSinglesWta: (Player | null)[];
  reservesDoublesAtp: DoublesReserves;
  reservesDoublesWta: DoublesReserves;
}

export const Lineup: React.FC = () => {
  const { mySquad, currentTournament, user, generateMockRoster, refreshTournament } = useFantasy();

  // Default safe formation structure
  const getDefaultFormation = (): FormationState => ({
    atpSingles: [null, null, null, null, null],
    wtaSingles: [null, null, null, null, null],
    doubles: [
      { atp: null, wta: null },
      { atp: null, wta: null }
    ],
    captain: null,
    reservesSinglesAtp: [null, null, null],
    reservesSinglesWta: [null, null, null],
    reservesDoublesAtp: { puro: null, libero: null },
    reservesDoublesWta: { pura: null, libera: null },
  });

  const [formation, setFormation] = useState<FormationState>(getDefaultFormation());
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  console.log('Lineup rendered, formation is:', formation);

  const atpPlayers = mySquad.filter(s => s.player?.tour === 'ATP').map(s => s.player!);
  const wtaPlayers = mySquad.filter(s => s.player?.tour === 'WTA').map(s => s.player!);

  const getTournamentType = (): TournamentType => {
    if (!currentTournament) return '1000';
    const type = currentTournament.type.toUpperCase();
    if (type === 'SLAM') return 'SLAM';
    if (type === '1000' || type === 'MASTER 1000' || type === 'MASTER') return '1000';
    if (type === '500') return '500';
    if (type === '250') return '250';
    return '1000';
  };

  const tournamentType = getTournamentType();

  // Dynamic singles count based on tournament weight (lineup_slots)
  // Weight 1 (250/500): 10 slots = 4 ATP + 4 WTA + 2 Doubles
  // Weight 2/3 (Master/SLAM): 12 slots = 5 ATP + 5 WTA + 2 Doubles
  const singlesCount = currentTournament?.lineup_slots === 10 ? 4 : 5;

  useEffect(() => {
    const handleTournamentChange = async () => {
      if (!currentTournament || !user) return;

      console.log('🔄 Tournament changed, cleaning up lineup for new slot count:', singlesCount);

      const { data: teamData } = await supabase
        .from('league_teams')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamData) return;

      const { data: existingLineup } = await supabase
        .from('team_lineups')
        .select('player_ids')
        .eq('team_id', teamData.id)
        .eq('tournament_id', currentTournament.id)
        .maybeSingle();

      if (existingLineup && existingLineup.player_ids) {
        const savedData = existingLineup.player_ids as any;

        const cleanedData = {
          ...savedData,
          singles_atp: (savedData.singles_atp || []).slice(0, singlesCount),
          singles_wta: (savedData.singles_wta || []).slice(0, singlesCount),
        };

        await supabase
          .from('team_lineups')
          .update({ player_ids: cleanedData })
          .eq('team_id', teamData.id)
          .eq('tournament_id', currentTournament.id);

        console.log('✅ Cleaned database lineup to fit new slot count');
      }

      setFormation(prev => {
        const newFormation = getDefaultFormation();
        newFormation.atpSingles = Array(singlesCount).fill(null);
        newFormation.wtaSingles = Array(singlesCount).fill(null);
        return newFormation;
      });
    };

    handleTournamentChange();
  }, [currentTournament?.id, singlesCount]);

  useEffect(() => {
    const initLineupPage = async () => {
      console.log('🔄 Lineup: Page mounted, refreshing tournament from database...');
      await refreshTournament();
    };
    initLineupPage();
  }, []);

  useEffect(() => {
    loadSavedLineup();
  }, [currentTournament, mySquad, user]);

  const loadSavedLineup = async () => {
    if (!currentTournament || !user) return;

    const { data: teamData } = await supabase
      .from('league_teams')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!teamData) return;

    const { data: lineup } = await supabase
      .from('team_lineups')
      .select('player_ids')
      .eq('team_id', teamData.id)
      .eq('tournament_id', currentTournament.id)
      .maybeSingle();

    if (lineup && lineup.player_ids) {
      const savedData = lineup.player_ids as any;

      if (savedData.singles_atp && savedData.singles_wta && savedData.doubles) {
        // SAFE MERGE: start with default structure, then override with saved data
        // IMPORTANT: Only load players up to the current tournament's slot limit
        const loadedFormation: FormationState = {
          ...getDefaultFormation(), // Start with safe defaults
          atpSingles: savedData.singles_atp.slice(0, singlesCount).map((id: string | null) =>
            id ? atpPlayers.find(p => p.id === id) || null : null
          ),
          wtaSingles: savedData.singles_wta.slice(0, singlesCount).map((id: string | null) =>
            id ? wtaPlayers.find(p => p.id === id) || null : null
          ),
          doubles: savedData.doubles.map((d: any) => ({
            atp: d.atp ? atpPlayers.find(p => p.id === d.atp) || null : null,
            wta: d.wta ? wtaPlayers.find(p => p.id === d.wta) || null : null,
          })),
          captain: savedData.captain_id
            ? [...atpPlayers, ...wtaPlayers].find(p => p.id === savedData.captain_id) || null
            : null,
          reservesSinglesAtp: savedData.reserves_singles_atp
            ? savedData.reserves_singles_atp.map((id: string | null) =>
                id ? atpPlayers.find(p => p.id === id) || null : null
              )
            : [null, null, null],
          reservesSinglesWta: savedData.reserves_singles_wta
            ? savedData.reserves_singles_wta.map((id: string | null) =>
                id ? wtaPlayers.find(p => p.id === id) || null : null
              )
            : [null, null, null],
          reservesDoublesAtp: {
            puro: savedData.reserves_doubles_atp?.puro
              ? atpPlayers.find(p => p.id === savedData.reserves_doubles_atp.puro) || null
              : null,
            libero: savedData.reserves_doubles_atp?.libero
              ? atpPlayers.find(p => p.id === savedData.reserves_doubles_atp.libero) || null
              : null,
          },
          reservesDoublesWta: {
            pura: savedData.reserves_doubles_wta?.pura
              ? wtaPlayers.find(p => p.id === savedData.reserves_doubles_wta.pura) || null
              : null,
            libera: savedData.reserves_doubles_wta?.libera
              ? wtaPlayers.find(p => p.id === savedData.reserves_doubles_wta.libera) || null
              : null,
          },
        };
        setFormation(loadedFormation);
      }
    }
  };

  const getUsedSinglesIds = (excludeIndex?: number, reserveType?: 'atp' | 'wta') => {
    const ids = new Set<string>();
    if (!formation) return ids;

    (formation.atpSingles || []).forEach(p => p && ids.add(p.id));
    (formation.wtaSingles || []).forEach(p => p && ids.add(p.id));
    (formation.reservesSinglesAtp || []).forEach((p, idx) => {
      if (p && !(reserveType === 'atp' && idx === excludeIndex)) {
        ids.add(p.id);
      }
    });
    (formation.reservesSinglesWta || []).forEach((p, idx) => {
      if (p && !(reserveType === 'wta' && idx === excludeIndex)) {
        ids.add(p.id);
      }
    });
    return ids;
  };

  const getUsedDoublesIds = (excludeDoubleIndex?: number, excludeReserveType?: 'puro' | 'libero' | 'pura' | 'libera') => {
    const ids = new Set<string>();
    if (!formation) return ids;

    (formation.doubles || []).forEach((d, idx) => {
      if (idx !== excludeDoubleIndex) {
        if (d?.atp) ids.add(d.atp.id);
        if (d?.wta) ids.add(d.wta.id);
      }
    });
    if (excludeReserveType !== 'puro' && formation.reservesDoublesAtp?.puro) {
      ids.add(formation.reservesDoublesAtp.puro.id);
    }
    if (excludeReserveType !== 'libero' && formation.reservesDoublesAtp?.libero) {
      ids.add(formation.reservesDoublesAtp.libero.id);
    }
    if (excludeReserveType !== 'pura' && formation.reservesDoublesWta?.pura) {
      ids.add(formation.reservesDoublesWta.pura.id);
    }
    if (excludeReserveType !== 'libera' && formation.reservesDoublesWta?.libera) {
      ids.add(formation.reservesDoublesWta.libera.id);
    }
    return ids;
  };

  const getUsedPlayerIds = () => {
    const ids = new Set<string>();
    if (!formation) return ids;

    // All singles (main + reserves)
    (formation.atpSingles || []).forEach(p => p && ids.add(p.id));
    (formation.wtaSingles || []).forEach(p => p && ids.add(p.id));
    (formation.reservesSinglesAtp || []).forEach(p => p && ids.add(p.id));
    (formation.reservesSinglesWta || []).forEach(p => p && ids.add(p.id));

    // All doubles
    (formation.doubles || []).forEach(d => {
      if (d?.atp) ids.add(d.atp.id);
      if (d?.wta) ids.add(d.wta.id);
    });

    // Doubles reserves
    if (formation.reservesDoublesAtp?.puro) ids.add(formation.reservesDoublesAtp.puro.id);
    if (formation.reservesDoublesAtp?.libero) ids.add(formation.reservesDoublesAtp.libero.id);
    if (formation.reservesDoublesWta?.pura) ids.add(formation.reservesDoublesWta.pura.id);
    if (formation.reservesDoublesWta?.libera) ids.add(formation.reservesDoublesWta.libera.id);

    return ids;
  };

  const getGruppoSingolaristi = () => {
    const ids = new Set<string>();
    if (!formation) return ids;

    (formation.atpSingles || []).forEach(p => p && ids.add(p.id));
    (formation.wtaSingles || []).forEach(p => p && ids.add(p.id));
    (formation.reservesSinglesAtp || []).forEach(p => p && ids.add(p.id));
    (formation.reservesSinglesWta || []).forEach(p => p && ids.add(p.id));
    return ids;
  };

  const countGruppoSingolaristiInDoubles = (tour: 'ATP' | 'WTA', excludeDoubleIndex?: number) => {
    const gruppoIds = getGruppoSingolaristi();
    let count = 0;
    if (!formation || !formation.doubles) return count;

    (formation.doubles || []).forEach((d, idx) => {
      if (idx !== excludeDoubleIndex) {
        if (tour === 'ATP' && d?.atp && gruppoIds.has(d.atp.id)) count++;
        if (tour === 'WTA' && d?.wta && gruppoIds.has(d.wta.id)) count++;
      }
    });
    return count;
  };

  const setAtpSingle = (index: number, player: Player | null) => {
    if (!formation) return;
    const newSingles = [...(formation.atpSingles || [])];
    newSingles[index] = player;
    setFormation({ ...formation, atpSingles: newSingles });
  };

  const setWtaSingle = (index: number, player: Player | null) => {
    if (!formation) return;
    const newSingles = [...(formation.wtaSingles || [])];
    newSingles[index] = player;
    setFormation({ ...formation, wtaSingles: newSingles });
  };

  const setDouble = (index: number, type: 'atp' | 'wta', player: Player | null) => {
    if (!formation) return;
    const newDoubles = [...(formation.doubles || [])];
    newDoubles[index] = { ...(newDoubles[index] || { atp: null, wta: null }), [type]: player };
    setFormation({ ...formation, doubles: newDoubles });
  };

  const setReserveSinglesAtp = (index: number, player: Player | null) => {
    if (!formation) return;
    const newReserves = [...(formation.reservesSinglesAtp || [])];
    newReserves[index] = player;
    setFormation({ ...formation, reservesSinglesAtp: newReserves });
  };

  const setReserveSinglesWta = (index: number, player: Player | null) => {
    if (!formation) return;
    const newReserves = [...(formation.reservesSinglesWta || [])];
    newReserves[index] = player;
    setFormation({ ...formation, reservesSinglesWta: newReserves });
  };

  const setReserveDoublesAtp = (type: 'puro' | 'libero', player: Player | null) => {
    if (!formation) return;
    setFormation({
      ...formation,
      reservesDoublesAtp: { ...(formation.reservesDoublesAtp || { puro: null, libero: null }), [type]: player }
    });
  };

  const setReserveDoublesWta = (type: 'pura' | 'libera', player: Player | null) => {
    if (!formation) return;
    setFormation({
      ...formation,
      reservesDoublesWta: { ...(formation.reservesDoublesWta || { pura: null, libera: null }), [type]: player }
    });
  };

  const validateLineup = (): boolean => {
    const newErrors: string[] = [];

    if (!formation) {
      setErrors(['Errore: formazione non inizializzata']);
      return false;
    }

    const atpSinglesPlayers = (formation.atpSingles || []).filter(p => p !== null) as Player[];
    const wtaSinglesPlayers = (formation.wtaSingles || []).filter(p => p !== null) as Player[];

    if (atpSinglesPlayers.length < singlesCount) {
      newErrors.push(`Devi selezionare ${singlesCount} giocatori ATP per i singolari`);
    }
    if (wtaSinglesPlayers.length < singlesCount) {
      newErrors.push(`Devi selezionare ${singlesCount} giocatrici WTA per i singolari`);
    }

    if (atpSinglesPlayers.length === singlesCount && atpSinglesPlayers[0]) {
      const rankings = atpSinglesPlayers.map(p => p.fixed_ranking || p.ranking);
      const bestRanking = Math.min(...rankings);
      const worstRanking = Math.max(...rankings);

      const firstPlayerRanking = atpSinglesPlayers[0].fixed_ranking || atpSinglesPlayers[0].ranking;
      const lastPlayerRanking = atpSinglesPlayers[singlesCount - 1].fixed_ranking || atpSinglesPlayers[singlesCount - 1].ranking;

      if (firstPlayerRanking !== bestRanking) {
        newErrors.push(`❌ ERRORE: Il Singolarista ATP 1 DEVE avere il ranking migliore. Attualmente: #${firstPlayerRanking}, ma il migliore è #${bestRanking}`);
      }
      if (lastPlayerRanking !== worstRanking) {
        const worstPlayer = atpSinglesPlayers.find(p => (p.fixed_ranking || p.ranking) === worstRanking);
        newErrors.push(`❌ Errore: Il giocatore con il ranking peggiore (#${worstRanking} ${worstPlayer?.name}) deve occupare l'ultimo slot dei singolari (Singolo ${singlesCount}). Attualmente nell'ultimo slot: #${lastPlayerRanking} ${atpSinglesPlayers[singlesCount - 1].name}`);
      }
    }

    if (wtaSinglesPlayers.length === singlesCount && wtaSinglesPlayers[0]) {
      const rankings = wtaSinglesPlayers.map(p => p.fixed_ranking || p.ranking);
      const bestRanking = Math.min(...rankings);
      const worstRanking = Math.max(...rankings);

      const firstPlayerRanking = wtaSinglesPlayers[0].fixed_ranking || wtaSinglesPlayers[0].ranking;
      const lastPlayerRanking = wtaSinglesPlayers[singlesCount - 1].fixed_ranking || wtaSinglesPlayers[singlesCount - 1].ranking;

      if (firstPlayerRanking !== bestRanking) {
        newErrors.push(`❌ ERRORE: La Singolarista WTA 1 DEVE avere il ranking migliore. Attualmente: #${firstPlayerRanking}, ma la migliore è #${bestRanking}`);
      }
      if (lastPlayerRanking !== worstRanking) {
        const worstPlayer = wtaSinglesPlayers.find(p => (p.fixed_ranking || p.ranking) === worstRanking);
        newErrors.push(`❌ Errore: La giocatrice con il ranking peggiore (#${worstRanking} ${worstPlayer?.name}) deve occupare l'ultimo slot dei singolari (Singolo ${singlesCount}). Attualmente nell'ultimo slot: #${lastPlayerRanking} ${wtaSinglesPlayers[singlesCount - 1].name}`);
      }
    }

    const doublesAtpPlayers = (formation.doubles || []).map(d => d?.atp).filter(p => p !== null) as Player[];
    const doublesWtaPlayers = (formation.doubles || []).map(d => d?.wta).filter(p => p !== null) as Player[];

    if (doublesAtpPlayers.length < 2) {
      newErrors.push('Devi selezionare 2 giocatori ATP per i doppi misti');
    }
    if (doublesWtaPlayers.length < 2) {
      newErrors.push('Devi selezionare 2 giocatrici WTA per i doppi misti');
    }

    const gruppoSingolaristi = getGruppoSingolaristi();
    const atpDoublesNotInGruppo = doublesAtpPlayers.filter(p => !gruppoSingolaristi.has(p.id)).length;
    const wtaDoublesNotInGruppo = doublesWtaPlayers.filter(p => !gruppoSingolaristi.has(p.id)).length;

    if (atpDoublesNotInGruppo < 1) {
      newErrors.push('❌ REGOLA DOPPI: Esattamente 1 giocatore ATP dei doppi NON deve far parte del Gruppo Singolaristi (Titolari + Riserve)');
    }
    if (atpDoublesNotInGruppo > 1) {
      newErrors.push('❌ REGOLA DOPPI: Solo 1 giocatore ATP dei doppi può essere "Doppista Puro" (esterno al Gruppo Singolaristi)');
    }
    if (wtaDoublesNotInGruppo < 1) {
      newErrors.push('❌ REGOLA DOPPI: Esattamente 1 giocatrice WTA dei doppi NON deve far parte del Gruppo Singolaristi (Titolari + Riserve)');
    }
    if (wtaDoublesNotInGruppo > 1) {
      newErrors.push('❌ REGOLA DOPPI: Solo 1 giocatrice WTA dei doppi può essere "Doppista Pura" (esterna al Gruppo Singolaristi)');
    }

    if (formation.reservesDoublesAtp?.puro && gruppoSingolaristi.has(formation.reservesDoublesAtp.puro.id)) {
      newErrors.push('❌ RISERVA DOPPI ATP: Il "Doppista Puro" NON deve far parte del Gruppo Singolaristi');
    }
    if (formation.reservesDoublesWta?.pura && gruppoSingolaristi.has(formation.reservesDoublesWta.pura.id)) {
      newErrors.push('❌ RISERVA DOPPI WTA: La "Doppista Pura" NON deve far parte del Gruppo Singolaristi');
    }

    (formation.doubles || []).forEach((double, idx) => {
      if (!double.atp || !double.wta) {
        newErrors.push(`Doppio Misto ${idx + 1} deve avere sia un giocatore ATP che una giocatrice WTA`);
      }
    });

    if (!formation?.captain) {
      newErrors.push('❌ Devi selezionare un Capitano');
    }

    const checkDuplicatesInArray = (players: (Player | null)[], sectionName: string) => {
      const ids = new Set<string>();
      players.filter(p => p !== null).forEach(p => {
        if (ids.has(p!.id)) {
          newErrors.push(`❌ DUPLICATO in ${sectionName}: ${p!.name} è stato selezionato più di una volta`);
        }
        ids.add(p!.id);
      });
    };

    checkDuplicatesInArray(formation.atpSingles || [], 'Singolari ATP Titolari');
    checkDuplicatesInArray(formation.wtaSingles || [], 'Singolari WTA Titolari');
    checkDuplicatesInArray(formation.reservesSinglesAtp || [], 'Riserve Singolari ATP');
    checkDuplicatesInArray(formation.reservesSinglesWta || [], 'Riserve Singolari WTA');

    const doublesAtpIds = new Set<string>();
    (formation.doubles || []).forEach((d, idx) => {
      if (d.atp) {
        if (doublesAtpIds.has(d.atp.id)) {
          newErrors.push(`❌ DUPLICATO Doppi ATP: ${d.atp.name} è stato usato in più doppi`);
        }
        doublesAtpIds.add(d.atp.id);
      }
    });

    const doublesWtaIds = new Set<string>();
    (formation.doubles || []).forEach((d, idx) => {
      if (d?.wta) {
        if (doublesWtaIds.has(d.wta.id)) {
          newErrors.push(`❌ DUPLICATO Doppi WTA: ${d.wta.name} è stata usata in più doppi`);
        }
        doublesWtaIds.add(d.wta.id);
      }
    });

    const doublesReservesAtpAll = [
      formation.reservesDoublesAtp?.puro,
      formation.reservesDoublesAtp?.libero
    ].filter(p => p !== null);
    checkDuplicatesInArray(doublesReservesAtpAll, 'Riserve Doppi ATP');

    const doublesReservesWtaAll = [
      formation.reservesDoublesWta?.pura,
      formation.reservesDoublesWta?.libera
    ].filter(p => p !== null);
    checkDuplicatesInArray(doublesReservesWtaAll, 'Riserve Doppi WTA');

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateLineup()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!currentTournament) {
      alert('Nessun torneo attivo');
      return;
    }

    if (!user) {
      alert('Devi essere loggato per salvare la formazione');
      return;
    }

    setLoading(true);

    try {
      const { data: teamData } = await supabase
        .from('league_teams')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamData) {
        alert('Team non trovato');
        return;
      }

      const lineupData = {
        singles_atp: (formation.atpSingles || []).map(p => p?.id || null),
        singles_wta: (formation.wtaSingles || []).map(p => p?.id || null),
        doubles: (formation.doubles || []).map(d => ({
          atp: d?.atp?.id || null,
          wta: d?.wta?.id || null,
        })),
        captain_id: formation?.captain?.id || null,
        reserves_singles_atp: (formation.reservesSinglesAtp || []).map(p => p?.id || null),
        reserves_singles_wta: (formation.reservesSinglesWta || []).map(p => p?.id || null),
        reserves_doubles_atp: {
          puro: formation.reservesDoublesAtp?.puro?.id || null,
          libero: formation.reservesDoublesAtp?.libero?.id || null,
        },
        reserves_doubles_wta: {
          pura: formation.reservesDoublesWta?.pura?.id || null,
          libera: formation.reservesDoublesWta?.libera?.id || null,
        },
      };

      const { error } = await supabase
        .from('team_lineups')
        .upsert({
          team_id: teamData.id,
          tournament_id: currentTournament.id,
          player_ids: lineupData,
        }, {
          onConflict: 'team_id,tournament_id'
        });

      if (error) {
        alert('Errore nel salvataggio: ' + error.message);
      } else {
        alert('✅ Formazione salvata con successo!');
      }
    } catch (error) {
      alert('Errore: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (mySquad.length < 20) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 border-2 border-[#ccff00] text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-[#ccff00] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Rosa Incompleta</h2>
          <p className="text-slate-300 mb-4">
            Hai bisogno di una rosa completa di 20 giocatori (10 ATP + 10 WTA) prima di poter schierare la formazione.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Attualmente: {mySquad.length}/20 giocatori
          </p>

          <button
            onClick={generateMockRoster}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition-all shadow-lg"
          >
            <Wand2 className="w-5 h-5" />
            <span>🎲 Genera Squadra di Test (20 Giocatori)</span>
          </button>
          <p className="text-slate-500 text-xs mt-3">
            Crea automaticamente una rosa mista con 10 ATP + 10 WTA per testare la formazione
          </p>
        </div>
      </div>
    );
  }

  const getModuleDescription = () => {
    if (tournamentType === 'SLAM') return 'SLAM: 5 ATP + 5 WTA + 2 Doppi Misti (12 match totali)';
    if (tournamentType === '1000') return 'MASTER 1000: 5 ATP + 5 WTA + 2 Doppi Misti (12 match totali)';
    if (tournamentType === '500') return 'ATP 500: 4 ATP + 4 WTA + 2 Doppi Misti (10 match totali)';
    if (tournamentType === '250') return 'ATP 250: 4 ATP + 4 WTA + 2 Doppi Misti (10 match totali)';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center space-x-3 mb-2">
              <Users className="w-10 h-10 text-[#ccff00]" />
              <span>Schieramento Formazione</span>
            </h1>
            {currentTournament && (
              <div className="text-slate-400 text-sm">
                {currentTournament.tournament_name} - Round {currentTournament.round_number}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateMockRoster}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all text-sm"
            >
              <Wand2 className="w-4 h-4" />
              <span>Rigenera Test Squad</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-[#ccff00] hover:bg-[#b8e600] text-slate-900 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Salvando...' : 'Salva Formazione'}</span>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 mb-6 border-2 border-[#ccff00]">
          <div className="space-y-2">
            {currentTournament ? (
              <>
                <div className="text-[#ccff00] font-bold text-xl">
                  🏆 Torneo Attivo: {currentTournament.tournament_name}
                </div>
                <div className="text-white font-semibold text-base">
                  Peso: {currentTournament.opponents_count} | Slot Totali: {currentTournament.lineup_slots} | Singolari: {singlesCount} ATP + {singlesCount} WTA
                </div>
                <div className="text-slate-300 text-sm">
                  📋 Modulo: {getModuleDescription()}
                </div>
              </>
            ) : (
              <div className="text-yellow-400 font-bold">
                ⚠️ Nessun torneo attivo. Vai su Admin per attivarne uno.
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-bold mb-2">Errori nella Formazione:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-red-300 font-semibold">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
            <h2 className="text-2xl font-bold text-[#ccff00] mb-4">
              🎾 Singolari ATP
            </h2>
            <div className="space-y-3">
              {(formation?.atpSingles || []).slice(0, singlesCount).map((player, idx) => (
                <div key={idx}>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    {idx === 0 && '🏆 '}Singolo {idx + 1}
                    {idx === 0 && ' (DEVE essere il MIGLIORE ranking)'}
                    {idx === singlesCount - 1 && ' (DEVE essere il PEGGIORE ranking)'}
                  </label>
                  <select
                    value={player?.id || ''}
                    onChange={(e) => {
                      const p = atpPlayers.find(pl => pl.id === e.target.value);
                      setAtpSingle(idx, p || null);
                    }}
                    className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona giocatore</option>
                    {atpPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedIds = getUsedPlayerIds();
                        const isUsed = usedIds.has(p.id) && p.id !== player?.id;
                        return (
                          <option key={p.id} value={p.id} disabled={isUsed}>
                            #{p.fixed_ranking || p.ranking} {p.name} {isUsed ? '(già schierato)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600">
            <h2 className="text-2xl font-bold text-pink-400 mb-4">
              🎾 Singolari WTA
            </h2>
            <div className="space-y-3">
              {(formation?.wtaSingles || []).slice(0, singlesCount).map((player, idx) => (
                <div key={idx}>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    {idx === 0 && '🏆 '}Singolo {idx + 1}
                    {idx === 0 && ' (DEVE essere il MIGLIORE ranking)'}
                    {idx === singlesCount - 1 && ' (DEVE essere il PEGGIORE ranking)'}
                  </label>
                  <select
                    value={player?.id || ''}
                    onChange={(e) => {
                      const p = wtaPlayers.find(pl => pl.id === e.target.value);
                      setWtaSingle(idx, p || null);
                    }}
                    className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona giocatrice</option>
                    {wtaPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedIds = getUsedPlayerIds();
                        const isUsed = usedIds.has(p.id) && p.id !== player?.id;
                        return (
                          <option key={p.id} value={p.id} disabled={isUsed}>
                            #{p.fixed_ranking || p.ranking} {p.name} {isUsed ? '(già schierata)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
            <h2 className="text-2xl font-bold text-[#ccff00] mb-2">
              🪑 Panchina Singolari ATP
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Riserve per i Singolari ATP. L'ordine (1, 2, 3) stabilisce la priorità di ingresso in caso di sostituzione.
            </p>
            <div className="space-y-3">
              {(formation?.reservesSinglesAtp || []).map((player, idx) => (
                <div key={idx}>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    Riserva {idx + 1}
                  </label>
                  <select
                    value={player?.id || ''}
                    onChange={(e) => {
                      const p = atpPlayers.find(pl => pl.id === e.target.value);
                      setReserveSinglesAtp(idx, p || null);
                    }}
                    className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona riserva</option>
                    {atpPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedIds = getUsedSinglesIds(idx, 'atp');
                        const isUsed = usedIds.has(p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={isUsed}>
                            #{p.fixed_ranking || p.ranking} {p.name} {isUsed ? '(già usato in singolari)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
            <h2 className="text-2xl font-bold text-pink-400 mb-2">
              🪑 Panchina Singolari WTA
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Riserve per i Singolari WTA. L'ordine (1, 2, 3) stabilisce la priorità di ingresso in caso di sostituzione.
            </p>
            <div className="space-y-3">
              {(formation?.reservesSinglesWta || []).map((player, idx) => (
                <div key={idx}>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    Riserva {idx + 1}
                  </label>
                  <select
                    value={player?.id || ''}
                    onChange={(e) => {
                      const p = wtaPlayers.find(pl => pl.id === e.target.value);
                      setReserveSinglesWta(idx, p || null);
                    }}
                    className="w-full p-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona riserva</option>
                    {wtaPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedIds = getUsedSinglesIds(idx, 'wta');
                        const isUsed = usedIds.has(p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={isUsed}>
                            #{p.fixed_ranking || p.ranking} {p.name} {isUsed ? '(già usata in singolari)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border-2 border-purple-500 mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">🤝 Doppi Misti</h2>
          <div className="bg-purple-900 bg-opacity-30 border border-purple-400 rounded-lg p-3 mb-4">
            <p className="text-purple-200 text-sm font-semibold">
              ⚠️ REGOLA IMPORTANTE: Dei 2 giocatori ATP nei doppi, esattamente 1 deve essere un "Doppista Puro"
              (NON presente nel Gruppo Singolaristi: titolari + riserve). L'altro può essere scelto liberamente.
              Stessa regola per le WTA: esattamente 1 "Doppista Pura" + 1 "Doppista Libera".
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formation?.doubles || []).map((double, idx) => (
              <div key={idx} className="bg-slate-700 rounded-lg p-4 border-2 border-purple-400">
                <h3 className="text-white font-bold mb-3 text-center">Doppio Misto {idx + 1}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 text-sm font-semibold mb-1 block">Giocatore ATP</label>
                    <select
                      value={double.atp?.id || ''}
                      onChange={(e) => {
                        const p = atpPlayers.find(pl => pl.id === e.target.value);
                        setDouble(idx, 'atp', p || null);
                      }}
                      className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                    >
                      <option value="">Seleziona ATP</option>
                      {atpPlayers
                        .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                        .map(p => {
                          const usedInOtherDouble = getUsedDoublesIds(idx).has(p.id);
                          const gruppoSingolaristi = getGruppoSingolaristi();
                          const isInGruppo = gruppoSingolaristi.has(p.id);
                          const countGruppoInOtherDoubles = countGruppoSingolaristiInDoubles('ATP', idx);
                          const cannotSelectFromGruppo = isInGruppo && countGruppoInOtherDoubles >= 1;
                          const isDisabled = usedInOtherDouble || cannotSelectFromGruppo;

                          return (
                            <option key={p.id} value={p.id} disabled={isDisabled}>
                              #{p.fixed_ranking || p.ranking} {p.name}
                              {isInGruppo ? ' (Gruppo Singolaristi)' : ''}
                              {cannotSelectFromGruppo ? ' ⚠️ Max 1 dal Gruppo' : ''}
                              {usedInOtherDouble ? ' (già usato)' : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-semibold mb-1 block">Giocatrice WTA</label>
                    <select
                      value={double.wta?.id || ''}
                      onChange={(e) => {
                        const p = wtaPlayers.find(pl => pl.id === e.target.value);
                        setDouble(idx, 'wta', p || null);
                      }}
                      className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                    >
                      <option value="">Seleziona WTA</option>
                      {wtaPlayers
                        .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                        .map(p => {
                          const usedInOtherDouble = getUsedDoublesIds(idx).has(p.id);
                          const gruppoSingolaristi = getGruppoSingolaristi();
                          const isInGruppo = gruppoSingolaristi.has(p.id);
                          const countGruppoInOtherDoubles = countGruppoSingolaristiInDoubles('WTA', idx);
                          const cannotSelectFromGruppo = isInGruppo && countGruppoInOtherDoubles >= 1;
                          const isDisabled = usedInOtherDouble || cannotSelectFromGruppo;

                          return (
                            <option key={p.id} value={p.id} disabled={isDisabled}>
                              #{p.fixed_ranking || p.ranking} {p.name}
                              {isInGruppo ? ' (Gruppo Singolaristi)' : ''}
                              {cannotSelectFromGruppo ? ' ⚠️ Max 1 dal Gruppo' : ''}
                              {usedInOtherDouble ? ' (già usata)' : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border-2 border-purple-600 mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">🪑 Panchina Doppi Misti</h2>
          <p className="text-slate-400 text-sm mb-4">
            Riserve specifiche per i doppi. Ogni ruolo ha vincoli diversi rispetto al Gruppo Singolaristi.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700 rounded-lg p-4 border-2 border-[#ccff00]">
              <h3 className="text-[#ccff00] font-bold mb-3 text-center">Riserve ATP</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    🔒 Riserva Doppista Puro ATP
                  </label>
                  <p className="text-slate-400 text-xs mb-2">
                    NON deve far parte del Gruppo Singolaristi
                  </p>
                  <select
                    value={formation?.reservesDoublesAtp?.puro?.id || ''}
                    onChange={(e) => {
                      const p = atpPlayers.find(pl => pl.id === e.target.value);
                      setReserveDoublesAtp('puro', p || null);
                    }}
                    className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona Doppista Puro</option>
                    {atpPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedInDoubles = getUsedDoublesIds(undefined, 'puro').has(p.id);
                        const inGruppoSingolaristi = getGruppoSingolaristi().has(p.id);
                        const isDisabled = usedInDoubles || inGruppoSingolaristi;
                        return (
                          <option key={p.id} value={p.id} disabled={isDisabled}>
                            #{p.fixed_ranking || p.ranking} {p.name}
                            {inGruppoSingolaristi ? ' ⚠️ (BLOCCATO: nel Gruppo Singolaristi)' : ''}
                            {usedInDoubles ? ' (già usato nei doppi)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    🔓 Riserva Doppista Libero ATP
                  </label>
                  <p className="text-slate-400 text-xs mb-2">
                    Può essere scelto liberamente, anche dal Gruppo Singolaristi
                  </p>
                  <select
                    value={formation?.reservesDoublesAtp?.libero?.id || ''}
                    onChange={(e) => {
                      const p = atpPlayers.find(pl => pl.id === e.target.value);
                      setReserveDoublesAtp('libero', p || null);
                    }}
                    className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona Doppista Libero</option>
                    {atpPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedInDoubles = getUsedDoublesIds(undefined, 'libero').has(p.id);
                        const inGruppoSingolaristi = getGruppoSingolaristi().has(p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={usedInDoubles}>
                            #{p.fixed_ranking || p.ranking} {p.name}
                            {inGruppoSingolaristi ? ' (dal Gruppo Singolari)' : ''}
                            {usedInDoubles ? ' (già usato nei doppi)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-4 border-2 border-pink-400">
              <h3 className="text-pink-400 font-bold mb-3 text-center">Riserve WTA</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    🔒 Riserva Doppista Pura WTA
                  </label>
                  <p className="text-slate-400 text-xs mb-2">
                    NON deve far parte del Gruppo Singolaristi
                  </p>
                  <select
                    value={formation?.reservesDoublesWta?.pura?.id || ''}
                    onChange={(e) => {
                      const p = wtaPlayers.find(pl => pl.id === e.target.value);
                      setReserveDoublesWta('pura', p || null);
                    }}
                    className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona Doppista Pura</option>
                    {wtaPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedInDoubles = getUsedDoublesIds(undefined, 'pura').has(p.id);
                        const inGruppoSingolaristi = getGruppoSingolaristi().has(p.id);
                        const isDisabled = usedInDoubles || inGruppoSingolaristi;
                        return (
                          <option key={p.id} value={p.id} disabled={isDisabled}>
                            #{p.fixed_ranking || p.ranking} {p.name}
                            {inGruppoSingolaristi ? ' ⚠️ (BLOCCATO: nel Gruppo Singolaristi)' : ''}
                            {usedInDoubles ? ' (già usata nei doppi)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-semibold mb-1 block">
                    🔓 Riserva Doppista Libera WTA
                  </label>
                  <p className="text-slate-400 text-xs mb-2">
                    Può essere scelta liberamente, anche dal Gruppo Singolaristi
                  </p>
                  <select
                    value={formation?.reservesDoublesWta?.libera?.id || ''}
                    onChange={(e) => {
                      const p = wtaPlayers.find(pl => pl.id === e.target.value);
                      setReserveDoublesWta('libera', p || null);
                    }}
                    className="w-full p-2 bg-slate-600 text-white rounded border-2 border-slate-500 focus:border-[#ccff00] outline-none"
                  >
                    <option value="">Seleziona Doppista Libera</option>
                    {wtaPlayers
                      .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
                      .map(p => {
                        const usedInDoubles = getUsedDoublesIds(undefined, 'libera').has(p.id);
                        const inGruppoSingolaristi = getGruppoSingolaristi().has(p.id);
                        return (
                          <option key={p.id} value={p.id} disabled={usedInDoubles}>
                            #{p.fixed_ranking || p.ranking} {p.name}
                            {inGruppoSingolaristi ? ' (dal Gruppo Singolari)' : ''}
                            {usedInDoubles ? ' (già usata nei doppi)' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 border-2 border-yellow-400">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <Crown className="w-8 h-8" />
            <span>Selezione Capitano</span>
          </h2>
          <p className="text-slate-900 text-sm mb-4 font-semibold">
            Il punteggio del match del Capitano vale DOPPIO (x2)!
          </p>
          <select
            value={formation?.captain?.id || ''}
            onChange={(e) => {
              const allPlayers = [...atpPlayers, ...wtaPlayers];
              const p = allPlayers.find(pl => pl.id === e.target.value);
              setFormation({ ...formation, captain: p || null });
            }}
            className="w-full p-4 bg-white text-slate-900 rounded-lg border-2 border-yellow-600 outline-none text-lg font-bold"
          >
            <option value="">Seleziona il tuo Capitano</option>
            {[...atpPlayers, ...wtaPlayers]
              .sort((a, b) => (a.fixed_ranking || a.ranking) - (b.fixed_ranking || b.ranking))
              .map(p => (
                <option key={p.id} value={p.id}>
                  [{p.tour}] #{p.fixed_ranking || p.ranking} {p.name}
                </option>
              ))}
          </select>
          {formation?.captain && (
            <div className="mt-3 bg-yellow-200 rounded-lg p-3 text-center">
              <span className="text-slate-900 font-bold">
                ⭐ Capitano selezionato: {formation.captain.name} ⭐
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
