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
  category: 'ATP' | 'WTA';
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
  name?: string;
  tournament_name: string;
  round_number: number;
  category: string;
  type?: string; // Alias for category for backwards compatibility
  is_active: boolean;
  status?: string;
  opponents_count: number;
  weight?: number;
  start_date: string;
  created_at: string;
};

// Helper function to calculate dynamic lineup slots based on category
export function getLineupSlots(category: string): number {
  // 250 or 500: 10 slots (4 ATP Singles, 4 WTA Singles, 2 Doubles)
  // 1000 or SLAM: 12 slots (5 ATP Singles, 5 WTA Singles, 2 Doubles)
  return category === '250' || category === '500' ? 10 : 12;
}

// Helper function to calculate singles count based on category
export function getSinglesCount(category: string): number {
  return getLineupSlots(category) === 10 ? 4 : 5;
}

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
