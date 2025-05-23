import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getApiUrl } from "../api/api-url-store";
import { Message } from "../messaging";
import { useStore } from "./store";

// Types for chat history items
export interface ChatHistoryItem {
  uuid: string;
  title: string;
  created_at: string;
  updated_at?: string;
  is_favorite: boolean;
  tags: string[];
  location: "global" | "folder";
  folder_id?: string;
  folder_name?: string;
}

export interface ChatFolder {
  folder_id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  chat_count: number;
}

interface ChatHistoryState {
  // State
  chats: ChatHistoryItem[];
  folders: ChatFolder[];
  currentChatUuid: string | null;
  isLoading: boolean;
  searchQuery: string;
  filterFavorites: boolean;
  filterFolderUuid: string | "global" | null; // null = all chats, "global" = global chats, folder_id = folder chats
  sidebarOpen: boolean;
  isTemporaryChat: boolean; // New state for temporary chat mode
  
  // Actions
  loadChatHistory: () => Promise<void>;
  loadFolders: () => Promise<void>;
  setCurrentChat: (uuid: string | null) => void;
  createNewChat: () => void;
  createFolder: (name: string) => Promise<string | null>;
  updateFolder: (folderId: string, name: string) => Promise<boolean>;
  deleteFolder: (folderId: string, deleteChats: boolean) => Promise<boolean>;
  deleteChat: (uuid: string) => Promise<boolean>;
  toggleFavorite: (uuid: string) => Promise<boolean>;
  moveChat: (uuid: string, destination: string | "global") => Promise<boolean>;
  searchChats: (query: string) => Promise<void>;
  setFilterFavorites: (filter: boolean) => void;
  setFilterFolder: (folderUuid: string | "global" | null) => void;
  toggleSidebar: () => void;
  setSidebar: (isOpen: boolean) => void;
  getChatContent: () => Promise<{messages: Message[]} | null>;
  getChatContentSync: () => {messages: Message[]} | null;
  toggleTemporaryChat: () => void; // New action to toggle temporary chat mode
  setTemporaryChat: (isTemporary: boolean) => void; // New action to set temporary chat mode directly
}

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      chats: [],
      folders: [],
      currentChatUuid: null,
      isLoading: false,
      searchQuery: "",
      filterFavorites: false,
      filterFolderUuid: null,
      sidebarOpen: false,
      isTemporaryChat: false, // Initialize temporary chat mode as false
      
      // Actions
      loadChatHistory: async () => {
        set({ isLoading: false });
        try {
          const { filterFolderUuid, filterFavorites, searchQuery } = get();
          
          // Build query parameters
          let url = getApiUrl() + "/chat/history";
          
          // If we have a search query or filters, use the search endpoint instead
          if (searchQuery || filterFavorites || filterFolderUuid) {
            url = getApiUrl() + `/chat/search?`;
            const params = new URLSearchParams();
            
            if (searchQuery) params.append("query", searchQuery);
            if (filterFavorites) params.append("filter_favorites", "true");
            if (filterFolderUuid) params.append("folder_id", filterFolderUuid);
            
            url += params.toString();
          } else if (filterFolderUuid) {
            // If just filtering by folder with no other criteria
            url = getApiUrl() + `/chat/history?folder_id=${filterFolderUuid}`;
          }
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to load chat history: ${response.statusText}`);
          }
          
          const data = await response.json();
          set({ 
            chats: searchQuery || filterFavorites || filterFolderUuid ? data.results : data.history, 
            isLoading: false 
          });
        } catch (error) {
          console.error("Error loading chat history:", error);
          set({ isLoading: false });
        }
      },
      
      loadFolders: async () => {
        try {
          const response = await fetch(getApiUrl() + "/chat/folders");
          
          if (!response.ok) {
            throw new Error(`Failed to load folders: ${response.statusText}`);
          }
          
          const data = await response.json();
          set({ folders: data.folders });
        } catch (error) {
          console.error("Error loading folders:", error);
        }
      },
      
      setCurrentChat: (uuid) => {
        // When setting a chat UUID, also ensure we're not in temporary mode
        set({ 
          currentChatUuid: uuid,
          isTemporaryChat: false // Exit temporary mode when loading a specific chat
        });
      },
      
      createNewChat: () => {
        set({ currentChatUuid: null });
      },
      
      createFolder: async (name) => {
        try {
          const response = await fetch(getApiUrl() + "/chat/folders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.statusText}`);
          }
          
          const data = await response.json();
          // Reload folders to get the updated list
          get().loadFolders();
          
          return data.folder_id;
        } catch (error) {
          console.error("Error creating folder:", error);
          return null;
        }
      },
      
      updateFolder: async (folderId, name) => {
        try {
          const response = await fetch(getApiUrl() + `/chat/folders/${folderId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update folder: ${response.statusText}`);
          }
          
          // Reload folders to get the updated list
          get().loadFolders();
          
          return true;
        } catch (error) {
          console.error("Error updating folder:", error);
          return false;
        }
      },
      
      deleteFolder: async (folderId, deleteChats) => {
        try {
          const response = await fetch(getApiUrl() + `/chat/folders/${folderId}?delete_chats=${deleteChats}`, {
            method: "DELETE"
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete folder: ${response.statusText}`);
          }
          
          // Reload folders and chats to get the updated lists
          get().loadFolders();
          get().loadChatHistory();
          
          return true;
        } catch (error) {
          console.error("Error deleting folder:", error);
          return false;
        }
      },
      
      getChatContent: async () => {
        const { currentChatUuid } = get();
        
        if (!currentChatUuid) {
          return null;
        }
        
        try {
          const response = await fetch(getApiUrl() + `/chat/history/${currentChatUuid}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load chat content: ${response.statusText}`);
          }
          
          const data = await response.json();
          // Update cache
          return data;
        } catch (error) {
          console.error("Error loading chat content:", error);
          return null;
        }
      },
      
      // Add a new synchronous version that doesn't return a Promise
      getChatContentSync: () => {
        const { currentChatUuid } = get();
        
        if (!currentChatUuid) {
          return null;
        }
        
        try {
          // Use XMLHttpRequest in synchronous mode (deprecated but works for this use case)
          const xhr = new XMLHttpRequest();
          xhr.open('GET', getApiUrl() + `/chat/history/${currentChatUuid}`, false); // false makes it synchronous
          xhr.send(null);
          
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            return data;
          } else {
            console.error(`Failed to load chat content: ${xhr.statusText}`);
            return null;
          }
        } catch (error) {
          console.error("Error loading chat content synchronously:", error);
          return null;
        }
      },

      deleteChat: async (uuid) => {
        try {
          const { currentChatUuid } = get();
          const response = await fetch(getApiUrl() + `/chat/history/${uuid}`, {
            method: "DELETE"
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete chat: ${response.statusText}`);
          }
          
          // Reload chats to get the updated list
          get().loadChatHistory();
          
          if (uuid === currentChatUuid) {
            useStore.setState({
              messages: [],
              state: {
                messages: [],
              }
            }); // Clear current chat if it was deleted
            set({ currentChatUuid: null });
          }

          return true;
        } catch (error) {
          console.error("Error deleting chat:", error);
          return false;
        }
      },
      
      toggleFavorite: async (uuid) => {
        try {
          // Get the current chat to determine its favorite status
          const { chats } = get();
          const chat = chats.find(c => c.uuid === uuid);
          
          if (!chat) {
            throw new Error(`Chat not found: ${uuid}`);
          }
          
          // Toggle the favorite status
          const newFavoriteStatus = !chat.is_favorite;
          
          const response = await fetch(getApiUrl() + `/chat/history/${uuid}/favorite?favorite_status=${newFavoriteStatus}`, {
            method: "PUT"
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update favorite status: ${response.statusText}`);
          }
          
          // Update the chat in the local state
          set({
            chats: get().chats.map(c => 
              c.uuid === uuid 
                ? { ...c, is_favorite: newFavoriteStatus } 
                : c
            )
          });
          
          return true;
        } catch (error) {
          console.error("Error toggling favorite:", error);
          return false;
        }
      },
      
      moveChat: async (uuid, destination) => {
        try {
          const response = await fetch(getApiUrl() + `/chat/move/${uuid}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ destination })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to move chat: ${response.statusText}`);
          }
          
          // Reload chats to get the updated list
          get().loadChatHistory();
          
          return true;
        } catch (error) {
          console.error("Error moving chat:", error);
          return false;
        }
      },
      
      searchChats: async (query) => {
        set({ searchQuery: query });
        await get().loadChatHistory();
      },
      
      setFilterFavorites: (filter) => {
        set({ filterFavorites: filter });
        get().loadChatHistory();
      },
      
      setFilterFolder: (folderUuid) => {
        set({ filterFolderUuid: folderUuid });
        get().loadChatHistory();
      },
      
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      setSidebar: (isOpen) => {
        set({ sidebarOpen: isOpen });
      },
      
      toggleTemporaryChat: () => {
        set(state => ({ isTemporaryChat: !state.isTemporaryChat }));
      },
      
      setTemporaryChat: (isTemporary) => {
        set({ isTemporaryChat: isTemporary });
      },
    }),
    {
      name: 'chat-history-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist some of the state values
        filterFavorites: state.filterFavorites,
        filterFolderUuid: state.filterFolderUuid,
        sidebarOpen: state.sidebarOpen,
        // We don't persist isTemporaryChat since temporary chats should reset on page reload
      }),
    }
  )
);