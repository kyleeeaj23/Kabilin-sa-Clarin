import { createClient } from '@supabase/supabase-js'; // Ensure this matches exactly

const supabaseUrl = 'https://effopesshpxiluewfnbg.supabase.co';
const supabaseAnonKey = 'sb_publishable_X35iwgM9CWyZMIPhqcDc0A_KbInpfnu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);