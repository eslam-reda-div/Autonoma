import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

import { type Message } from "~/core/messaging";
import { cn } from "~/core/utils";
import { useStore, updateMessage, sendMessage } from "~/core/store";

import { LoadingAnimation } from "./LoadingAnimation";
import { WorkflowProgressView } from "./WorkflowProgressView";
import { InputBox } from "./InputBox";
import { EditOutlined, CopyOutlined, CheckOutlined } from "@ant-design/icons";

export function MessageHistoryView({
  className,
  messages,
  loading,
}: {
  className?: string;
  messages: Message[];
  loading?: boolean;
}) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  return (
    <div className={cn(className)}>
      {messages.map((message, index) => (
        <MessageView 
          key={message.id} 
          message={message} 
          isEditing={message.id === editingMessageId}
          onStartEditing={() => setEditingMessageId(message.id)}
          onCancelEditing={() => setEditingMessageId(null)}
          onSaveEdit={(text, options) => {
            // Find current message index
            const currentIndex = messages.findIndex(m => m.id === message.id);
            if (currentIndex === -1) return;
            
            // Get all messages from the store
            const storeMessages = useStore.getState().messages;
            
            // Remove all messages after the current one (including the current one)
            const messagesToKeep = storeMessages.slice(0, currentIndex);
            
            console.log("Messages to keep:", messagesToKeep);

            // Create the updated message
            let updatedMessage: Message;
            
            if (options.images && options.images.length > 0) {
              updatedMessage = {
                id: message.id,
                role: "user",
                type: "imagetext",
                content: {
                  text: text,
                  images: options.images
                }
              };
            } else {
              updatedMessage = {
                id: message.id,
                role: "user",
                type: "text",
                content: text
              };
            }
            
            // Update the store with the kept messages + new updated message
            useStore.setState({ messages: [...messagesToKeep] });
            
            // Send the updated message to get a new response
            void sendMessage(updatedMessage, {
              deepThinkingMode: options.deepThinkingMode,
              searchBeforePlanning: options.searchBeforePlanning
            }, messages);
            
            // Exit edit mode
            setEditingMessageId(null);
          }}
          nextMessages={messages.slice(index + 1)}
        />
      ))}
      {loading && <LoadingAnimation className="mt-8" />}
    </div>
  );
}

