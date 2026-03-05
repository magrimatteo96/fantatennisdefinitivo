# Sistema Calendario Equilibrato - Documentazione

## Panoramica

Il nuovo sistema di generazione del calendario matchup garantisce:

1. **Numero esatto di match per squadra** in base al tipo di torneo
2. **Equilibrio perfetto** negli scontri diretti tra squadre
3. **Validazione rigorosa** prima del salvataggio nel database
4. **Trasparenza completa** con report dettagliati

---

## Regole Ferree

### Match per Tipo di Torneo

Ogni squadra deve giocare **esattamente**:

- **SLAM** (Australian Open, Roland Garros, Wimbledon, US Open): **3 match**
- **Master 1000**: **2 match**
- **ATP 250/500**: **1 match**

Non ci sono eccezioni: se una squadra ha un numero diverso di match, la generazione fallisce con errore.

### Equilibrio Scontri Diretti

Nel corso delle 30 giornate:

- Ogni squadra deve affrontare tutte le altre lo stesso numero di volte
- Margine di tolleranza: **massimo 1 differenza**
- L'algoritmo ordina i match per minimizzare gli scontri ripetuti

**Esempio con 8 squadre:**
- Squadra A vs Squadra B: 7-8 volte nelle 30 giornate
- Squadra A vs Squadra C: 7-8 volte nelle 30 giornate
- Differenza massima tra qualsiasi coppia: 1

---

## Interfaccia Utente

### Pannello League Manager → League Matchups

#### 1. Genera Calendario Matchup (30 Giornate)

**Bottone verde** - Genera il calendario completo

**Conferma richiesta:**
```
🎾 GENERAZIONE CALENDARIO EQUILIBRATO

La lega ha X squadre.

Il sistema garantisce:
• SLAM: esattamente 3 match per squadra
• Master 1000: esattamente 2 match per squadra
• ATP 250/500: esattamente 1 match per squadra
• Equilibrio perfetto: ogni squadra affronta le altre lo stesso numero di volte

Procedere con la generazione?
```

**Risultato:**
- Cancella automaticamente i matchup esistenti
- Genera tutti i matchup per le 30 giornate
- Mostra un riepilogo dettagliato

#### 2. Resetta Calendario Matchup

**Bottone rosso** - Cancella tutti i matchup generati

**Conferma richiesta:**
```
⚠️ ATTENZIONE: Questa operazione cancellerà TUTTI i matchup generati per le 30 giornate.

Scrivi "CANCELLA" per confermare:
```

**Risultato:**
- Cancella tutti i matchup dalla tabella `matchups`
- Permette di rigenerare il calendario da zero

#### 3. Riepilogo Generazione

Dopo la generazione, viene mostrato un pannello verde con:

```
📊 Statistiche Globali:
• Giornate processate: 30
• Matchup totali generati: 216
• Squadre nella lega: 8

🏆 Giornate SLAM (4): 48 matchup
   → Ogni squadra gioca 3 match per SLAM

⭐ Giornate Master 1000 (13): 104 matchup
   → Ogni squadra gioca 2 match per Master

🎾 Giornate 250/500 (13): 52 matchup
   → Ogni squadra gioca 1 match per 250/500

⚖️ Equilibrio Scontri Diretti (8 squadre):
• Scontri minimi tra due squadre: 7
• Scontri massimi tra due squadre: 8
• Media scontri: 7.7
• Differenza max-min: 1 ✅ PERFETTAMENTE EQUILIBRATO
```

---

## Algoritmo di Generazione

### File: `src/lib/balancedMatchupGeneration.ts`

### Funzione Principale: `generateBalancedCalendar()`

**Step 1: Caricamento Dati**
- Carica tutte le squadre dalla tabella `league_teams`
- Carica tutte le giornate dalla tabella `tournaments`
- Valida che il numero di squadre sia pari

**Step 2: Generazione per Ogni Giornata**
- Chiama `generateRoundMatchups()` per ogni torneo
- Passa il contatore globale H2H per tracciare gli scontri
- Valida che ogni squadra abbia esattamente `opponents_count` match

**Step 3: Validazione**
- Verifica che il numero di matchup corrisponda a `(teamCount * opponentsCount) / 2`
- Se la validazione fallisce, l'intera operazione viene annullata
- Nessun dato viene salvato nel database in caso di errore

**Step 4: Salvataggio**
- Salva tutti i matchup nella tabella `matchups`
- Ogni matchup ha: `tournament_id`, `home_team_id`, `away_team_id`
- Punteggi iniziali: 0-0, `is_completed: false`

**Step 5: Report di Equilibrio**
- Analizza il contatore globale H2H
- Calcola min, max, media degli scontri
- Genera un report leggibile

### Funzione: `generateRoundMatchups()`

**Logica di Selezione:**

1. **Crea tutti gli abbinamenti possibili**
   - Per 8 squadre: 28 possibili abbinamenti (combinazioni C(8,2))

