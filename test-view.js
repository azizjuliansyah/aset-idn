const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ddgoqqutjvbaoymtxjpb.supabase.co';
const supabaseKey = 'sb_secret_TQ3_eNMmPMNJ-NXc2Fyr2g_8Dfdgojb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing stock_opname_entries_view query...');

  const { data, error } = await supabase
    .from('stock_opname_entries_view')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching stock_opname_entries_view:', error);
  } else {
    console.log('Successfully fetched stock_opname_entries_view. Samples:', data);
  }
}

run();
