import { createClient } from '@supabase/supabase-js'

// Tarik kunci rahasia dari file .env.local biar aman dari GitHub
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)