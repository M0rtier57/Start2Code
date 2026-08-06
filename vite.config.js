import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The '' prefix loads every variable, not just VITE_ ones, and includes the
  // host's build environment as well as .env files.
  const env = loadEnv(mode, process.cwd(), '')

  /*
   * Vite only exposes VITE_-prefixed variables to browser code. Hostinger's
   * Supabase integration injects them unprefixed (SUPABASE_URL,
   * SUPABASE_ANON_KEY), which the client would never see. Accept either name
   * and hand the result to the app under the name it expects, so the build
   * works whether the values come from .env.local or from the host.
   */
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    // Visible in the host's build log, where a failed deploy is diagnosed.
    console.warn(
      '\n[start2code] Building WITHOUT Supabase credentials.\n' +
      '            The site will show the setup screen instead of a login page.\n' +
      '            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL\n' +
      '            and SUPABASE_ANON_KEY) in your environment variables.\n'
    )
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    }
  }
})
