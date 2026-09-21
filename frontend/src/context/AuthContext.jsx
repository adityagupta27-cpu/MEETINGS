import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const currentUser = await api.getMe();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        // Not authenticated
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const loggedInUser = await api.login({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (email, password, full_name) => {
    const registeredUser = await api.register({ email, password, full_name });
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
