'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, User, UserSettings } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  launchDemo: () => Promise<void>;
  logout: () => void;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('helios_token');
    if (storedToken) {
      setToken(storedToken);
      api.auth
        .me(storedToken)
        .then((res) => {
          setUser(res.user);
          setSettings(res.settings);
        })
        .catch(() => {
          localStorage.removeItem('helios_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('helios_token', res.token);
      setToken(res.token);
      setUser(res.user);
      const profile = await api.auth.me(res.token);
      setSettings(profile.settings);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(email, password, fullName);
      localStorage.setItem('helios_token', res.token);
      setToken(res.token);
      setUser(res.user);
      const profile = await api.auth.me(res.token);
      setSettings(profile.settings);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const launchDemo = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.demo();
      localStorage.setItem('helios_token', res.token);
      setToken(res.token);
      setUser(res.user);
      const profile = await api.auth.me(res.token);
      setSettings(profile.settings);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('helios_token');
    setToken(null);
    setUser(null);
    setSettings(null);
    router.push('/login');
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    await api.settings.update(newSettings);
    if (settings) {
      setSettings({ ...settings, ...newSettings });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        token,
        isLoading,
        login,
        register,
        launchDemo,
        logout,
        updateSettings,
      }}
    >
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
