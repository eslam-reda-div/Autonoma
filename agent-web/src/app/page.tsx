"use client";

import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef } from "react";

import { useAutoScrollToBottom } from "~/components/hooks/useAutoScrollToBottom";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TooltipProvider } from "~/components/ui/tooltip";
import { sendMessage, useInitTeamMembers, useStore } from "~/core/store";
import { useChatHistoryStore } from "~/core/store/chat-history-store";
import { cn } from "~/core/utils";
import { type MessageRole, type TextMessage, type ImageTextMessage } from "~/core/messaging/types";
import { getApiUrl } from "../core/api/api-url-store";
import { AppHeader } from "./_components/AppHeader";
import { InputBox } from "./_components/InputBox";
import { MessageHistoryView } from "./_components/MessageHistoryView";
import { ChatHistorySidebar } from "./_components/ChatHistorySidebar";

export default function HomePage() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = useStore((state) => state.messages);
  const responding = useStore((state) => state.responding);
  const clearMessages = useStore((state) => state.clearMessages);
  const setMessages = useStore((state) => state.setMessages);
  
  const { 
    currentChatUuid, 
    setCurrentChat,
    loadChatHistory 
  } = useChatHistoryStore();

  // Effect to load chat when currentChatUuid changes
  useEffect(() => {
    if (currentChatUuid) {
      // Load the selected chat
      const loadChat = async () => {
        try {
          const response = await fetch(getApiUrl() + `/chat/history/${currentChatUuid}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load chat: ${response.statusText}`);
          }
          
          const chatData = await response.json();
          
          // Set the messages from the loaded chat
          if (chatData && chatData.messages) {
            setMessages(chatData.messages);
          } else {
            // If no messages found, clear the current chat
            clearMessages();
          }
        } catch (error) {
          console.error("Error loading chat:", error);
          clearMessages();
        }
      };
      
      loadChat();
    } else {
      // Clear messages when creating a new chat
      clearMessages();
    }
  }, [currentChatUuid, clearMessages, setMessages]);

  // Save chat after receiving response or when sending a new message
  useEffect(() => {
    const saveCurrentChat = async () => {
      // Don't save if there are no messages or if we're still responding
      if (messages.length === 0 || responding) return;
      
      try {
        // Prepare chat data to save
        const firstUserMessage = messages.find(m => m.role === "user");
        // Extract title based on message type
        let title = "New Chat";
        
        if (firstUserMessage) {
          if (firstUserMessage.type === "text") {
            title = firstUserMessage.content.toString().substring(0, 20);
          } else if (firstUserMessage.type === "imagetext" && typeof firstUserMessage.content === "object") {
            title = firstUserMessage.content.text.substring(0, 20);
          }
        }
        
        const chatData = {
          title: title + (title.length >= 20 ? "..." : ""),
          messages: messages,
          args: {
            is_favorite: false,
            tags: [],
          }
        };
        
        // If we have a current chat UUID, update it, otherwise create a new one
        if (currentChatUuid) {
          
          await fetch(getApiUrl() + `/chat/history/${currentChatUuid}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chatData)
          });
        } else {
          const response = await fetch(getApiUrl() + `/chat/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chatData)
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.uuid) {
              setCurrentChat(data.uuid);
            }
          }
        }
        
        // Refresh the chat history list after saving
        loadChatHistory();
        
      } catch (error) {
        console.error("Error saving chat:", error);
      }
    };
    
    // Save when messages change and we're not responding
    if (!responding && messages.length > 0) {
      const timer = setTimeout(() => {
        saveCurrentChat();
      }, 1000); // Add a small delay to avoid saving too frequently
      
      return () => clearTimeout(timer);
    }
  }, [messages, responding, currentChatUuid, setCurrentChat, loadChatHistory]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      config: { 
        deepThinkingMode: boolean; 
        searchBeforePlanning: boolean; 
        images?: string[] 
      },
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      let message: TextMessage | ImageTextMessage;
      
      if (config.images && config.images.length > 0) {
        // Message with images
        message = {
          id: nanoid(),
          role: "user" as MessageRole,
          type: "imagetext",
          content: {
            text: content,
            images: config.images
          },
        };
      } else {
        // Text only message
        message = {
          id: nanoid(),
          role: "user" as MessageRole,
          type: "text",
          content,
        };
      }
      
      await sendMessage(
        message,
        {
          deepThinkingMode: config.deepThinkingMode,
          searchBeforePlanning: config.searchBeforePlanning,
        },
        { abortSignal: abortController.signal },
      );
      abortControllerRef.current = null;
    },
    [],
  );

  useInitTeamMembers();
  useAutoScrollToBottom(scrollAreaRef, responding);

  return (
    <TooltipProvider delayDuration={150}>
      {/* Add ChatHistorySidebar to the page */}
      <ChatHistorySidebar />
      
      <ScrollArea className="h-screen w-full" ref={scrollAreaRef}>
        <div className="flex min-h-screen flex-col items-center">
          <header className="sticky top-0 right-0 left-0 z-10 flex h-16 w-full items-center px-4 backdrop-blur-sm">
            <AppHeader />
          </header>
          <main className="w-full flex-1 px-4 pb-48">
            <MessageHistoryView
              className="w-full mx-auto sm:w-[90%] md:w-[85%] lg:w-page"
              messages={messages}
              loading={responding}
            />
          </main>
          <footer
            className={cn(
              "fixed bottom-4 transition-transform duration-500 ease-in-out w-[calc(100%-2rem)] sm:w-[90%] md:w-[85%] lg:w-page",
              messages.length === 0
                ? "lg:w-[640px] lg:translate-y-[-34vh]"
                : ""
            )}
            style={{ textAlign: "center" }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col w-full sm:w-[90%] md:w-[85%] lg:w-[640px] translate-y-[-32px] mx-auto">
                <h3 className="mb-2 text-center text-2xl md:text-3xl font-medium">
                  👋 Hello, there!
                </h3>
                <div className="px-4 text-center text-base md:text-lg text-gray-400">
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    Autonoma
                  </a>
                  , built on cutting-edge language models, helps you search on
                  web, browse information, and handle complex tasks.
                </div>
              </div>
            )}
            <div className="flex flex-col overflow-hidden rounded-[24px] border bg-white shadow-lg max-w-full mx-auto">
              <InputBox
                size={messages.length === 0 ? "large" : "normal"}
                responding={responding}
                onSend={handleSendMessage}
                onCancel={() => {
                  abortControllerRef.current?.abort();
                  abortControllerRef.current = null;
                }}
              />
            </div>
            <div className="w-full sm:w-[90%] md:w-[85%] lg:w-page absolute bottom-[-32px] h-8 backdrop-blur-xs" />
          </footer>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
