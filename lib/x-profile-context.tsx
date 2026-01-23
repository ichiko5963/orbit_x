"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface XProfile {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface XProfileContextType {
  profile: XProfile | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const XProfileContext = createContext<XProfileContextType | undefined>(undefined);

export function XProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<XProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/twitter/verify");
      const data = await response.json();
      setIsConnected(data.connected);
      if (data.user) {
        setProfile({
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          profileImageUrl: data.user.profileImageUrl,
        });
      } else {
        setProfile(null);
      }
      if (!data.connected && data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to check X connection");
      setIsConnected(false);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <XProfileContext.Provider
      value={{
        profile,
        isConnected,
        isLoading,
        error,
        refresh: fetchProfile,
      }}
    >
      {children}
    </XProfileContext.Provider>
  );
}

export function useXProfile() {
  const context = useContext(XProfileContext);
  if (context === undefined) {
    throw new Error("useXProfile must be used within an XProfileProvider");
  }
  return context;
}
