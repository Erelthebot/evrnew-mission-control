/**
 * Legacy shim — exports a singleton browser client so existing
 * `import { supabase } from '@/lib/supabase'` calls keep working.
 *
 * New code should import from:
 *   Server components / Route Handlers: '@/lib/supabase/server'  → createClient()
 *   Client components:                  '@/lib/supabase/client'  → createClient()
 */
import { createClient } from './supabase/client'

export const supabase = createClient()
