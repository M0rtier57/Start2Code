/**
 * Supabase connection details.
 *
 * These values are committed on purpose. The anon key is a PUBLIC identifier:
 * it already ships inside the compiled JavaScript of every deployed build, so
 * any visitor can read it with View Source. What protects the data is row level
 * security in supabase/schema.sql — never the secrecy of this key. Anything
 * genuinely secret (above all the service_role key) must never appear here.
 *
 * Why committed rather than an environment variable: some hosts, Hostinger
 * among them, do not expose environment variables to the *build* step. A Vite
 * app is compiled before it is served, so a variable that only exists at
 * runtime arrives too late and the app ships with no database at all.
 * Committing the values makes the build work identically everywhere.
 *
 * Environment variables still take priority when present, so another Supabase
 * project can be targeted without touching this file:
 *
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run build
 */

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://dzfdjvvwoygulhavwgdy.supabase.co'

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZmRqdnZ3b3lndWxoYXZ3Z2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDEyNDEsImV4cCI6MjEwMTUxNzI0MX0.5T6pl_idtadUQt6ByhXJ6L26Tuf6anu6B4Ut3keE1VM'
