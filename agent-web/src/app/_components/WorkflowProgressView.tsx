import { CompressOutlined, ExpandOutlined } from "@ant-design/icons";
import { parse } from "best-effort-json-parser";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAutoScrollToBottom } from "~/components/hooks/useAutoScrollToBottom";
import { useOnStateChangeEffect } from "~/components/hooks/useOnStateChangeEffect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";
import {
  type ThinkingTask,
  type Workflow,
  type WorkflowStep,
} from "~/core/workflow";

import { Markdown } from "./Markdown";
import { ToolCallView } from "./ToolCallView";

export function WorkflowProgressView({
  className,
  workflow,
}: {
  className?: string;
  workflow: Workflow;
}) {
  const mainRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [blockWidth, setBlockWidth] = useState(928);
  const [blockHeight, setBlockHeight] = useState(400);
  const [isMobile, setIsMobile] = useState(false);

  const steps = useMemo(() => {
    return workflow.steps.filter((step) => step.agentName !== "reporter");
  }, [workflow]);
  const reportStep = useMemo(() => {
    return workflow.steps.find((step) => step.agentName === "reporter");
  }, [workflow]);

  useAutoScrollToBottom(mainRef, !workflow.isCompleted);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  useEffect(() => {
    if (isExpanded) {
      if (isMobile) {
        setBlockWidth(Math.min(window.innerWidth - 16, 500));
        setBlockHeight(window.innerHeight - 150);
      } else {
        setBlockWidth(1200);
        setBlockHeight(window.innerHeight - 320);
      }

      if (blockRef.current) {
        blockRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } else {
      if (isMobile) {
        setBlockWidth(Math.min(window.innerWidth - 16, 500));
        setBlockHeight(400);
      } else {
        setBlockWidth(928);
        setBlockHeight(400);
      }
    }
  }, [isExpanded, isMobile]);

  return (
    <div className="relative flex flex-col gap-4 max-w-full">
      <div
        ref={blockRef}
        className={cn(
          `flex overflow-hidden rounded-2xl border transition-all duration-300`,
          `md:flex-row flex-col`,
          className,
          isExpanded && !isMobile && "translate-x-[-136px]"
        )}
        style={{
          width: isMobile ? "100%" : blockWidth,
          height: isMobile ? "auto" : blockHeight,
          maxWidth: "100vw",
        }}
      >
        <aside
          className={cn(
            "relative flex shrink-0 flex-col bg-[rgba(0,0,0,0.02)]",
            "md:w-[220px] md:border-r",
            "w-full border-b"
          )}
        >
          <div className="shrink-0 px-4 py-4 font-medium">Flow</div>
          <ol
            className={cn(
              "flex grow list-disc flex-col gap-4 px-4 py-2",
              isMobile && "pb-10"
            )}
          >
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex cursor-pointer items-center gap-2"
                onClick={() => {
                  const element = document.getElementById(step.id);
                  if (element) {
                    element.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              >
                <div className="flex h-2 w-2 rounded-full bg-gray-400"></div>
                <div>{getStepName(step)}</div>
              </li>
            ))}
          </ol>
          {/* <div
            className={cn(
              "absolute bottom-2 left-4",
              isMobile && "bottom-2 right-4 left-auto"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                {isExpanded ? (
                  <CompressOutlined onClick={() => setIsExpanded(false)} />
                ) : (
                  <ExpandOutlined onClick={() => setIsExpanded(true)} />
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? "Collapse" : "Expand"}</p>
              </TooltipContent>
            </Tooltip>
          </div> */}
        </aside>
        <main
          className={cn(
            "grow overflow-auto bg-white p-4",
            isMobile && "max-h-[60vh] p-2"
          )}
          ref={mainRef}
        >
          <ul className="flex flex-col gap-4">
            {steps.map((step, stepIndex) => (
              <li key={step.id} className="flex flex-col gap-2">
                <h3
                  id={step.id}
                  className={cn(
                    "ml-[-4px] text-lg font-bold",
                    isMobile && "text-base ml-0"
                  )}
                >
                  📍 Step {stepIndex + 1}: {getStepName(step)}
                </h3>
                <ul className="flex flex-col gap-2">
                  {step.tasks
                    .filter(
                      (task) =>
                        !(
                          task.type === "thinking" &&
                          !task.payload.text &&
                          !task.payload.reason
                        )
                    )
                    .map((task) =>
                      task.type === "thinking" &&
                      step.agentName === "planner" ? (
                        <PlanTaskView key={task.id} task={task} />
                      ) : (
                        <li key={task.id} className="flex">
                          {task.type === "thinking" ? (
                            <Markdown
                              className={cn(
                                "pl-6 opacity-70",
                                isMobile && "pl-2"
                              )}
                              style={{
                                fontSize: "smaller",
                              }}
                            >
                              {task.payload.text}
                            </Markdown>
                          ) : (
                            <ToolCallView task={task} />
                          )}
                        </li>
                      )
                    )}
                </ul>
                {stepIndex < steps.length - 1 && <hr className="mt-8 mb-4" />}
              </li>
            ))}
          </ul>
        </main>
      </div>
      {reportStep && (
        <div
          className={cn(
            "flex flex-col gap-4 p-4",
            isMobile && "px-2 py-3 max-w-full overflow-hidden"
          )}
        >
          <Markdown
            enableCopy={workflow.isCompleted}
            className={cn(isMobile && "overflow-x-auto max-w-full")}
          >
            {reportStep.tasks[0]?.type === "thinking"
              ? reportStep.tasks[0].payload.text
              : ""}
          </Markdown>
        </div>
      )}
    </div>
  );
}

function PlanTaskView({ task }: { task: ThinkingTask }) {
  const [isThinkingCollapsed, setIsThinkingCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showThinking, setShowThinking] = useState(true);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Extract thinking process and plan from the payload text
  const { thinkingProcess, jsonPlan } = useMemo(() => {
    if (!task.payload.text) return { thinkingProcess: "", jsonPlan: "" };
    
    let thinkingProcess = "";
    let jsonPlan = task.payload.text.trim();
    
    // Check if the text contains a <think> tag
    // Check if the text contains a <think> tag
    const thinkStartIndex = jsonPlan.indexOf('<think>');
    if (thinkStartIndex !== -1) {
      // Extract content after <think> tag
      const afterThinkTagContent = jsonPlan.substring(thinkStartIndex + 7);
      
      // Find the closing tag
      const thinkEndIndex = afterThinkTagContent.indexOf('</think>');
      
      if (thinkEndIndex !== -1) {
      // Extract thinking process and remaining JSON plan
      thinkingProcess = afterThinkTagContent.substring(0, thinkEndIndex).trim();
      jsonPlan = afterThinkTagContent.substring(thinkEndIndex + 8).trim();
      } else {
      // If closing tag not found yet, consider everything after opening tag as thinking
      thinkingProcess = afterThinkTagContent.trim();
      jsonPlan = ""; // No JSON plan extracted yet until closing tag is found
      }
    }
    
    return { thinkingProcess, jsonPlan };
  }, [task.payload.text]);

  const plan = useMemo<{
    title?: string;
    steps?: { title?: string; description?: string }[];
  }>(() => {
    if (!jsonPlan) return {};
    
    let jsonString = jsonPlan;
    
    // Handle code block markers
    if (jsonString.startsWith("```json\n")) {
      jsonString = jsonString.substring(7);
    } else if (jsonString.startsWith("```ts\n")) {
      jsonString = jsonString.substring(5);
    }
    if (jsonString.endsWith("\n```")) {
      jsonString = jsonString.substring(0, jsonString.length - 3);
    }
    
    // Find the first valid JSON object in the string
    let jsonStartIndex = jsonString.indexOf('{');
    if (jsonStartIndex !== -1) {
      jsonString = jsonString.substring(jsonStartIndex);
      try {
        return parse(jsonString);
      } catch {
        return {};
      }
    }
    
    return {};
  }, [jsonPlan]);
  
  // Use thinkingProcess instead of reason if available
  const displayThinking = thinkingProcess || task.payload.reason;
  const markdown = `## ${plan.title ?? ""}\n\n${plan.steps?.map((step) => `- **${step.title ?? ""}**\n\n${step.description ?? ""}`).join("\n\n") ?? ""}`;

  // Auto-collapse the thinking only when it's complete
  useOnStateChangeEffect(
    task.state,
    {
      from: "pending",
      to: "success",
    },
    () => {
      setIsThinkingCollapsed(true);
    }
  );

  // Show the thinking process while the task is in progress
  useEffect(() => {
    if (task.state === "pending" && displayThinking) {
      setIsThinkingCollapsed(false);
    }
  }, [task.state, displayThinking]);

  return (
    <li key={task.id} className="flex flex-col max-w-full overflow-hidden">
      {displayThinking && (
        <Accordion
          type="single"
          collapsible
          className="mb-2"
          value={isThinkingCollapsed ? "" : "deep-thought"}
          onValueChange={(value) => {
            setIsThinkingCollapsed(value === "");
          }}
        >
          <AccordionItem value="deep-thought" className="border-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <AccordionTrigger
                  className={cn(
                    "flex w-fit flex-none items-center gap-2 rounded-2xl border px-3 py-1 text-sm hover:no-underline [&[data-state=open]>svg]:rotate-180",
                    isMobile && "px-2 py-0.5 text-xs",
                    task.state === "pending" && "animate-pulse"
                  )}
                >
                  <Atom className={cn("h-4 w-4", isMobile && "h-3 w-3")} />
                  <span>Deep Thought</span>
                  {task.state === "pending" && <span className="ml-1">...</span>}
                </AccordionTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isThinkingCollapsed ? "Show thought" : "Hide thought"}</p>
              </TooltipContent>
            </Tooltip>
            <AccordionContent>
              <Markdown
                className={cn(
                  "border-l-2 pt-2 pl-6 text-sm opacity-70",
                  isMobile && "pl-3 text-xs"
                )}
              >
                {displayThinking}
              </Markdown>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <div className="max-w-full overflow-hidden">
        <Markdown
          className={cn(
            "pl-6",
            isMobile && "pl-2 overflow-x-auto"
          )}
        >
          {markdown ?? ""}
        </Markdown>
      </div>
    </li>
  );
}

function getStepName(step: WorkflowStep) {
  switch (step.agentName) {
    case "browser":
      return "Browsing Web";
    case "coder":
      return "Coding";
    case "file_manager":
      return "File Management";
    case "computer":
      return "Controlling Computer";
    case "planner":
      return "Planning";
    case "researcher":
      return "Researching";
    case "supervisor":
      return "Thinking";
    default:
      return step.agentName;
  }
}
