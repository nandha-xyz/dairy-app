const SUPABASE_URL = 'https://xbxtqjurhpkclhfogdsh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fVkHK60MIW7voQjXrerZqg_n93tH3sP';

export const supabase = (typeof window !== 'undefined' && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
