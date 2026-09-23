import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://seodpbbkqjecohbwljud.supabase.co'
const supabaseAnonKey = 'sb_publishable_x_UVfWe9JY2MEiJNf6PqWw_7Cndda2u'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
