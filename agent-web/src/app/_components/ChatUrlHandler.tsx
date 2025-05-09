"use client";

import { useEffect } from "react";
import { useChatHistoryStore } from "~/core/store/chat-history-store";
import { getChatIdFromUrl, updateUrlWithChatId, isValidUUID } from "~/core/utils/url-utils";
import { getApiUrl } from "~/core/api/api-url-store";

/**
 * This component handles loading a chat from the URL parameter on initial page load
 * It's designed to be included once at the app root
 */
export function ChatUrlHandler() {
  const { setCurrentChat, isTemporaryChat } = useChatHistoryStore();

  useEffect(() => {
    const handleUrlChatId = async () => {
      // Skip if in temporary chat mode
      if (isTemporaryChat) return;
      
      const urlChatId = getChatIdFromUrl();
      
      if (urlChatId && isValidUUID(urlChatId)) {
        try {
          // Try to load the chat from backend to verify it exists
          const response = await fetch(getApiUrl() + `/chat/history/${urlChatId}`);
          
          if (response.ok) {
            // If chat exists, set it as current
            setCurrentChat(urlChatId);
          } else {
            // If chat doesn't exist, remove it from URL
            updateUrlWithChatId(null);
          }
        } catch (error) {
          console.error("Error checking chat from URL:", error);
          updateUrlWithChatId(null);
        }
      }
    };
    
    handleUrlChatId();
  }, [setCurrentChat, isTemporaryChat]);

  // This component doesn't render anything
  return null;
} 