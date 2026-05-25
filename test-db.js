const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ddgoqqutjvbaoymtxjpb.supabase.co';
const supabaseKey = 'sb_secret_TQ3_eNMmPMNJ-NXc2Fyr2g_8Dfdgojb'; // Service role key to bypass RLS for debugging

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing Supabase stock-opname-groups query...');

  // 1. Check all groups
  const { data: groups, error: groupsErr } = await supabase
    .from('stock_opname_groups')
    .select('id, name, status, created_at');

  if (groupsErr) {
    console.error('Error fetching stock_opname_groups:', groupsErr);
  } else {
    console.log('Successfully fetched groups. Total count:', groups?.length);
    console.log('Groups:', groups);
  }

  // 2. Check if table stock_opname_group_items exists and what it contains
  const { data: items, error: itemsErr } = await supabase
    .from('stock_opname_group_items')
    .select('*')
    .limit(5);

  if (itemsErr) {
    console.error('Error fetching stock_opname_group_items:', itemsErr);
  } else {
    console.log('Successfully fetched stock_opname_group_items. Samples:', items);
  }

  // 3. Test the exact query that the API does (without filters first, then with)
  const selectStr = 'id, name, description, status, created_by, created_at, creator:profiles(full_name)';
  const { data: testQuery1, error: testErr1 } = await supabase
    .from('stock_opname_groups')
    .select(selectStr)
    .order('created_at', { ascending: false });

  if (testErr1) {
    console.error('Error with testQuery1 (no filters):', testErr1);
  } else {
    console.log('testQuery1 (no filters) success. Row count:', testQuery1?.length);
  }

  // 4. Test the query with warehouse/category filter
  // Try inner join with stock_opname_group_items
  const selectStrFilter = 'id, name, description, status, created_by, created_at, creator:profiles(full_name), stock_opname_group_items!inner(warehouse_id, item:items!inner(item_category_id))';
  const { data: testQuery2, error: testErr2 } = await supabase
    .from('stock_opname_groups')
    .select(selectStrFilter)
    .order('created_at', { ascending: false });

  if (testErr2) {
    console.error('Error with testQuery2 (with inner join):', testErr2);
  } else {
    console.log('testQuery2 (with inner join) success. Row count:', testQuery2?.length);
  }
}

run();
