-- Script per popolare tutte le squadre con giocatori bilanciati
-- Ogni squadra riceverà 10 ATP + 10 WTA players rispettando il budget

DO $$
DECLARE
  team_record RECORD;
  atp_players UUID[];
  wta_players UUID[];
  selected_atp UUID[];
  selected_wta UUID[];
  total_cost INTEGER;
  remaining_budget INTEGER;
  player_id UUID;
  player_price INTEGER;
  player_ranking INTEGER;
BEGIN
  -- Loop attraverso ogni team
  FOR team_record IN
    SELECT id, name FROM league_teams ORDER BY name
  LOOP
    RAISE NOTICE 'Processing team: %', team_record.name;

    -- Ottieni giocatori ATP disponibili (non già assegnati)
    SELECT ARRAY_AGG(id ORDER BY ranking) INTO atp_players
    FROM players
    WHERE tour = 'ATP'
    AND id NOT IN (SELECT player_id FROM team_players WHERE player_id IS NOT NULL);

    -- Ottieni giocatori WTA disponibili (non già assegnati)
    SELECT ARRAY_AGG(id ORDER BY ranking) INTO wta_players
    FROM players
    WHERE tour = 'WTA'
    AND id NOT IN (SELECT player_id FROM team_players WHERE player_id IS NOT NULL);

    -- Verifica che ci siano abbastanza giocatori
    IF array_length(atp_players, 1) < 10 OR array_length(wta_players, 1) < 10 THEN
      RAISE NOTICE 'Not enough players for team %', team_record.name;
      CONTINUE;
    END IF;

    -- Selezione bilanciata: mix di top, mid e low ranked players
    -- ATP: 2 top (1-20), 5 mid (21-80), 3 low (81+)
    selected_atp := ARRAY[]::UUID[];
    total_cost := 0;

    -- Top ATP (ranking 1-20): prendi 2 casuali
    WITH top_atp AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 10 THEN 150
          WHEN ranking <= 20 THEN 120
          ELSE 100
        END as price
      FROM players
      WHERE id = ANY(atp_players) AND ranking <= 20
      ORDER BY RANDOM()
      LIMIT 2
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM top_atp
    RETURNING player_id, auction_price INTO player_id, player_price;

    -- Mid ATP (ranking 21-80): prendi 5 casuali
    WITH mid_atp AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 30 THEN 100
          WHEN ranking <= 50 THEN 70
          WHEN ranking <= 75 THEN 50
          ELSE 30
        END as price
      FROM players
      WHERE id = ANY(atp_players) AND ranking BETWEEN 21 AND 80
      ORDER BY RANDOM()
      LIMIT 5
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM mid_atp;

    -- Low ATP (ranking 81+): prendi 3 casuali
    WITH low_atp AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 100 THEN 30
          WHEN ranking <= 125 THEN 15
          ELSE 5
        END as price
      FROM players
      WHERE id = ANY(atp_players) AND ranking > 80
      ORDER BY RANDOM()
      LIMIT 3
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM low_atp;

    -- WTA: stessa strategia (2 top, 5 mid, 3 low)
    -- Top WTA (ranking 1-20): prendi 2 casuali
    WITH top_wta AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 10 THEN 150
          WHEN ranking <= 20 THEN 120
          ELSE 100
        END as price
      FROM players
      WHERE id = ANY(wta_players) AND ranking <= 20
      ORDER BY RANDOM()
      LIMIT 2
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM top_wta;

    -- Mid WTA (ranking 21-80): prendi 5 casuali
    WITH mid_wta AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 30 THEN 100
          WHEN ranking <= 50 THEN 70
          WHEN ranking <= 75 THEN 50
          ELSE 30
        END as price
      FROM players
      WHERE id = ANY(wta_players) AND ranking BETWEEN 21 AND 80
      ORDER BY RANDOM()
      LIMIT 5
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM mid_wta;

    -- Low WTA (ranking 81+): prendi 3 casuali
    WITH low_wta AS (
      SELECT id, ranking,
        CASE
          WHEN ranking <= 100 THEN 30
          WHEN ranking <= 125 THEN 15
          ELSE 5
        END as price
      FROM players
      WHERE id = ANY(wta_players) AND ranking > 80
      ORDER BY RANDOM()
      LIMIT 3
    )
    INSERT INTO team_players (team_id, player_id, auction_price)
    SELECT team_record.id, id, price FROM low_wta;

    -- Calcola il costo totale e aggiorna i crediti del team
    SELECT COALESCE(SUM(auction_price), 0) INTO total_cost
    FROM team_players
    WHERE team_id = team_record.id;

    remaining_budget := 1000 - total_cost;

    UPDATE league_teams
    SET credits = remaining_budget
    WHERE id = team_record.id;

    RAISE NOTICE 'Team % completed: % players, cost: %, remaining: %',
      team_record.name,
      (SELECT COUNT(*) FROM team_players WHERE team_id = team_record.id),
      total_cost,
      remaining_budget;

  END LOOP;

  RAISE NOTICE 'All teams populated successfully!';
END $$;

-- Mostra il riepilogo finale
SELECT
  lt.name as team_name,
  lt.credits as remaining_credits,
  COUNT(tp.id) as player_count,
  1000 - lt.credits as total_spent
FROM league_teams lt
LEFT JOIN team_players tp ON lt.id = tp.team_id
GROUP BY lt.id, lt.name, lt.credits
ORDER BY lt.name;
