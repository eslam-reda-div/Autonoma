import {
  ArrowUpOutlined,
  GlobalOutlined,
  RobotOutlined,
  AudioOutlined,
  TranslationOutlined,
  PictureOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { type KeyboardEvent, useCallback, useEffect, useState, useRef, ChangeEvent } from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Atom } from "~/core/icons";
import { setEnabledTeamMembers, useStore } from "~/core/store";
import { cn } from "~/core/utils";
import { SpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from "~/types/speech-recognition";

export function InputBox({
  className,
  size,
  responding,
  onSend,
  onCancel,
  initialText = "",
  initialImages = [],
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  onSend?: (
    message: string,
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean; images?: string[] },
  ) => void;
  onCancel?: () => void;
  initialText?: string;
  initialImages?: string[];
}) {
  const teamMembers = useStore((state) => state.teamMembers);
  const enabledTeamMembers = useStore((state) => state.enabledTeamMembers);

  const [message, setMessage] = useState(initialText);
  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<"en-US" | "ar-SA">("en-US");
  const [images, setImages] = useState<{ base64: string; file?: File }[]>(
    initialImages.map(image => ({ base64: image }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const saveConfig = useCallback(() => {
    localStorage.setItem(
      "Autonoma.config.inputbox",
      JSON.stringify({ deepThinkingMode, searchBeforePlanning }),
    );
  }, [deepThinkingMode, searchBeforePlanning]);

  const handleSendMessage = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "") {
        return;
      }
      if (onSend) {
        onSend(message, { deepThinkingMode, searchBeforePlanning, images: images.map((img) => img.base64) });
        setMessage("");
        setImages([]);
      }
    }
  }, [
    responding,
    onCancel,
    message,
    onSend,
    deepThinkingMode,
    searchBeforePlanning,
    images,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (responding) {
        return;
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        imeStatus === "inactive"
      ) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [responding, imeStatus, handleSendMessage],
  );

  useEffect(() => {
    const config = localStorage.getItem("Autonoma.config.inputbox");
    if (config) {
      const { deepThinkingMode, searchBeforePlanning } = JSON.parse(config);
      setDeepThinkMode(deepThinkingMode);
      setSearchBeforePlanning(searchBeforePlanning);
    }
  }, []);

  useEffect(() => {
    saveConfig();
  }, [deepThinkingMode, searchBeforePlanning, saveConfig]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handlePaste = useCallback((event: Event) => {
    const clipboardEvent = event as ClipboardEvent;
    const items = clipboardEvent.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf('image') !== -1) {
        clipboardEvent.preventDefault(); // Prevent the default paste action
        const file = item.getAsFile();
        if (!file) continue;
        
        setIsUploading(true);
        
        (async () => {
          try {
            const base64 = await fileToBase64(file);
            setImages(prev => [...prev, { base64, file }]);
          } catch (error) {
            console.error('Error processing pasted image:', error);
          } finally {
            setIsUploading(false);
          }
        })();
        
        break; // Only handle the first image for now
      }
    }
  }, []);

  useEffect(() => {
    // Add paste event listener to the textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => {
        textarea.removeEventListener('paste', handlePaste);
      };
    }
  }, [handlePaste]);

  const toggleVoiceRecording = useCallback(() => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = speechLanguage; // Use selected language
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript: string = event.results?.[0]?.[0]?.transcript || '';
        setMessage((prevMessage: string) => prevMessage + ' ' + transcript.trim());
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      alert('Failed to start speech recognition');
      setIsRecording(false);
    }
  }, [isRecording, speechLanguage]);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const newImages: Array<{ base64: string; file: File }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file || !file.type.startsWith('image/')) continue;
        
        const base64 = await fileToBase64(file);
        newImages.push({ base64, file });
      }
      
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  }, []);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn(className)}>
      {/* Images preview section - moved above the text input */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 py-2 sm:px-3 md:px-4 border-b border-gray-100">
          {images.map((image, index) => (
            <div key={index} className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 overflow-hidden rounded-md shadow-sm border border-gray-200 group">
              <img
                src={image.base64}
                alt={`Uploaded ${index}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 border-none shadow-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-all"
                onClick={() => handleRemoveImage(index)}
              >
                <CloseCircleOutlined className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          ))}
          {isUploading && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 border border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
              <div className="animate-pulse text-blue-500">
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="w-full">
        <textarea
          ref={textareaRef}
          className={cn(
            "m-0 w-full resize-none border-none px-4 py-3 text-base md:text-lg",
            size === "large" ? "min-h-20 sm:min-h-24 md:min-h-28 lg:min-h-32" : "min-h-4",
          )}
          placeholder="What can I do for you?"
          value={message}
          onCompositionStart={() => setImeStatus("active")}
          onCompositionEnd={() => setImeStatus("inactive")}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between px-2 py-2 sm:px-3 md:px-4 md:py-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2">
          <Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("rounded-2xl px-2 sm:px-3 md:px-4 text-xs sm:text-sm", {
                      "border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600":
                        true,
                    })}
                  >
                    <RobotOutlined className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Agents</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teamMembers.map((member) => (
                  <Tooltip key={member.name}>
                    <TooltipTrigger asChild>
                      <DropdownMenuCheckboxItem
                        key={member.name}
                        disabled={!member.is_optional}
                        checked={enabledTeamMembers.includes(member.name)}
                        onCheckedChange={() => {
                          setEnabledTeamMembers(
                            enabledTeamMembers.includes(member.name)
                              ? enabledTeamMembers.filter(
                                  (name) => name !== member.name,
                                )
                              : [...enabledTeamMembers, member.name],
                          );
                        }}
                      >
                        {member.name
                          .split('_')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                        {member.is_optional && (
                          <span className="text-xs text-gray-400">
                            (Optional)
                          </span>
                        )}
                      </DropdownMenuCheckboxItem>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{member.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>
              <p>Enable or disable agents</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn("rounded-2xl px-2 sm:px-3 md:px-4 text-xs sm:text-sm", {
                  "border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600":
                    deepThinkingMode,
                })}
                onClick={() => {
                  setDeepThinkMode(!deepThinkingMode);
                }}
              >
                <Atom className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Deep Think</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Deep thinking mode. Think before planning.
                <br />
                <br />
                <span className="text-xs text-gray-300">
                  This feature may cost more tokens and time.
                </span>
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn("rounded-2xl px-3 sm:px-3 md:px-4 text-xs sm:text-sm", {
                  "border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600":
                    searchBeforePlanning,
                })}
                onClick={() => {
                  setSearchBeforePlanning(!searchBeforePlanning);
                }}
              >
                <GlobalOutlined className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search before planning</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full",
                  isUploading ? "bg-gray-100 border-gray-300 text-gray-500" : "bg-button",
                )}
                onClick={handleImageUploadClick}
              >
                <PictureOutlined className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload Images</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2 mt-2 sm:mt-1 md:mt-0">
          <Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-button"
                  >
                    <TranslationOutlined className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Voice Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={speechLanguage === "en-US"}
                  onCheckedChange={() => setSpeechLanguage("en-US")}
                >
                  English
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={speechLanguage === "ar-SA"}
                  onCheckedChange={() => setSpeechLanguage("ar-SA")}
                >
                  Arabic (العربية)
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>
              <p>Speech Recognition Language</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full",
                  isRecording ? "bg-red-100 border-red-300 text-red-500" : "bg-button"
                )}
                onClick={toggleVoiceRecording}
              >
                <AudioOutlined className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? "Stop Recording" : "Voice Input"} ({speechLanguage === "en-US" ? "English" : "Arabic"})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full",
                  responding ? "bg-button-hover" : "bg-button",
                )}
                onClick={handleSendMessage}
              >
                {responding ? (
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center">
                    <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 rounded-sm bg-red-300" />
                  </div>
                ) : (
                  <ArrowUpOutlined className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{responding ? "Stop" : "Send"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
    </div>
  );
}
