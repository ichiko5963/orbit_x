"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";

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
  connectedAt: string | null;
  refresh: () => Promise<void>;
}

const XProfileContext = createContext<XProfileContextType | undefined>(undefined);

export function XProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<XProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/x/profile?userId=${user.uid}`);
      const data = await response.json();

      setIsConnected(data.connected);
      setConnectedAt(data.connectedAt || null);

      if (data.profile) {
        setProfile({
          id: data.profile.id,
          name: data.profile.name,
          username: data.profile.username,
          profileImageUrl: data.profile.profileImageUrl,
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
  }, [user]);

  // Auto-refresh when returning from X OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("x_auth_success") === "true") {
      // Delay slightly to ensure Firestore write is complete
      const timer = setTimeout(() => fetchProfile(), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <XProfileContext.Provider
      value={{
        profile,
        isConnected,
        isLoading,
        error,
        connectedAt,
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
