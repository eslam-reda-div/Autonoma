import { useEffect, useState } from "react";

import {
  GlobalOutlined,
  PythonOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  LaptopOutlined,
  FileOutlined,
  CopyOutlined,
  DeleteOutlined,
  FolderOutlined,
  EditOutlined,
  SwapOutlined,
  FileSearchOutlined,
  YoutubeOutlined,
  BookOutlined,
  DollarOutlined,
  CloudOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { LRUCache } from "lru-cache";
import { useMemo } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { getApiUrl } from "~/core/api/api-url-store";
import { type ToolCallTask } from "~/core/workflow";

export function ToolCallView({ task }: { task: ToolCallTask }) {
  if (task.payload.toolName === "tavily_search") {
    return <TravilySearchToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "crawl_tool") {
    return <CrawlToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "browser") {
    return <BrowserToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "python_repl_tool") {
    return <PythonReplToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "bash_tool") {
    return <BashToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "computer") {
    return <ComputerToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "copy_file") {
    return <CopyFileToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "file_delete") {
    return <DeleteFileToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "move_file") {
    return <MoveFileToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "file_search") {
    return <FileSearchToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "list_directory") {
    return <ListDirectoryToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "read_file") {
    return <ReadFileToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "write_file") {
    return <WriteFileToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "duck_duck_go_tool") {
    return <DuckDuckGoToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "yahoo_finance_news_tool") {
    return <YahooFinanceNewsToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "youtube_search_tool") {
    return <YouTubeSearchToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "wikipedia_search_tool") {
    return <WikipediaSearchToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "open_weather_map_search_tool") {
    return <OpenWeatherMapSearchToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "hyperbrowser_extract_tool") {
    return <HyperbrowserExtractToolCallView task={task as ToolCallTask<any>} />;
  } else if (task.payload.toolName === "open_weather_map" || task.payload.toolName === "wikipedia" || task.payload.toolName === "youtube_search" || task.payload.toolName === "yahoo_finance_news" || task.payload.toolName === "duckduckgo_search") {
    return
  }
  return <div>{task.payload.toolName}</div>;
}
function BrowserToolCallView({
  task,
}: {
  task: ToolCallTask<{ instruction: string }>;
}) {
  const [isPending, setIsPending] = useState(task.state === "pending");
  
  // Update isPending whenever task.state changes
  useEffect(() => {
    setIsPending(task.state === "pending");
  }, [task.state]);
  
  const parsedOutput = useMemo(() => {
    if (!task.payload.output || task.state === "pending") return null;
    try {
      return JSON.parse(task.payload.output);
    } catch (e) {
      console.error("Failed to parse browser output:", e);
      return null;
    }
  }, [task.payload.output, task.state]);

  const gifFileName = useMemo(() => {
    if (!parsedOutput?.generated_gif_path) return null;
    
    // Extract only the filename from the path
    const pathParts = parsedOutput.generated_gif_path.split('/');
    return pathParts[pathParts.length - 1].replace('"', '');
  }, [parsedOutput]);

  const gifDownloadUrl = useMemo(() => {
    if (!gifFileName) return null;
    return getApiUrl() + `/browser_history/${gifFileName}`;
  }, [gifFileName]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <GlobalOutlined className="h-4 w-4 text-sm text-blue-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Browser Automation</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Instruction section */}
        <div className="flex flex-col mb-3">
          <div className="text-xs text-gray-500 mb-1">Instruction:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200">
            {task.payload.input.instruction}
          </div>
        </div>
        
        {/* Result content when available */}
        {!isPending && parsedOutput?.result_content && (
          <div className="flex flex-col mt-4">
            <div className="text-xs text-gray-500 mb-1">Result:</div>
            <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200">
              {parsedOutput.result_content}
            </div>
          </div>
        )}
        
        {/* GIF download option when available */}
        {!isPending && gifDownloadUrl && (
          <div className="flex justify-center mt-4">
            <a 
              href={gifDownloadUrl}
              download={gifFileName}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 transition-colors"
            >
              <GlobalOutlined />
              <span>Download Browser Recording</span>
            </a>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Browsing...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Browser task completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComputerToolCallView({
  task,
}: {
  task: ToolCallTask<{ task: string }>;
}) {
  const isPending = task.state === "pending";
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <LaptopOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span className="text-sm font-medium">Performing Computer Operation</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-6 shadow-sm overflow-hidden">
        {/* Mirror/reflection effect at the top */}
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent opacity-60"></div>
        
        <div className="flex flex-col items-center justify-center">
          {/* Computer icon with pulsing animation during pending state */}
          <div className={`relative flex items-center justify-center mb-2 ${isPending ? 'animate-pulse' : ''}`}>
            <LaptopOutlined className="text-blue-500 text-4xl" />
          </div>
          
          {/* Task description */}
          <div className="text-center mt-3 text-sm text-gray-700 max-w-[500px]">
            {task.payload.input.task}
          </div>
          
          {/* Loading indicator or completion status */}
          {isPending ? (
            <div className="mt-4 text-xs text-gray-500">
              Processing operation...
            </div>
          ) : (
            <div className="mt-4 text-xs text-green-600 font-medium">
              Operation completed
            </div>
          )}
        </div>
        
        {/* Bottom reflection/shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-gray-200/30 to-transparent"></div>
      </div>
    </div>
  );
}

const pageCache = new LRUCache<string, string>({ max: 100 });
function CrawlToolCallView({ task }: { task: ToolCallTask<{ url: string }> }) {
  const title = useMemo(() => {
    return pageCache.get(task.payload.input.url);
  }, [task.payload.input.url]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <GlobalOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>Reading</span>{" "}
          <a
            className="text-sm font-bold"
            href={task.payload.input.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            &quot;{title ?? task.payload.input.url}&quot;
          </a>
        </div>
      </div>
    </div>
  );
}

function TravilySearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const results = useMemo(() => {
    try {
      const results = JSON.parse(task.payload.output ?? "") ?? [];
      results.forEach((result: { url: string; title: string }) => {
        pageCache.set(result.url, result.title);
      });
      return results;
    } catch {
      return [];
    }
  }, [task.payload.output]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <SearchOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          Searching for{" "}
          <span className="font-bold">
            &quot;{task.payload.input.query}&quot;
          </span>
        </div>
      </div>
      {task.state !== "pending" && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div>
              <UnorderedListOutlined className="h-4 w-4 text-sm" />
            </div>
            <div>
              <span className="text-sm text-gray-500">
                {results.length} results found
              </span>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {results.map(
              (result: { url: string; title: string }, index: number) => (
                <li
                  key={result.url}
                  className="animate-bg-blink list-item list-inside pl-6"
                  style={{
                    animationDelay: `${200 + index * 100}ms`,
                  }}
                >
                  <a
                    className="flex items-center gap-2"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={result.url}
                  >
                    <img
                      className="h-4 w-4 rounded-full bg-slate-100 shadow-sm"
                      width={16}
                      height={16}
                      src={new URL(result.url).origin + "/favicon.ico"}
                      alt={result.title}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://perishablepress.com/wp/wp-content/images/2021/favicon-standard.png";
                      }}
                    />
                    {result.title}
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function PythonReplToolCallView({
  task,
}: {
  task: ToolCallTask<{ code: string }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <PythonOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>Writing and executing Python Code</span>
        </div>
      </div>
      {task.payload.input.code && (
        <div className="min-w[640px] mx-4 mt-2 max-h-[420px] max-w-[640px] overflow-auto rounded-lg border bg-gray-50 p-2">
          <SyntaxHighlighter language="python" style={docco}>
            {task.payload.input.code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

function BashToolCallView({ task }: { task: ToolCallTask<{ cmd: string }> }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <PythonOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>
            Executing <a className="font-medium">Bash Command</a>
          </span>
        </div>
      </div>
      {task.payload.input.cmd && (
        <div
          className="min-w[640px] mx-4 mt-2 max-h-[420px] max-w-[640px] overflow-auto rounded-lg border bg-gray-50 p-2"
          style={{ fontSize: "smaller" }}
        >
          <SyntaxHighlighter language="bash" style={docco}>
            {task.payload.input.cmd}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

function CopyFileToolCallView({
  task,
}: {
  task: ToolCallTask<{ source_path: string; destination_path: string }>;
}) {
  const isPending = task.state === "pending";
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <CopyOutlined className="h-4 w-4 text-sm text-blue-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Copy File</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* File paths section */}
        <div className="flex flex-col space-y-3 mb-2">
          <div className="flex items-center">
            <div className="text-xs text-gray-500 w-24">Source:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
              {task.payload.input.source_path}
            </div>
          </div>
          {/* Arrow animation for move operation */}
          <div className={`flex justify-center ${isPending ? 'animate-pulse' : ''}`}>
            <div className="bg-purple-100 rounded-full p-1">
              <SwapOutlined className="text-purple-500 rotate-90" />
            </div>
          </div>
          <div className="flex items-center relative">
            {/* <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-blue-200"></div>
            <div className="absolute left-12 top-1/2 w-3 h-0.5 bg-blue-200"></div> */}
            <div className="text-xs text-gray-500 w-24">Destination:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
              {task.payload.input.destination_path}
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Copying...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Copy complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteFileToolCallView({
  task,
}: {
  task: ToolCallTask<{ file_path: string }>;
}) {
  const isPending = task.state === "pending";
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <DeleteOutlined className="h-4 w-4 text-sm text-red-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Delete File</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* File path section */}
        <div className="flex items-center">
          <div className="text-xs text-gray-500 w-24">Path:</div>
          <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
            {task.payload.input.file_path}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Deleting...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              File deleted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoveFileToolCallView({
  task,
}: {
  task: ToolCallTask<{ source_path: string; destination_path: string }>;
}) {
  const isPending = task.state === "pending";
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <SwapOutlined className="h-4 w-4 text-sm text-purple-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Move File</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* File paths section */}
        <div className="flex flex-col space-y-3 mb-2">
          <div className="flex items-center">
            <div className="text-xs text-gray-500 w-24">From:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
              {task.payload.input.source_path}
            </div>
          </div>
          {/* Arrow animation for move operation */}
          <div className={`flex justify-center ${isPending ? 'animate-pulse' : ''}`}>
            <div className="bg-purple-100 rounded-full p-1">
              <SwapOutlined className="text-purple-500 rotate-90" />
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-xs text-gray-500 w-24">To:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
              {task.payload.input.destination_path}
            </div>
          </div>
        </div>
        
        
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Moving...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Move complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileSearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ dir_path: string; pattern: string }>;
}) {
  const isPending = task.state === "pending";
  const results = useMemo(() => {
    try {
      return task.payload.output ? JSON.parse(task.payload.output) : [];
    } catch {
      return [];
    }
  }, [task.payload.output]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <FileSearchOutlined className="h-4 w-4 text-sm text-indigo-500" />
        </div>
        <div>
          <span className="text-sm font-medium">File Search</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Search parameters */}
        <div className="flex flex-col space-y-3 mb-4">
          <div className="flex items-center">
            <div className="text-xs text-gray-500 w-24">Directory:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
              {task.payload.input.dir_path}
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-xs text-gray-500 w-24">Pattern:</div>
            <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1">
              {task.payload.input.pattern}
            </div>
          </div>
        </div>
        
        {/* Results section */}
        {!isPending && results.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <SearchOutlined className="mr-1" /> {results.length} files found
            </div>
            <div className="max-h-[200px] overflow-y-auto bg-white rounded border border-gray-200 p-2">
              <ul className="text-xs">
                {results.map((file: string, index: number) => (
                  <li 
                    key={index}
                    className="py-1 font-mono truncate animate-bg-blink"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <FileOutlined className="mr-2 text-indigo-400" />
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Searching files...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Search complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListDirectoryToolCallView({
  task,
}: {
  task: ToolCallTask<{ dir_path: string }>;
}) {
  const isPending = task.state === "pending";
  const files = useMemo(() => {
    try {
      return task.payload.output ? JSON.parse(task.payload.output) : [];
    } catch {
      return [];
    }
  }, [task.payload.output]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <FolderOutlined className="h-4 w-4 text-sm text-amber-500" />
        </div>
        <div>
          <span className="text-sm font-medium">List Directory</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Directory path */}
        <div className="flex items-center mb-4">
          <div className="text-xs text-gray-500 w-24">Path:</div>
          <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
            {task.payload.input.dir_path}
          </div>
        </div>
        
        {/* Contents section */}
        {!isPending && files.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <FolderOutlined className="mr-1" /> {files.length} items found
            </div>
            <div className="max-h-[200px] overflow-y-auto bg-white rounded border border-gray-200 p-2">
              <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-1">
                {files.map((file: string, index: number) => {
                  const isDirectory = file.endsWith('/');
                  return (
                    <li 
                      key={index}
                      className="py-1 px-2 font-mono truncate animate-bg-blink hover:bg-gray-50 rounded"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {isDirectory ? (
                        <FolderOutlined className="mr-2 text-amber-500" />
                      ) : (
                        <FileOutlined className="mr-2 text-gray-500" />
                      )}
                      {file}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Reading directory...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Directory listed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadFileToolCallView({
  task,
}: {
  task: ToolCallTask<{ file_path: string }>;
}) {
  const isPending = task.state === "pending";
  const fileContent = task.payload.output || "";

  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <FileOutlined className="h-4 w-4 text-sm text-teal-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Read File</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* File path section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Path:</div>
          <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
            {task.payload.input.file_path}
          </div>
        </div>
        
        {/* File content section */}
        {!isPending && fileContent && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <FileOutlined className="mr-1" /> File Content
            </div>
            <div className="max-h-[300px] overflow-y-auto bg-white rounded border border-gray-200 p-2">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">{fileContent}</pre>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Reading file...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              File read complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WriteFileToolCallView({
  task,
}: {
  task: ToolCallTask<{ file_path: string; text: string }>;
}) {
  const isPending = task.state === "pending";
  const fileName = useMemo(() => {
    const parts = task.payload.input.file_path.split('/');
    return parts[parts.length - 1];
  }, [task.payload.input.file_path]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <EditOutlined className="h-4 w-4 text-sm text-emerald-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Write File</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* File path section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Path:</div>
          <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
            {task.payload.input.file_path}
          </div>
        </div>
        
        {/* Content preview */}
        <div className="mt-1">
          <div className="text-xs text-gray-500 mb-2 flex items-center">
            <EditOutlined className="mr-1" /> Content Preview
          </div>
          <div className="max-h-[200px] overflow-y-auto bg-white rounded border border-gray-200 p-2">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words line-clamp-10">
              {task.payload.input.text}
            </pre>
          </div>
        </div>
        
        {/* Status indicator with file info */}
        <div className="flex justify-between items-center mt-3">
          <div className="text-xs text-gray-500">
            <FileOutlined className="mr-1" /> {fileName}
          </div>
          
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Writing file...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              File written
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DuckDuckGoToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const isPending = task.state === "pending";
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <SearchOutlined className="h-4 w-4 text-sm text-blue-500" />
        </div>
        <div>
          <span className="text-sm font-medium">DuckDuckGo Search</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Search query section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Query:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.query}
          </div>
        </div>
        
        {/* Results section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Search Results:</div>
            <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
              <p className="whitespace-pre-wrap">{task.payload.output}</p>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Searching...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Search complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YahooFinanceNewsToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const isPending = task.state === "pending";

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <DollarOutlined className="h-4 w-4 text-sm text-green-600" />
        </div>
        <div>
          <span className="text-sm font-medium">Yahoo Finance News</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Search query section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Company/Ticker:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.query}
          </div>
        </div>
        
        {/* Results section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Financial News:</div>
            <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
              <p className="whitespace-pre-wrap">{task.payload.output}</p>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Fetching financial news...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Financial data retrieved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YouTubeSearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const isPending = task.state === "pending";
  const [videoDetails, setVideoDetails] = useState<{url: string; title: string}[]>([]);
  
  // Extract video links from the output
  const videoLinks = useMemo(() => {
    if (!task.payload.output || isPending) return [];
    
    try {
      // Case 1: Output is a Python list as string
      if (task.payload.output.startsWith('[') && task.payload.output.endsWith(']')) {
        // Parse Python list format (remove the brackets and split by comma)
        const linksString = task.payload.output.slice(1, -1);
        return linksString.split(',')
          .map(link => link.trim().replace(/'/g, '').replace(/"/g, ''))
          .filter(link => link.includes('youtube.com'));
      }
      
      // Case 2: Regular expression for URLs in text
      const urlRegex = /(https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)[\w-]+(?:[^\s,'\[\]]*)?)/g;
      const matches = [...task.payload.output.matchAll(urlRegex)];
      return matches.map(match => match[0]);
    } catch (error) {
      console.error("Error parsing YouTube links:", error);
      return [];
    }
  }, [task.payload.output, isPending]);
  
  // Fetch video titles when links change
  useEffect(() => {
    if (videoLinks.length === 0) return;
    
    const fetchVideoDetails = async () => {
      const details = videoLinks.map(url => {
        // Extract video ID
        let videoId: string | undefined = '';
        if (url.includes('watch?v=')) {
          videoId = url.split('watch?v=')[1]?.split('&')[0];
        } else if (url.includes('shorts/')) {
          videoId = url.split('shorts/')[1]?.split('?')[0];
        }
        
        // Return basic info with fallback title
        return {
          url,
          title: `YouTube Video (${videoId})`,
          videoId
        };
      });
      
      setVideoDetails(details);
      
      // Try to fetch actual titles using YouTube API or OEmbed (if implemented)
      // This would be a place to add a fetch to your backend that could get titles
      // For now, we'll use the ID as title as a fallback
    };
    
    fetchVideoDetails();
  }, [videoLinks]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <YoutubeOutlined className="h-4 w-4 text-sm text-red-600" />
        </div>
        <div>
          <span className="text-sm font-medium">YouTube Search</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Search query section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Search Query:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.query}
          </div>
        </div>
        
        {/* Results section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <YoutubeOutlined className="mr-1 text-red-500" /> 
              {videoLinks.length > 0 ? `${videoLinks.length} videos found` : 'Search Results'}
            </div>
            
            {videoLinks.length > 0 ? (
              <div className="bg-white rounded border border-gray-200 p-2 max-h-[300px] overflow-y-auto">
                <ul className="text-sm space-y-2">
                  {videoDetails.length > 0 ? (
                    videoDetails.map((video, index) => (
                      <li 
                        key={index} 
                        className="animate-bg-blink rounded border border-gray-100 p-2"
                        style={{animationDelay: `${index * 100}ms`}}
                      >
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <YoutubeOutlined className="mr-2 text-red-500" />
                          {video.title}
                        </a>
                      </li>
                    ))
                  ) : (
                    // Fallback to just showing links while loading titles
                    videoLinks.map((url, index) => (
                      <li 
                        key={index} 
                        className="animate-bg-blink rounded border border-gray-100 p-2"
                        style={{animationDelay: `${index * 100}ms`}}
                      >
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <YoutubeOutlined className="mr-2 text-red-500" />
                          {url}
                        </a>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : (
              <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
                <p className="whitespace-pre-wrap">{task.payload.output}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Searching YouTube...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              YouTube search complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WikipediaSearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const isPending = task.state === "pending";

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <BookOutlined className="h-4 w-4 text-sm text-gray-500" />
        </div>
        <div>
          <span className="text-sm font-medium">Wikipedia Search</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Search query section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Query:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.query}
          </div>
        </div>
        
        {/* Results section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <BookOutlined className="mr-1" /> Wikipedia Results
            </div>
            <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
              <p className="whitespace-pre-wrap">{task.payload.output}</p>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Searching Wikipedia...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Wikipedia search complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpenWeatherMapSearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ location: string }>;
}) {
  const isPending = task.state === "pending";

  // Attempt to extract weather data if structured
  const weatherData = useMemo(() => {
    if (!task.payload.output || isPending) return null;
    
    try {
      // Check if the output is valid JSON
      return JSON.parse(task.payload.output);
    } catch {
      // If not JSON, return null and display raw output
      return null;
    }
  }, [task.payload.output, isPending]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <CloudOutlined className="h-4 w-4 text-sm text-blue-400" />
        </div>
        <div>
          <span className="text-sm font-medium">Weather Information</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Location section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Location:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.location}
          </div>
        </div>
        
        {/* Weather results section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <CloudOutlined className="mr-1" /> Weather Information
            </div>
            
            {weatherData ? (
              // Display structured weather data
              <div className="bg-white rounded border border-gray-200 p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(weatherData, null, 2)}
                </pre>
              </div>
            ) : (
              // Display raw text output
              <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
                <p className="whitespace-pre-wrap">{task.payload.output}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Fetching weather data...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Weather data retrieved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HyperbrowserExtractToolCallView({
  task,
}: {
  task: ToolCallTask<{ website_url: string; prompt: string; extraction_schema?: string }>;
}) {
  const isPending = task.state === "pending";

  // Parse JSON output if available
  const extractedData = useMemo(() => {
    if (!task.payload.output || isPending) return null;
    
    try {
      return JSON.parse(task.payload.output);
    } catch {
      return null;
    }
  }, [task.payload.output, isPending]);
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div>
          <ApiOutlined className="h-4 w-4 text-sm text-purple-600" />
        </div>
        <div>
          <span className="text-sm font-medium">Hyperbrowser Data Extraction</span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[640px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100 p-4 shadow-sm overflow-hidden">
        {/* Website URL section */}
        <div className="flex items-center mb-3">
          <div className="text-xs text-gray-500 w-24">Website URL:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1 truncate">
            <a 
              href={task.payload.input.website_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800"
            >
              {task.payload.input.website_url}
            </a>
          </div>
        </div>
        
        {/* Prompt section */}
        <div className="flex items-start mb-3">
          <div className="text-xs text-gray-500 w-24 pt-2">Extraction Prompt:</div>
          <div className="text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
            {task.payload.input.prompt}
          </div>
        </div>
        
        {/* Schema section (if provided) */}
        {task.payload.input.extraction_schema && (
          <div className="flex items-start mb-3">
            <div className="text-xs text-gray-500 w-24 pt-2">Schema:</div>
            <div className="bg-white px-3 py-2 rounded border border-gray-200 flex-1 font-mono text-xs">
              {task.payload.input.extraction_schema}
            </div>
          </div>
        )}
        
        {/* Extracted data section */}
        {!isPending && task.payload.output && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <ApiOutlined className="mr-1" /> Extracted Data
            </div>
            
            <div className="bg-white rounded border border-gray-200 p-3 max-h-[300px] overflow-y-auto">
              {extractedData ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{task.payload.output}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex justify-end mt-3">
          {isPending ? (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></div>
              Extracting data...
            </div>
          ) : (
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Data extraction complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
