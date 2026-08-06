import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly and early — a missing key otherwise shows up as confusing
  // "Failed to fetch" errors on every single request.
  console.error(
    'Supabase is not configured. Create Start2Code/.env.local with ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const isConfigured = Boolean(url && anonKey)