function MessageView({ 
  message, 
  isEditing,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  nextMessages
}: { 
  message: Message;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdit: (text: string, options: { deepThinkingMode: boolean; searchBeforePlanning: boolean; images?: string[] }) => void;
  nextMessages: Message[];
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside the image
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setSelectedImage(null);
      }
    }

    if (selectedImage) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedImage]);

  // Handle image download
  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy message content to clipboard
  const copyToClipboard = () => {
    let textToCopy = "";
    
    if (message.type === "text") {
      textToCopy = message.content as string;
    } else if (message.type === "imagetext") {
      textToCopy = message.content.text;
    }
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 1000); // Show check icon for 1 second
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  if (isEditing) {
    // Determine initial content and images for InputBox
    let initialText = "";
    let initialImages: string[] = [];
    
    if (message.type === "text") {
      initialText = message.content as string;
    } else if (message.type === "imagetext") {
      initialText = message.content.text;
      initialImages = message.content.images || [];
    }
    
    return (
      <div className="w-full mb-8 bg-white rounded-2xl shadow-xs border border-gray-100">
        <div className="p-2 bg-gray-50 rounded-t-lg border border-gray-100 flex items-center">
          <span className="text-sm font-medium text-gray-700">Edit message</span>
          <button 
            onClick={onCancelEditing}
            className="ml-auto px-3 py-1 text-sm text-gray-600 hover:text-gray-800 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
        <InputBox 
          className="w-full rounded-t-none border border-gray-100 border-t-0"
          responding={false}
          initialText={initialText}
          initialImages={initialImages}
          onCancel={onCancelEditing}
          onSend={(text, options) => {
            onSaveEdit(text, options);
          }}
        />
        {nextMessages.length > 0 && (
          <div className="text-xs text-gray-500 mt-2 text-center mb-2">
            Editing this message will remove {nextMessages.length} subsequent message{nextMessages.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  if (message.type === "text" && message.content) {
    return (
      <div 
        className={cn("flex flex-col", message.role === "user" && "items-end")}
        onMouseEnter={() => message.role === "user" && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className={cn(
            "mb-1 w-fit max-w-[95%] sm:max-w-[90%] md:max-w-[75%] lg:max-w-[560px] rounded-2xl px-4 py-3 shadow-xs",
            message.role === "user" && "rounded-ee-none bg-blue-500 text-white",
            message.role === "assistant" && "rounded-es-none bg-white",
          )}
        >
          <Markdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </Markdown>
        </div>
        
        {message.role === "user" && isHovering && (
          <div className="flex space-x-2 mb-8 text-sm text-gray-500">
            <button 
              className="flex items-center hover:text-gray-700 transition-colors"
              onClick={onStartEditing}
              aria-label="Edit message"
            >
              <EditOutlined className="h-3.5 w-3.5 mr-1" />
              <span>Edit</span>
            </button>
            <button 
              className="flex items-center hover:text-gray-700 transition-colors"
              onClick={copyToClipboard}
              aria-label="Copy message"
            >
              {copySuccess ? (
                <>
                  <CheckOutlined className="h-3.5 w-3.5 mr-1 text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <CopyOutlined className="h-3.5 w-3.5 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
        {!isHovering && <div className="mb-8"></div>}
      </div>
    );
  } else if (message.type === "imagetext" && message.content) {
    return (
      <>
        <div 
          className={cn("flex flex-col", message.role === "user" && "items-end")}
          onMouseEnter={() => message.role === "user" && setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div
            className={cn(
              "mb-1 w-fit max-w-[95%] sm:max-w-[90%] md:max-w-[75%] lg:max-w-[560px] rounded-2xl px-4 py-3 shadow-xs",
              message.role === "user" && "rounded-ee-none bg-blue-500 text-white",
              message.role === "assistant" && "rounded-es-none bg-white",
            )}
          >
            {message.content.images && message.content.images.length > 0 && (
              <div className="flex flex-wrap flex-col gap-2 mb-3">
                {message.content.images.map((image, index) => (
                    <div 
                      key={index} 
                      className="relative overflow-hidden rounded-md bg-gray-50 flex justify-center"
                    >
                      <div 
                        onClick={() => setSelectedImage(image)}
                        className="cursor-pointer flex justify-center"
                      >
                        <img 
                          src={image} 
                          alt={`Uploaded image ${index + 1}`} 
                          className="object-contain max-w-full max-h-[240px] rounded-md shadow-sm hover:shadow transition-all"
                          style={{ maxWidth: message.content.images.length > 1 ? '240px' : '100%' }}
                        />
                      </div>
                    </div>
                ))}
              </div>
            )}
            <Markdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={cn(
                    "underline",
                    message.role === "user" ? "text-white hover:text-blue-100" : "text-blue-500 hover:text-blue-700"
                  )}>
                    {children}
                  </a>
                ),
              }}
            >
              {message.content.text}
            </Markdown>
          </div>
          
          {message.role === "user" && isHovering && (
            <div className="flex space-x-2 mb-8 text-sm text-gray-500">
              <button 
                className="flex items-center hover:text-gray-700 transition-colors"
                onClick={onStartEditing}
                aria-label="Edit message"
              >
                <EditOutlined className="h-3.5 w-3.5 mr-1" />
                <span>Edit</span>
              </button>
              <button 
                className="flex items-center hover:text-gray-700 transition-colors"
                onClick={copyToClipboard}
                aria-label="Copy message"
              >
                {copySuccess ? (
                  <>
                    <CheckOutlined className="h-3.5 w-3.5 mr-1 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyOutlined className="h-3.5 w-3.5 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
          {!isHovering && <div className="mb-8"></div>}
        </div>

        {/* Image Popup */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center ">
            <div 
              className="fixed cursor-pointer inset-0 bg-black opacity-75 w-full h-full" 
              onClick={() => setSelectedImage(null)}
            ></div>
            <div 
              ref={popupRef} 
              className="relative max-w-[90vw] max-h-[90vh]"
            >
              <img 
                src={selectedImage} 
                alt="Enlarged view" 
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
              
              {/* Control buttons */}
              <div className="absolute top-2 right-2 flex space-x-2">
                <button 
                  onClick={() => handleDownload(selectedImage)}
                  className=" cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-black bg-opacity-50 text-white transition-colors hover:bg-opacity-70"
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className=" cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-black bg-opacity-50 text-white transition-colors hover:bg-opacity-70"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  } else if (message.type === "workflow") {
    return (
      <WorkflowProgressView
        className="mb-8"
        workflow={message.content.workflow}
      />
    );
  }
  return null;
}
