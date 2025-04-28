import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

import { type Message } from "~/core/messaging";
import { cn } from "~/core/utils";

import { LoadingAnimation } from "./LoadingAnimation";
import { WorkflowProgressView } from "./WorkflowProgressView";

export function MessageHistoryView({
  className,
  messages,
  loading,
}: {
  className?: string;
  messages: Message[];
  loading?: boolean;
}) {
  return (
    <div className={cn(className)}>
      {messages.map((message) => (
        <MessageView key={message.id} message={message} />
      ))}
      {loading && <LoadingAnimation className="mt-8" />}
    </div>
  );
}

function MessageView({ message }: { message: Message }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  if (message.type === "text" && message.content) {
    return (
      <div className={cn("flex", message.role === "user" && "justify-end")}>
        <div
          className={cn(
            "relative mb-8 w-fit max-w-[95%] sm:max-w-[90%] md:max-w-[75%] lg:max-w-[560px] rounded-2xl px-4 py-3 shadow-xs",
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
      </div>
    );
  } else if (message.type === "imagetext" && message.content) {
    return (
      <>
        <div className={cn("flex", message.role === "user" && "justify-end")}>
          <div
            className={cn(
              "relative mb-8 w-fit max-w-[95%] sm:max-w-[90%] md:max-w-[75%] lg:max-w-[560px] rounded-2xl px-4 py-3 shadow-xs",
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
