import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('\n1. Testing SELECT query...');
  const { data: players, error: selectError } = await supabase
    .from('players')
    .select('id, name, tour, ranking, total_points')
    .limit(5);

  if (selectError) {
    console.error('SELECT Error:', selectError);
  } else {
    console.log('✓ SELECT Success! Found', players?.length, 'players (showing first 5):');
    console.log(players);
  }

  console.log('\n2. Testing INSERT query...');
  const { data: insertData, error: insertError } = await supabase
    .from('players')
    .insert([
      {
        name: 'Test Player',
        tour: 'ATP',
        ranking: 999,
        price: 100,
        total_points: 0
      }
    ])
    .select();

  if (insertError) {
    console.error('INSERT Error:', insertError);
  } else {
    console.log('✓ INSERT Success!');
    console.log(insertData);

    if (insertData && insertData[0]) {
      const testId = insertData[0].id;

      console.log('\n3. Testing DELETE query...');
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', testId);

      if (deleteError) {
        console.error('DELETE Error:', deleteError);
      } else {
        console.log('✓ DELETE Success! Cleaned up test data.');
      }
    }
  }

  console.log('\n4. Testing total count...');
  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('COUNT Error:', countError);
  } else {
    console.log('✓ Total players in database:', count);
  }
}

testConnection().catch(console.error);
