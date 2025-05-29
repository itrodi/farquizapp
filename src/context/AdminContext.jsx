import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, setCurrentAdminUser } from '../services/supabase';
import bcrypt from 'bcryptjs';

const AdminContext = createContext({});

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin session
    const checkAdminSession = () => {
      const storedAdmin = localStorage.getItem('adminSession');
      if (storedAdmin) {
        try {
          const admin = JSON.parse(storedAdmin);
          // Verify session hasn't expired (24 hours)
          if (admin.expiresAt > Date.now()) {
            setAdminUser(admin.user);
            setIsAuthenticated(true);
            setCurrentAdminUser(admin.user.username);
          } else {
            localStorage.removeItem('adminSession');
          }
        } catch (error) {
          console.error('Invalid admin session:', error);
          localStorage.removeItem('adminSession');
        }
      }
      setIsLoading(false);
    };

    checkAdminSession();
  }, []);

  const login = async (username, password) => {
    try {
      // Fetch admin user
      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !admin) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, admin.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id);

      // Set session
      const session = {
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };

      localStorage.setItem('adminSession', JSON.stringify(session));
      setAdminUser(session.user);
      setIsAuthenticated(true);
      setCurrentAdminUser(admin.username);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    setAdminUser(null);
    setIsAuthenticated(false);
    navigate('/admin/login');
  };

  const value = {
    adminUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};