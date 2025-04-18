import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { env } from "~/env";

// Default API URL from environment variables
const DEFAULT_API_URL = env.NEXT_PUBLIC_API_URL;

// Type definition for our store
interface ApiUrlState {
  apiUrl: string;
  isConfigured: boolean;
  showConfigModal: boolean;
  setApiUrl: (url: string) => void;
  setShowConfigModal: (show: boolean) => void;
}

// Create the store with persist middleware
export const useApiUrlStore = create<ApiUrlState>()(
  persist(
    (set) => ({
      // Initial state
      apiUrl: DEFAULT_API_URL,
      isConfigured: false,
      showConfigModal: false,
      
      // Actions
      setApiUrl: (url: string) => {
        if (url && url.trim() !== "") {
          console.log("Saving API URL:", url);
          
          // For non-Zustand code to access, also save directly to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('api-url-direct', url);
          }
          
          set({ 
            apiUrl: url,
            isConfigured: true,
            showConfigModal: false
          });
        }
      },
      
      setShowConfigModal: (show: boolean) => set({ showConfigModal: show }),
    }),
    {
      name: 'api-url-storage', // unique name for the localStorage key
      storage: createJSONStorage(() => localStorage),
      skipHydration: false, // Ensure hydration is not skipped
      // Only persist these fields
      partialize: (state) => ({ 
        apiUrl: state.apiUrl,
        isConfigured: state.isConfigured
      }),
      // Initialize the modal visibility after hydration
      onRehydrateStorage: (state) => {
        console.log("Rehydrating API URL store with state:", state);
        
        // Check for direct localStorage URL value on first load
        if (typeof window !== 'undefined') {
          const directUrlValue = localStorage.getItem('api-url-direct');
          if (directUrlValue) {
            console.log("Found direct API URL in localStorage:", directUrlValue);
            return (newState) => {
              if (newState) {
                // Use the direct value if available
                newState.apiUrl = directUrlValue;
                newState.isConfigured = true;
              }
            };
          }
        }
        
        return (newState) => {
          console.log("Rehydration complete with state:", newState);
          if (newState) {
            // Check if we have a stored API URL
            if (!newState.isConfigured || !newState.apiUrl) {
              console.log("API URL not configured, showing modal");
              // Show modal if not configured
              newState.setShowConfigModal(true);
            }
          }
        }
      }
    }
  )
);

// Helper function to get the API URL for non-component code
export function getApiUrl(): string {
  // Try to get from direct localStorage first (more reliable)
  if (typeof window !== 'undefined') {
    const directUrl = localStorage.getItem('api-url-direct');
    if (directUrl) {
      return directUrl;
    }
    
    // Fall back to Zustand store
    try {
      const state = useApiUrlStore.getState();
      if (state.apiUrl) {
        return state.apiUrl;
      }
    } catch (e) {
      console.error("Error accessing Zustand store:", e);
    }
  }
  
  // Fallback to env for server-side rendering
  return DEFAULT_API_URL;
}