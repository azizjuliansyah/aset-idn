import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await supabase.rpc('run_sql', {
    sql: 'ALTER TABLE public.company_settings DROP COLUMN IF EXISTS wa_sender_number; ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS is_wa_enabled boolean DEFAULT false;'
  })
  
  if (error) {
    console.error("RPC failed, trying raw query...", error)
    // Supabase JS doesn't have raw query execution without RPC. 
    // We can try a simple select just to check connection, and ask user to run SQL in their Supabase Dashboard.
  } else {
    console.log("Success", data)
  }
}

main()
