import {
  ArrowUpOutlined,
  GlobalOutlined,
  RobotOutlined,
  AudioOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import { type KeyboardEvent, useCallback, useEffect, useState, useRef } from "react";

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
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  onSend?: (
    message: string,
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  ) => void;
  onCancel?: () => void;
}) {
  const teamMembers = useStore((state) => state.teamMembers);
  const enabledTeamMembers = useStore((state) => state.enabledTeamMembers);

  const [message, setMessage] = useState("");
  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<"en-US" | "ar-SA">("en-US");
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
        onSend(message, { deepThinkingMode, searchBeforePlanning });
        setMessage("");
      }
    }
  }, [
    responding,
    onCancel,
    message,
    onSend,
    deepThinkingMode,
    searchBeforePlanning,
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

  return (
    <div className={cn(className)}>
      <div className="w-full">
        <textarea
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
    </div>
  );
}
