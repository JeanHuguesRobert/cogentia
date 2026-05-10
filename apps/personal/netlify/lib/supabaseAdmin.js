import { createClient } from '@supabase/supabase-js'

// Service role key — jamais exposé côté client, uniquement dans les fonctions Netlify
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
