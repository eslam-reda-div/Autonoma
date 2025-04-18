"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { env } from "~/env";

// Key used for localStorage - must match the key used in other components
const API_URL_STORAGE_KEY = "custom_api_url";

// Non-React function to get the API URL from localStorage
export function getApiUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_URL_STORAGE_KEY);
}

interface ApiUrlContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  isConfigured: boolean;
  showApiConfigModal: boolean;
  setShowApiConfigModal: (show: boolean) => void;
}

// Create context outside of component to prevent recreation
const ApiUrlContext = createContext<ApiUrlContextType | undefined>(undefined);

// Define this function outside the component to avoid recreation on each render
const getInitialUrl = () => {
  if (typeof window === 'undefined') return env.NEXT_PUBLIC_API_URL;
  const saved = localStorage.getItem(API_URL_STORAGE_KEY);
  return saved ?? env.NEXT_PUBLIC_API_URL;
};

export function ApiUrlProvider({ children }: { children: React.ReactNode }) {
  // Use the function to get initial state, avoiding recreating objects
  const [apiUrl, setApiUrlState] = useState<string>(getInitialUrl());
  const [isConfigured, setIsConfigured] = useState<boolean>(!!getApiUrl());
  
  // Only show the modal on first load if there's no saved API URL
  const [showApiConfigModal, setShowApiConfigModal] = useState<boolean>(false);
  
  // Initialize modal visibility based on localStorage presence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(API_URL_STORAGE_KEY);
      // Only show the modal automatically if no API URL is saved
      if (!saved) {
        setShowApiConfigModal(true);
      }
    }
  }, []);
  
  // Add a useEffect to sync with localStorage changes (for cross-tab support)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === API_URL_STORAGE_KEY) {
          const newValue = e.newValue ?? env.NEXT_PUBLIC_API_URL;
          setApiUrlState(newValue);
          setIsConfigured(!!e.newValue);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);
  
  const setApiUrl = (url: string) => {
    if (url && url.trim() !== "") {
      console.log("ApiUrlProvider: Saving URL to localStorage:", url);
      // Save to localStorage
      localStorage.setItem(API_URL_STORAGE_KEY, url);
      setApiUrlState(url);
      setIsConfigured(true);
      setShowApiConfigModal(false);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    apiUrl,
    setApiUrl,
    isConfigured,
    showApiConfigModal,
    setShowApiConfigModal,
  }), [apiUrl, isConfigured, showApiConfigModal]);

  return (
    <ApiUrlContext.Provider value={contextValue}>
      {children}
    </ApiUrlContext.Provider>
  );
}

export function useApiUrl() {
  const context = useContext(ApiUrlContext);
  if (context === undefined) {
    throw new Error("useApiUrl must be used within an ApiUrlProvider");
  }
  return context;
}