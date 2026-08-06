import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

const url = SUPABASE_URL
const anonKey = SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured) {
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    '(in .env.local locally, or in your host\'s environment variables for a deployed build).'
  )
}

/*
 * createClient throws if the url is empty, and it runs while this module is
 * being imported — before React has rendered anything. A missing variable would
 * therefore produce a blank white page with no clue as to why. Falling back to a
 * syntactically valid placeholder keeps the app booting far enough to render the
 * setup screen that explains what to do; `isConfigured` is what the UI checks.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } }
)
