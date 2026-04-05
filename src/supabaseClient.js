import { createClient } from '@supabase/supabase-js';

// Replace these strings with your actual project credentials 
// from your Supabase Project Settings > API
const supabaseUrl = 'https://effopesshpxiluewfnbg.supabase.co'; 
const supabaseKey = 'sb_publishable_X35iwgM9CWyZMIPhqcDc0A_KbInpfnu';

export const supabase = createClient(supabaseUrl, supabaseKey);