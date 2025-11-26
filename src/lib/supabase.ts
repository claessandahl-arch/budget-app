import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Saknar Supabase miljövariabler. Kopiera .env.example till .env och fyll i dina nycklar.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

