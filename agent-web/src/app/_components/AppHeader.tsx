"use client";

import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "~/components/ui/tooltip";
import { useApiUrlStore } from "~/core/api/api-url-store";
import { useChatHistoryStore } from "~/core/store/chat-history-store";
import { ApiIcon } from "~/core/icons";
import { HistoryIcon } from "lucide-react";

export function AppHeader() {
  const { setShowConfigModal } = useApiUrlStore();
  const { toggleSidebar } = useChatHistoryStore();

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
  );
}
