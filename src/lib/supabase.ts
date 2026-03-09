import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Expected variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  tour: 'ATP' | 'WTA';
  ranking: number;
  fixed_ranking: number;
  price: number;
  total_points: number;
  image_url?: string;
  country?: string;
  created_at: string;
};

export type UserSquad = {
  id: string;
  user_id: string;
  player_id: string;
  auction_price: number;
  acquired_at: string;
  player?: Player;
};

export type Tournament = {
  id: string;
  tournament_name: string;
  type: string;
  round_number: number;
  lineup_slots: number;
  is_active: boolean;
  duration_days: number;
  opponents_count: number;
  weight?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
};

export type Formation = {
  atpSingles: string[];
  wtaSingles: string[];
  mixedDoubles: Array<{ atp: string; wta: string }>;
};

export type Lineup = {
  id: string;
  user_id: string;
  tournament_id: string;
  formation: Formation;
  captain_player_id: string;
  created_at: string;
  updated_at: string;
};

export type Standing = {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string;
  total_points: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  budget_remaining: number;
  created_at: string;
  updated_at: string;
};

export type MatchdayResult = {
  id: string;
  tournament_id: string;
  player_id: string;
  atp_points_earned: number;
  matches_played: number;
  created_at: string;
};
