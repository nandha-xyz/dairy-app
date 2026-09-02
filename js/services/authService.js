import { supabase } from './supabaseClient.js';

export const authService = {
  getSupabaseClient: () => {
    if (!supabase && typeof window !== 'undefined' && window.supabase) {
      if (!window.__dairyAppDynamicSupabase) {
        window.__dairyAppDynamicSupabase = window.supabase.createClient(
          'https://xbxtqjurhpkclhfogdsh.supabase.co',
          'sb_publishable_fVkHK60MIW7voQjXrerZqg_n93tH3sP'
        );
      }
      return window.__dairyAppDynamicSupabase;
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

  // Returns the current user synchronously from the cached session.
  // NOTE: Only valid after getCurrentSession() has been awaited once.
  getUser: () => {
    // Access from the supabase global since we are a static JS app with no state store.
    const client = authService.getSupabaseClient();
    if (!client) return null;
    // supabase-js v2 stores session in memory; we expose the last known user via
    // the auth state. For a lightweight fallback we return null and let callers
    // use the session.user they already have in scope.
    return window.__dairyAppCurrentUser || null;
  },

  onAuthStateChange: (callback) => {
    const client = authService.getSupabaseClient();
    if (!client) return null;
    return client.auth.onAuthStateChange(callback);
  }
};
