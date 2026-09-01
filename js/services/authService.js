import { supabase } from './supabaseClient.js';

export const authService = {
  getSupabaseClient: () => {
    if (!supabase && typeof window !== 'undefined' && window.supabase) {
      return window.supabase.createClient(
        'https://xbxtqjurhpkclhfogdsh.supabase.co',
        'sb_publishable_fVkHK60MIW7voQjXrerZqg_n93tH3sP'
      );
    }
    return supabase;
  },

  getCurrentSession: async () => {
    const client = authService.getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
        return null;
      }
      return data.session;
    } catch (err) {
      console.error('Session check exception:', err);
      return null;
    }
  },

  signIn: async (email, password) => {
    const client = authService.getSupabaseClient();
    if (!client) throw new Error('Supabase SDK not loaded');
    return await client.auth.signInWithPassword({ email, password });
  },

  signUp: async (email, password) => {
    const client = authService.getSupabaseClient();
    if (!client) throw new Error('Supabase SDK not loaded');
    return await client.auth.signUp({ email, password });
  },

  signOut: async () => {
    const client = authService.getSupabaseClient();
    if (!client) return;
    return await client.auth.signOut();
  },

  onAuthStateChange: (callback) => {
    const client = authService.getSupabaseClient();
    if (!client) return null;
    return client.auth.onAuthStateChange(callback);
  }
};
