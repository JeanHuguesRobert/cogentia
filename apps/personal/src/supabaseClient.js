import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Anonymous pages, including the learned-context mirror, boot without an account.
// Account, history, and saved analyses use the client only when both values exist.
export const supabase = url && key ? createClient(url, key) : null
