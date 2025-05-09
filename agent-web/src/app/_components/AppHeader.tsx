"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "~/components/ui/tooltip";
import { useApiUrlStore } from "~/core/api/api-url-store";
import { useChatHistoryStore } from "~/core/store/chat-history-store";
import { ApiIcon } from "~/core/icons";
import { 
  HistoryIcon, 
  FileDown, 
  FileType, 
  ChevronDown,
  FileText,
  FileJson,
  Zap,
  ZapOff
} from "lucide-react";
import { useStore } from "~/core/store";
import { exportChat, ExportFormat } from "~/core/utils/export-utils";
import { useReactToPrint } from 'react-to-print';

export function AppHeader({ historyView }: { historyView: React.RefObject<HTMLDivElement> }) {
  const { setShowConfigModal } = useApiUrlStore();
  const { 
    toggleSidebar, 
    isTemporaryChat, 
    toggleTemporaryChat, 
    setTemporaryChat,
    createNewChat 
  } = useChatHistoryStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const messages = useStore(state => state.messages);
  const clearMessages = useStore(state => state.clearMessages);
  
  // Create the print handler at the component level, not inside an event handler
  const handlePrint = useReactToPrint({
    contentRef: historyView,
    bodyClass: "print-body",
    copyShadowRoots: true,
    documentTitle: "Autonoma Chat Export",
    fonts: [
      {
        family: "Inter",
        source: "url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')"
      }
    ],
    ignoreGlobalStyles: false,
    nonce: "",
    onAfterPrint: () => {
      console.log("Print completed");
      const styleElement = document.getElementById('print-style');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    },
    onBeforePrint: async () => {
      console.log("Preparing document for printing...");
      const style = document.createElement('style');
      style.id = 'print-style';
      style.innerHTML = `
        @media print {
          @page {size: landscape !important;}
          .neaded-full-height-to-print { height: auto !important; }
          .nead-more-width { width: auto !important; padding-top: 30px !important; }
        }
      `;
      document.head.appendChild(style);
    },
    preserveAfterPrint: false,
    print: undefined,
    suppressErrors: true
  });

  // Handle clicks outside the export menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleExportToPdf = () => {
    try {
      // Call the print handler function instead of using the hook directly
      handlePrint();
      setShowExportMenu(false);
    } catch (error) {
      console.error("Failed to export chat to PDF:", error);
    }
  };

  const handleExportToText = async () => {
    try {
      await exportChat(messages, ExportFormat.TEXT);
      setShowExportMenu(false);
    } catch (error) {
      console.error("Failed to export chat to TEXT:", error);
    }
  };

  const handleExportToJSON = async () => {
    try {
      await exportChat(messages, ExportFormat.JSON);
      setShowExportMenu(false);
    } catch (error) {
      console.error("Failed to export chat to JSON:", error);
    }
  };

  const handleNewTemporaryChat = () => {
    if (!isTemporaryChat) {
      // If not already in temporary mode, create a new temporary chat
      createNewChat();
      clearMessages();
      setTemporaryChat(true);
    } else {
      // If already in temporary mode, toggle back to normal mode
      setTemporaryChat(false);
    }
  };

  return (
    <div className="w-full flex justify-between items-center px-4">
      <div className="flex items-center gap-2">  
        <a
          className="font-serif text-base md:text-lg font-extralight text-gray-500"
          href="#"
          target="_blank"
        >
          Autonoma
        </a>
      </div>
      
      <div className="flex items-center gap-2">
        {messages.length > 0 && (
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex items-center"
                >
                  <FileDown className="h-5 w-5 text-gray-500" />
                  <ChevronDown className="h-3 w-3 text-gray-500 ml-1" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Export Chat
              </TooltipContent>
            </Tooltip>
            
            {showExportMenu && (
              <div 
                ref={exportMenuRef}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700"
              >
                <div className="py-1">
                  <button
                    onClick={handleExportToPdf}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileType className="h-4 w-4 mr-2" />
                    Export to PDF
                  </button>
            
                  <button
                    onClick={handleExportToText}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export to Text
                  </button>
                  
                  <button
                    onClick={handleExportToJSON}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    Export to JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleNewTemporaryChat}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ${isTemporaryChat ? 'bg-amber-100 dark:bg-amber-800' : ''}`}
            >
              {isTemporaryChat ? (
                <ZapOff className="h-5 w-5 text-amber-500" />
              ) : (
                <Zap className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isTemporaryChat ? 'Currently in Temporary Chat Mode (not saved)' : 'Create Temporary Chat (not saved)'}
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setShowConfigModal(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <ApiIcon className="h-5 w-5 text-gray-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Configure API URL
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
