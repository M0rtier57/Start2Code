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

  // Visible in the host's build log, which is where a deploy gets diagnosed.
  console.log(
    supabaseUrl
      ? `\n[start2code] Supabase from the environment: ${supabaseUrl}\n`
      : '\n[start2code] No Supabase environment variables — using the committed\n' +
        '            defaults in src/lib/config.js. This is expected on hosts that\n' +
        '            do not expose variables to the build step.\n'
  )

  return {
    plugins: [react()],
    define: {
      // Changes on every build. The frames that are not fingerprinted by Vite
      // (runner.html, scratch.html) are requested with this on the end, so a
      // deploy can never be paired with a copy of them from before it.
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString(36)),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    }
  }
})
