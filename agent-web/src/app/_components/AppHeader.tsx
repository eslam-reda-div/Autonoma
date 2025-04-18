"use client";

import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "~/components/ui/tooltip";
import { useApiUrlStore } from "~/core/api/api-url-store";
import { ApiIcon } from "~/core/icons";

export function AppHeader() {
  const { setShowConfigModal } = useApiUrlStore();

  return (
    <div className="w-full flex justify-between items-center px-4">
      <a
        className="font-serif text-base md:text-lg font-extralight text-gray-500"
        href="#"
        target="_blank"
      >
        Autonoma
      </a>
      
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
