import { CheckOutlined, CopyOutlined, SoundOutlined, PauseOutlined } from "@ant-design/icons";
import { useState } from "react";
import ReactMarkdown, {
  type Options as ReactMarkdownOptions,
} from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/core/utils";
import { useSpeech } from "react-text-to-speech";

export function Markdown({
  className,
  children,
  style,
  enableCopy,
  ...props
}: ReactMarkdownOptions & {
  className?: string;
  enableCopy?: boolean;
  style?: React.CSSProperties;
}) {

  return (
    <div
      className={cn(className, "markdown flex flex-col gap-4")}
      style={style}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
        {...props}
      >
        {processKatexInMarkdown(children)}
      </ReactMarkdown>
      {enableCopy && typeof children === "string" && (
        <div className="flex gap-2">
          <CopyButton content={children} />
          <ReadAloudButton content={children} />
        </div>
      )}
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => {
                setCopied(false);
              }, 1000);
            } catch (error) {
              console.error(error);
            }
          }}
        >
          {copied ? (
            <CheckOutlined className="h-4 w-4" />
          ) : (
            <CopyOutlined className="h-4 w-4" />
          )}{" "}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Copy</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ReadAloudButton({ content }: { content: string }) {
  const cleanContent = content.replace(/[^\p{L}\p{N}\s]/gu, '');
  const { speechStatus, start, pause, stop } = useSpeech({ text: cleanContent });
  const isPlaying = speechStatus === "started";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            if (isPlaying) {
              pause();
            } else {
              start();
            }
          }}
        >
          {isPlaying ? (
            <PauseOutlined className="h-4 w-4" />
          ) : (
            <SoundOutlined className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isPlaying ? "Pause" : "Read Aloud"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function processKatexInMarkdown(markdown?: string | null) {
  if (!markdown) return markdown;

  const markdownWithKatexSyntax = markdown
    .replace(/\\\\\[/g, "$$$$") // Replace '\\[' with '$$'
    .replace(/\\\\\]/g, "$$$$") // Replace '\\]' with '$$'
    .replace(/\\\\\(/g, "$$$$") // Replace '\\(' with '$$'
    .replace(/\\\\\)/g, "$$$$") // Replace '\\)' with '$$'
    .replace(/\\\[/g, "$$$$") // Replace '\[' with '$$'
    .replace(/\\\]/g, "$$$$") // Replace '\]' with '$$'
    .replace(/\\\(/g, "$$$$") // Replace '\(' with '$$'
    .replace(/\\\)/g, "$$$$"); // Replace '\)' with '$$';
  return markdownWithKatexSyntax;
}
