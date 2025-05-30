import { createClient } from '@supabase/supabase-js';

// Access environment variables properly in Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper function to set the current user FID for RLS policies
export const setCurrentUserFid = async (fid) => {
  try {
    // Check if the RPC function exists first
    const { error } = await supabase.rpc('set_config', {
      setting: 'app.current_user_fid',
      value: fid.toString(),
    });
    
    if (error) {
      console.warn('Could not set user FID for RLS (this might be expected):', error.message);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (err) {
    console.warn('Error in setCurrentUserFid (non-critical):', err.message);
    return { success: false, error: err };
  }
};

// Helper function to set the current admin user for RLS policies
export const setCurrentAdminUser = async (username) => {
  try {
    const { error } = await supabase.rpc('set_config', {
      setting: 'app.current_admin_user', 
      value: username,
    });
    
    if (error) {
      console.warn('Could not set admin user for RLS:', error.message);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (err) {
    console.warn('Error in setCurrentAdminUser:', err.message);
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