/*
  # Add 2026 Official Tennis Calendar with Dates and Weights

  1. Changes
    - Add start_date and end_date columns to tournaments table
    - Add weight column to store tournament importance (1=regular, 2=Master 1000, 3=Slam)
    - Update type constraint to allow lowercase values
    - Clear existing tournaments data
    - Insert 30 official 2026 calendar tournaments with correct dates and weights
  
  2. Tournament Weights
    - SLAM (Australian Open, Roland Garros, Wimbledon, US Open) = 3
    - Master (Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris Bercy) = 2
    - 250/500 (All other tournaments) = 1
  
  3. Notes
    - Indian Wells (March 4-15) should be active for current date (March 4, 2026)
    - Weight determines number of matchups per round
*/

-- Add date and weight columns to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;

-- Update type constraint to allow more values
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_type_check 
CHECK (type IN ('SLAM', '1000', '500', '250', 'Master', 'Regular'));

-- Clear existing data
TRUNCATE TABLE tournaments RESTART IDENTITY CASCADE;

-- Insert 30 official 2026 calendar tournaments
INSERT INTO tournaments (round_number, name, type, lineup_slots, duration_days, opponents_count, weight, start_date, end_date, is_active) VALUES
-- Round 1: Australian Open (SLAM - Weight 3)
(1, 'Australian Open', 'SLAM', 8, 21, 3, 3, '2026-01-05', '2026-01-25', false),

-- Round 2: Montpellier/Linz (Regular - Weight 1)
(2, 'Montpellier/Linz', '250', 8, 7, 1, 1, '2026-01-26', '2026-02-01', false),

-- Round 3: Dallas/Marseille/Abu Dhabi (Regular - Weight 1)
(3, 'Dallas/Marseille/Abu Dhabi', '250', 8, 7, 1, 1, '2026-02-02', '2026-02-08', false),

-- Round 4: Rotterdam/Doha (500 - Weight 2)
(4, 'Rotterdam/Doha', '500', 8, 7, 2, 2, '2026-02-09', '2026-02-15', false),

-- Round 5: Rio/Dubai (500 - Weight 2)
(5, 'Rio/Dubai', '500', 8, 7, 2, 2, '2026-02-16', '2026-02-22', false),

-- Round 6: Acapulco/Dubai (Regular - Weight 1)
(6, 'Acapulco/Dubai', '250', 8, 7, 1, 1, '2026-02-23', '2026-03-01', false),

-- Round 7: Indian Wells (MASTER 1000 - Weight 2) ** ACTIVE TODAY **
(7, 'Indian Wells', '1000', 8, 12, 2, 2, '2026-03-04', '2026-03-15', true),

-- Round 8: Miami Open (MASTER 1000 - Weight 2)
(8, 'Miami Open', '1000', 8, 12, 2, 2, '2026-03-18', '2026-03-29', false),

-- Round 9: Estoril/Charleston (Regular - Weight 1)
(9, 'Estoril/Charleston', '250', 8, 7, 1, 1, '2026-03-30', '2026-04-05', false),

-- Round 10: Monte Carlo (MASTER 1000 - Weight 2)
(10, 'Monte Carlo', '1000', 8, 7, 2, 2, '2026-04-06', '2026-04-12', false),

-- Round 11: Barcelona/Stuttgart (Regular - Weight 1)
(11, 'Barcelona/Stuttgart', '500', 8, 7, 1, 1, '2026-04-13', '2026-04-19', false),

-- Round 12: Madrid Open (MASTER 1000 - Weight 2)
(12, 'Madrid Open', '1000', 8, 12, 2, 2, '2026-04-22', '2026-05-03', false),

-- Round 13: Internazionali d'Italia (MASTER 1000 - Weight 2)
(13, 'Internazionali d''Italia', '1000', 8, 12, 2, 2, '2026-05-06', '2026-05-17', false),

-- Round 14: Roland Garros (SLAM - Weight 3)
(14, 'Roland Garros', 'SLAM', 8, 21, 3, 3, '2026-05-18', '2026-06-07', false),

-- Round 15: Stoccarda/s-Hertogenbosch (Regular - Weight 1)
(15, 'Stoccarda/s-Hertogenbosch', '250', 8, 7, 1, 1, '2026-06-08', '2026-06-14', false),

-- Round 16: Halle/Queen's/Berlin (Regular - Weight 1)
(16, 'Halle/Queen''s/Berlin', '500', 8, 7, 1, 1, '2026-06-15', '2026-06-21', false),

-- Round 17: Wimbledon (SLAM - Weight 3)
(17, 'Wimbledon', 'SLAM', 8, 21, 3, 3, '2026-06-22', '2026-07-12', false),

-- Round 18: Bastad/Newport/Palermo (Regular - Weight 1)
(18, 'Bastad/Newport/Palermo', '250', 8, 7, 1, 1, '2026-07-13', '2026-07-19', false),

-- Round 19: Umago/Atlanta/Praga (Regular - Weight 1)
(19, 'Umago/Atlanta/Praga', '250', 8, 7, 1, 1, '2026-07-20', '2026-07-26', false),

-- Round 20: Washington (Regular - Weight 1)
(20, 'Washington', '500', 8, 7, 1, 1, '2026-07-27', '2026-08-02', false),

-- Round 21: Canada Open (MASTER 1000 - Weight 2)
(21, 'Canada Open', '1000', 8, 12, 2, 2, '2026-08-06', '2026-08-17', false),

-- Round 22: Cincinnati (MASTER 1000 - Weight 2)
(22, 'Cincinnati', '1000', 8, 12, 2, 2, '2026-08-19', '2026-08-30', false),

-- Round 23: US Open (SLAM - Weight 3)
(23, 'US Open', 'SLAM', 8, 14, 3, 3, '2026-08-31', '2026-09-13', false),

-- Round 24: Guadalajara/Monastir (Regular - Weight 1)
(24, 'Guadalajara/Monastir', '250', 8, 7, 1, 1, '2026-09-14', '2026-09-20', false),

-- Round 25: Chengdu/Seoul (Regular - Weight 1)
(25, 'Chengdu/Seoul', '250', 8, 7, 1, 1, '2026-09-21', '2026-09-27', false),

-- Round 26: Pechino/Tokyo (500 - Weight 2)
(26, 'Pechino/Tokyo', '500', 8, 7, 2, 2, '2026-09-28', '2026-10-04', false),

-- Round 27: Shanghai/Wuhan (MASTER 1000 - Weight 2)
(27, 'Shanghai/Wuhan', '1000', 8, 12, 2, 2, '2026-10-07', '2026-10-18', false),

-- Round 28: Anversa/Osaka (Regular - Weight 1)
(28, 'Anversa/Osaka', '250', 8, 7, 1, 1, '2026-10-19', '2026-10-25', false),

-- Round 29: Vienna/Basilea/Tokyo (Regular - Weight 1)
(29, 'Vienna/Basilea/Tokyo', '500', 8, 7, 1, 1, '2026-10-26', '2026-11-01', false),

-- Round 30: Parigi Bercy (MASTER 1000 - Weight 2)
(30, 'Parigi Bercy', '1000', 8, 7, 2, 2, '2026-11-02', '2026-11-08', false);
