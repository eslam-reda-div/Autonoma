"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatHistoryItem, ChatFolder, useChatHistoryStore } from "~/core/store/chat-history-store";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  ArchiveIcon, 
  FolderIcon, 
  PlusIcon, 
  SearchIcon, 
  StarIcon, 
  XIcon,
  MenuIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Ellipsis,
  CheckIcon,
  RefreshCwIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  FilterIcon,
  GripIcon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "~/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

export function ChatHistorySidebar() {
  const {
    chats,
    folders,
    currentChatUuid,
    isLoading,
    sidebarOpen,
    searchQuery,
    filterFavorites,
    filterFolderUuid,
    loadChatHistory,
    loadFolders,
    setCurrentChat,
    createNewChat,
    toggleFavorite,
    searchChats,
    setFilterFavorites,
    setFilterFolder,
    toggleSidebar,
    setSidebar,
    deleteChat,
  } = useChatHistoryStore();

  const [searchInputValue, setSearchInputValue] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize data on first load
  useEffect(() => {
    loadChatHistory();
    loadFolders();
    
    // Try to load sidebar width from localStorage
    const savedWidth = localStorage.getItem('sidebar-width');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth));
    }
  }, [loadChatHistory, loadFolders]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchChats(searchInputValue);
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Refresh chat history
  const refreshHistory = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadChatHistory(), loadFolders()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600); // Add a slight delay for visual feedback
    }
  };

  // Handle sidebar resize - fixed implementation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('sidebar-width', sidebarWidth.toString());
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Properly clean up the event listeners when the mouse is released
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mouseup', cleanup, { once: true });
  }, [sidebarWidth]);

  // Group chats by folder
  const globalChats = chats?.filter(chat => chat?.location === "global") || [];
  const folderChats: Record<string, ChatHistoryItem[]> = {};
  
  // Initialize with empty arrays for all folders
  if (folders && Array.isArray(folders)) {
    folders.forEach(folder => {
      if (folder && folder.folder_id) {
        folderChats[folder.folder_id] = [];
      }
    });
  }
  
  // Add chats to their respective folders
  if (chats && Array.isArray(chats)) {
    chats.filter(chat => chat?.location === "folder" && chat?.folder_id).forEach(chat => {
      if (chat?.folder_id) {
        // Ensure folderChats[chat.folder_id] is initialized before pushing
        if (!folderChats[chat.folder_id]) {
          folderChats[chat.folder_id] = [];
        }
        folderChats[chat.folder_id]?.push(chat);
      }
    });
  }

  // Determine if sidebar should be fixed or absolute based on screen size
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <>
      {/* Floating toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed top-16 left-4 z-40 shadow-md rounded-full opacity-70 hover:opacity-100 transition-opacity"
          onClick={toggleSidebar}
          title="Open chat history"
        >
          <SidebarOpenIcon className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={isMobile ? { x: -300 } : { opacity: 0, width: 0 }}
            animate={isMobile ? { x: 0 } : { opacity: 1, width: sidebarWidth }}
            exit={isMobile ? { x: -300 } : { opacity: 0, width: 0 }}
            transition={isMobile 
                ? { type: "linear", damping: 25, stiffness: 300 }
                : { type: "spring", damping: 25, stiffness: 300 }
              }
            className={cn(
              "fixed md:sticky left-0 top-0 bottom-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 z-50 shadow-lg",
              isMobile ? "w-[288px]" : ""
            )}
            style={{ height: '100vh' }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <ArchiveIcon className="h-5 w-5 text-gray-600" />
                  Chat History
                </h2>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshHistory}
                        className={cn(
                          "h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800", 
                          isRefreshing && "animate-spin"
                        )}
                        disabled={isRefreshing}
                      >
                        <RefreshCwIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Refresh</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <SidebarCloseIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Close sidebar</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Search and actions */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSearch} className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search chats..."
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm rounded-md"
                  />
                </form>
                
                <Button
                    variant="default"
                    size="sm"
                    className="text-xs w-full mt-2"
                    onClick={() => {
                        createNewChat();
                        if (window.innerWidth < 768) toggleSidebar();
                    }}
                >
                    <PlusIcon className="mr-1 h-3 w-3" />
                    New Chat
                </Button>

                <div className="flex mt-2 gap-2 justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs w-[50%] flex items-center gap-1"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FilterIcon className="h-3 w-3" />
                    Filters
                    <ChevronDownIcon className={cn(
                      "h-3 w-3 transition-transform",
                      showFilters ? "rotate-180" : ""
                    )} />
                  </Button>
                  
                  
                  <div className="flex  w-[50%] gap-1">
                    <CreateNewFolderDialog />
                    
                    
                  </div>
                </div>
                
                {/* Collapsible filters section */}
                <Collapsible open={showFilters} className="w-full mt-2">
                  <CollapsibleContent className="space-y-2 pt-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant={filterFolderUuid === null ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setFilterFolder(null)}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterFolderUuid === "global" ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setFilterFolder("global")}
                      >
                        <ArchiveIcon className="mr-1 h-3 w-3" />
                        Global
                      </Button>
                      <Button
                        variant={filterFavorites ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setFilterFavorites(!filterFavorites)}
                      >
                        <StarIcon 
                          className="mr-1 h-3 w-3" 
                          fill={filterFavorites ? "currentColor" : "none"} 
                        />
                        Favorites
                      </Button>
                      
                      {folders.map(folder => (
                        <Button
                          key={folder.folder_id}
                          variant={filterFolderUuid === folder.folder_id ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setFilterFolder(folder.folder_id)}
                        >
                          <FolderIcon className="mr-1 h-3 w-3" />
                          {folder.name}
                        </Button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Chat list */}
              <ScrollArea className="flex-1 overflow-auto">
                <div className="p-2">
                  {/* Loading state */}
                  {isLoading && (
                    <div className="py-4 text-center">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading chat history...</p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!isLoading && chats?.length === 0 && (
                    <div className="py-8 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <ArchiveIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <p className="mt-2 text-sm font-medium">No chat history found</p>
                      <p className="mt-1 text-xs text-gray-500">Start a new conversation or try a different filter</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          createNewChat();
                          if (window.innerWidth < 768) toggleSidebar();
                        }}
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New Chat
                      </Button>
                    </div>
                  )}

                  {/* Folders */}
                  {!isLoading && !searchQuery && folders && folders.length > 0 && !filterFolderUuid && !filterFavorites && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-2">
                        Folders
                      </div>
                      {folders.map((folder) => (
                        <FolderItem 
                          key={folder.folder_id} 
                          folder={folder} 
                          chats={folderChats[folder.folder_id] || []} 
                          isExpanded={!!expandedFolders[folder.folder_id]}
                          onToggleExpand={() => toggleFolder(folder.folder_id)}
                          currentChatUuid={currentChatUuid}
                        />
                      ))}
                    </div>
                  )}

                  {/* Global Chats */}
                  {!isLoading && !searchQuery && globalChats && globalChats.length > 0 && !filterFolderUuid && !filterFavorites && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-2">
                        Global Chats
                      </div>
                      {globalChats
                        .map(chat => ({
                          ...chat,
                          parsedDate: new Date(chat.created_at)
                        }))
                        .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
                        .map((chat) => (
                          <ChatHistoryListItem 
                            key={chat.uuid} 
                            chat={chat} 
                            isActive={chat.uuid === currentChatUuid} 
                          />
                        ))}
                    </div>
                  )}

                  {/* Filtered Chats */}
                  {!isLoading && (filterFolderUuid || filterFavorites || searchQuery) && chats?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-2">
                        {filterFavorites 
                          ? "Favorite Chats" 
                          : filterFolderUuid === "global" 
                            ? "Global Chats" 
                            : filterFolderUuid 
                              ? folders.find(f => f.folder_id === filterFolderUuid)?.name || "Folder Chats"
                              : searchQuery 
                                ? "Search Results" 
                                : "Chats"}
                      </div>
                      {chats
                        .map(chat => ({
                          ...chat,
                          parsedDate: new Date(chat.created_at)
                        }))
                        .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
                        .map((chat) => (
                          <ChatHistoryListItem 
                            key={chat.uuid} 
                            chat={chat} 
                            isActive={chat.uuid === currentChatUuid} 
                          />
                        ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Resizer */}
              {!isMobile && (
                <div 
                  className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
                  onMouseDown={handleMouseDown}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FolderItem({ 
  folder, 
  chats, 
  isExpanded, 
  onToggleExpand,
  currentChatUuid 
}: { 
  folder: ChatFolder; 
  chats: ChatHistoryItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  currentChatUuid: string | null;
}) {
  const { setFilterFolder, updateFolder, deleteFolder, loadChatHistory, loadFolders } = useChatHistoryStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(folder.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteWithChats, setDeleteWithChats] = useState(false);

  const handleSaveName = async () => {
    if (editedName.trim()) {
      await updateFolder(folder.folder_id, editedName);
      setIsEditingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditedName(folder.name);
      setIsEditingName(false);
    }
  };

  const handleDelete = async () => {
    await deleteFolder(folder.folder_id, deleteWithChats);
    await Promise.all([loadChatHistory(), loadFolders()]);
    setIsConfirmingDelete(false);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand} className="mb-1">
      <div className={cn(
        "flex items-center gap-1 px-1 py-1 rounded-md",
        isEditingName ? "bg-gray-100 dark:bg-gray-900" : "hover:bg-gray-100 dark:hover:bg-gray-900"
      )}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <div 
          className="flex-1 flex items-center truncate cursor-pointer"
          onClick={() => !isEditingName && !isConfirmingDelete && setFilterFolder(folder.folder_id)}
        >
          <FolderIcon className="h-4 w-4 mr-2 text-gray-500" />
          
          {isEditingName ? (
            <div className="flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="h-6 py-1 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm truncate">{folder.name}</span>
              <span className="text-xs text-gray-400">({chats.length})</span>
            </div>
          )}
        </div>

        {!isEditingName && !isConfirmingDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100">
                <Ellipsis className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterFolder(folder.folder_id)}>
                View chats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsConfirmingDelete(true)} className="text-red-600">
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isConfirmingDelete && (
          <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Folder</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-4">Are you sure you want to delete "{folder.name}"?</p>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="deleteWithChats" 
                    checked={deleteWithChats}
                    onChange={() => setDeleteWithChats(!deleteWithChats)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="deleteWithChats" className="text-sm">
                    Also delete {chats.length} chat{chats.length !== 1 ? 's' : ''} in this folder
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <CollapsibleContent>
        {chats.length > 0 ? (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-800 pl-2 py-1">
            {chats
              .map(chat => ({
                ...chat,
                parsedDate: new Date(chat.created_at)
              }))
              .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
              .map((chat) => (
                <ChatHistoryListItem 
                  key={chat.uuid} 
                  chat={chat} 
                  isActive={chat.uuid === currentChatUuid} 
                />
              ))}
          </div>
        ) : (
          <div className="ml-8 py-1 text-sm text-gray-500">
            No chats in this folder
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ChatHistoryListItem({ chat, isActive }: { chat: ChatHistoryItem; isActive: boolean }) {
  const { setCurrentChat, toggleSidebar, toggleFavorite, deleteChat, moveChat, loadChatHistory } = useChatHistoryStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { folders } = useChatHistoryStore();
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // This week
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    // Older
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      await deleteChat(chat.uuid);
      await loadChatHistory();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded-md mb-1 group relative",
        isActive ? "bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-900"
      )}
    >
      <div 
        className="flex-1 truncate cursor-pointer" 
        onClick={() => {
          setCurrentChat(chat.uuid);
          if (window.innerWidth < 768) toggleSidebar();
        }}
      >
        <div className="text-sm truncate font-medium">{chat.title}</div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          {formatDate(chat.created_at)}
          {chat.is_favorite && (
            <StarIcon className="h-3 w-3 text-yellow-500 fill-yellow-500 inline ml-1" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <Ellipsis className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem 
              onClick={() => {
                setCurrentChat(chat.uuid);
                if (window.innerWidth < 768) toggleSidebar();
              }}
              className="cursor-pointer"
            >
              Open Chat
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderIcon className="h-3.5 w-3.5 mr-2" />
                <span>{chat.location === "folder" ? "Move from folder" : "Move to folder"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {chat.location === "folder" ? (
                    <DropdownMenuItem onClick={() => moveChat(chat.uuid, "global")}>
                      <ArchiveIcon className="h-3.5 w-3.5 mr-2" />
                      Move to Global
                    </DropdownMenuItem>
                  ) : (
                    folders.length > 0 ? (
                      folders.map(folder => (
                        <DropdownMenuItem 
                          key={folder.folder_id}
                          onClick={() => moveChat(chat.uuid, folder.folder_id)}
                        >
                          <FolderIcon className="h-3.5 w-3.5 mr-2" />
                          {folder.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No folders available
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            <DropdownMenuItem onClick={() => toggleFavorite(chat.uuid)}>
              <StarIcon className="h-3.5 w-3.5 mr-2" fill={chat.is_favorite ? "currentColor" : "none"} />
              {chat.is_favorite ? "Remove from favorites" : "Add to favorites"}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-red-600 cursor-pointer"
              onClick={() => {
                setIsDeleteDialogOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <div className="flex items-center">
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <XIcon className="h-3.5 w-3.5 mr-2" />
                    Delete Chat
                  </>
                )}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this chat? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteChat}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateNewFolderDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createFolder, loadFolders } = useChatHistoryStore();

  const handleCreateFolder = async () => {
    if (folderName.trim()) {
      setIsCreating(true);
      try {
        await createFolder(folderName);
        await loadFolders();
        setFolderName("");
        setIsOpen(false);
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          <FolderIcon className="mr-1 h-3 w-3" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md data-[state=open]:animate-contentShow data-[state=closed]:animate-contentHide">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateFolder} disabled={isCreating}>
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}