2. **Ordina per priorità**
   - Prima: coppie che si sono affrontate meno volte
   - Seconda: rotazione basata sul numero di giornata

3. **Selezione Greedy**
   - Scorre tutti gli abbinamenti ordinati
   - Seleziona un abbinamento se:
     - Entrambe le squadre hanno ancora slot disponibili
     - Non si è raggiunto il numero richiesto di matchup
   - Si ferma quando ogni squadra ha esattamente `opponents_count` match

4. **Validazione Finale**
   - Verifica che ogni squadra abbia esattamente il numero corretto di match
   - Se fallisce, lancia un'eccezione

---

## Validazioni e Sicurezza

### Validazione Prima del Salvataggio

La funzione `validateMatchups()` controlla:
- Ogni squadra ha esattamente `expectedCount` match
- Nessuna squadra ha più o meno match del previsto
- Se la validazione fallisce, viene lanciata un'eccezione

### Gestione Errori

Tutti gli errori vengono catturati e mostrati all'utente:
```javascript
try {
  await generateBalancedCalendar();
} catch (error) {
  alert(`❌ Errore generazione matchup: ${error.message}`);
}
```

### Reset Sicuro

La funzione `resetAllMatchups()`:
- Cancella tutti i matchup dalla tabella
- Non tocca altre tabelle (teams, tournaments, lineups)
- Richiede conferma esplicita dall'utente

---

## Esempio di Output

### Lega con 8 Squadre

**SLAM (4 giornate):**
- Totale matchup: 48
- Ogni giornata: 12 matchup
- Ogni squadra gioca: 3 match

**Master 1000 (13 giornate):**
- Totale matchup: 104
- Ogni giornata: 8 matchup
- Ogni squadra gioca: 2 match

**ATP 250/500 (13 giornate):**
- Totale matchup: 52
- Ogni giornata: 4 matchup
- Ogni squadra gioca: 1 match

**Totale:** 216 matchup in 30 giornate

**Scontri Diretti:**
- Ogni coppia di squadre si affronta: 7-8 volte
- Differenza max-min: 1 (perfettamente equilibrato)

---

## Vantaggi del Nuovo Sistema

1. **Equità Garantita**
   - Nessuna squadra avvantaggiata o svantaggiata
   - Tutti giocano lo stesso numero di partite

2. **Rispetto del Regolamento**
   - I tornei SLAM sono più importanti (3 match)
   - Master 1000 intermedi (2 match)
   - 250/500 più leggeri (1 match)

3. **Validazione Rigorosa**
   - Errori catturati prima del salvataggio
   - Niente dati inconsistenti nel database

4. **Trasparenza**
   - Report dettagliato dopo ogni generazione
   - Statistiche complete visibili all'utente

5. **Flessibilità**
   - Supporta 4, 6, 8 o 10 squadre
   - Si adatta automaticamente al numero di squadre

---

## Testing

### Come Testare

1. Vai su **Admin Panel → League Manager → League Matchups**
2. Clicca su **"Resetta Calendario Matchup"** (se necessario)
3. Clicca su **"Genera Calendario Matchup (30 Giornate)"**
4. Verifica il riepilogo mostrato
5. Vai su **Matches** per vedere i matchup generati
6. Verifica che:
   - Ogni squadra abbia il numero corretto di match per ogni giornata
   - Gli scontri siano equilibrati

### Verifica Database

Query per verificare il numero di match per squadra in un torneo:

```sql
SELECT
  t.name as team_name,
  COUNT(*) as match_count
FROM matchups m
JOIN league_teams t ON (t.id = m.home_team_id OR t.id = m.away_team_id)
WHERE m.tournament_id = 'TOURNAMENT_ID'
GROUP BY t.name
ORDER BY t.name;
```

Dovrebbe restituire il numero esatto di match previsti per ogni squadra.

---

## Risoluzione Problemi

### Errore: "Expected X matchups, got Y"

**Causa:** L'algoritmo non è riuscito a generare il numero esatto di matchup.

**Soluzione:**
- Verifica che il numero di squadre sia pari
- Controlla che ci siano almeno 4 squadre

### Errore: "Validation failed: Team X has Y matches, expected Z"

**Causa:** Una squadra non ha il numero corretto di match.

**Soluzione:**
- Questo dovrebbe essere impossibile con il nuovo algoritmo
- Se accade, segnala un bug nel codice

### Matchup Non Equilibrati

**Verifica:** Guarda il "Riepilogo Generazione" → Differenza max-min

**Se > 2:**
- Potrebbe essere un problema con l'algoritmo
- Rigenerazione dovrebbe migliorare

---

## Conclusioni

Il nuovo sistema di generazione del calendario garantisce:
- ✅ Numero esatto di match per squadra
- ✅ Equilibrio perfetto negli scontri
- ✅ Validazione rigorosa
- ✅ Report dettagliati
- ✅ Interfaccia user-friendly

Ogni squadra avrà le stesse opportunità di vincere il campionato!
