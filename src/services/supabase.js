import { createClient } from '@supabase/supabase-js';

// Access environment variables properly in Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback for development - you can remove this in production
const defaultUrl = supabaseUrl || 'YOUR_SUPABASE_URL_HERE';
const defaultAnonKey = supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY_HERE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(defaultUrl, defaultAnonKey, {
  auth: {
    persistSession: false, // We'll manage sessions differently for Farcaster auth
    autoRefreshToken: false,
  },
});

// Helper function to set the current user FID for RLS policies
export const setCurrentUserFid = async (fid) => {
  try {
    const { data, error } = await supabase.rpc('set_config', {
      setting: 'app.current_user_fid',
      value: fid.toString(),
    });
    
    if (error) {
      console.error('Error setting user FID:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error in setCurrentUserFid:', err);
    return { success: false, error: err };
  }
};

// Helper function to set the current admin user for RLS policies
export const setCurrentAdminUser = async (username) => {
  try {
    const { data, error } = await supabase.rpc('set_config', {
      setting: 'app.current_admin_user', 
      value: username,
    });
    
    if (error) {
      console.error('Error setting admin user:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error in setCurrentAdminUser:', err);
    return { success: false, error: err };
  }
};

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
};