import { Message } from "../messaging";
import jsPDF from "jspdf";
import { Workflow, WorkflowStep } from "../workflow";

// Define message content types more specifically
interface TextContent {
  text: string;
}

interface ImageTextContent {
  text: string;
  images: string[];
}

interface WorkflowContent {
  workflow: Workflow;
}

// Task interfaces for workflow
interface ThinkingTask {
  id: string;
  type: "thinking";
  state: "pending" | "running" | "success" | "error";
  payload: {
    text?: string;
    reason?: string;
  };
}

interface ToolCallTask {
  id: string;
  type: "tool_call";
  state: "pending" | "running" | "success" | "error";
  payload: {
    toolName: string;
    input: any;
    output?: any;
  };
}

type Task = ThinkingTask | ToolCallTask;

// Define export formats
export enum ExportFormat {
  PDF = "pdf",
  TEXT = "text",
  JSON = "json",
  HTML = "html",
}

// PDF export options
export interface PDFExportOptions {
  title?: string;
  filename?: string;
  includeTimestamp?: boolean;
  pageSize?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  headerLogo?: string;
  headerTitle?: string;
  footerText?: string;
  theme?: "light" | "dark" | "professional" | "minimal";
  fontSize?: number;
  lineSpacing?: number;
  includeMetadata?: boolean;
  includeWorkflowDetails?: boolean; // Whether to include detailed workflow steps
  workflowStyle?: "compact" | "detailed"; // Style of workflow representation
  highlightToolCalls?: boolean; // Whether to highlight tool calls in workflows
}

// Default export options
export const defaultPDFOptions: PDFExportOptions = {
  title: "Chat Export",
  filename: `autonoma-chat-export-${new Date().toISOString().slice(0, 10)}`,
  includeTimestamp: true,
  pageSize: "a4",
  orientation: "portrait",
  headerTitle: "Autonoma Chat",
  footerText: `Generated on ${new Date().toLocaleString()}`,
  theme: "professional",
  fontSize: 10,
  lineSpacing: 1.5,
  includeMetadata: true,
  includeWorkflowDetails: true,
  workflowStyle: "detailed",
  highlightToolCalls: true,
};

/**
 * Exports a chat conversation to the specified format
 * @param messages The messages to export
 * @param format The format to export to
 * @param options Options for the export
 */
export async function exportChat(
  messages: Message[],
  format: ExportFormat,
): Promise<void> {
  switch (format) {
    case ExportFormat.PDF:
      return exportToPDF(messages);
    case ExportFormat.TEXT:
      return exportToText(messages);
    case ExportFormat.JSON:
      return exportToJSON(messages);
    case ExportFormat.HTML:
      return exportToHTML(messages);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Exports a chat conversation to PDF
 * @param messages The messages to export
 */
async function exportToPDF(
  messages: Message[],
): Promise<void> {
  // First generate the HTML content using the existing function
  // But instead of downloading, we'll create a printable page

  // Create HTML document - copied from exportToHTML function
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Autonoma Chat Export</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .header h1 {
          margin-bottom: 5px;
        }
        .header .timestamp {
          color: #666;
          font-size: 14px;
        }
        .message {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .user {
          background-color: #e6f7ff;
          margin-left: 50px;
          border-left: 4px solid #1890ff;
        }
        .assistant {
          background-color: #f9f9f9;
          margin-right: 50px;
          border-left: 4px solid #52c41a;
        }
        .role {
          font-weight: bold;
          margin-bottom: 10px;
          color: #1890ff;
        }
        .assistant .role {
          color: #52c41a;
        }
        .content {
          white-space: pre-wrap;
        }
        .images {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 15px;
        }
        .images img {
          max-width: 200px;
          max-height: 150px;
          object-fit: contain;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 5px;
        }
        .workflow {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          border: 1px solid #e8e8e8;
        }
        .workflow-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e8e8e8;
        }
        .workflow-step {
          margin-bottom: 10px;
          padding: 8px;
          background-color: #fafafa;
          border-radius: 4px;
        }
        .step-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .tool-call {
          background-color: #e6f7ff;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #91caff;
        }
        .tool-name {
          font-weight: bold;
          color: #1677ff;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        /* Print-specific styles */
        @media print {
          body {
            margin: 0;
            padding: 15px;
            max-width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Ensure page breaks don't happen in the middle of a message */
          .message {
            page-break-inside: avoid;
          }
          
          /* Force background colors and images to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          .user {
            background-color: #e6f7ff !important;
            border-left: 4px solid #1890ff !important;
          }
          
          .assistant {
            background-color: #f9f9f9 !important;
            border-left: 4px solid #52c41a !important;
          }
          
          .tool-call {
            background-color: #e6f7ff !important;
            border: 1px solid #91caff !important;
          }
          
          .workflow {
            background-color: #f5f5f5 !important;
            border: 1px solid #e8e8e8 !important;
          }
          
          .workflow-step {
            background-color: #fafafa !important;
          }
        }
        
        /* Export controls that only show on screen, not in print */
        .export-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          z-index: 9999;
        }
        
        .export-controls button {
          background: #1890ff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .export-controls button:hover {
          background: #0c6dc7;
        }
        
        .export-controls button:last-child {
          margin-right: 0;
          background: #f5f5f5;
          color: #333;
        }
        
        .export-controls button:last-child:hover {
          background: #e8e8e8;
        }
      </style>
    </head>
    <body>
      <div class="export-controls no-print">
        <button onclick="window.print()">Print to PDF</button>
        <button onclick="window.close()">Close</button>
      </div>
      <div class="header">
        <h1>Autonoma Chat Export</h1>
        <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
      </div>
  `;
  
  messages.forEach(message => {
    const roleText = message.role === "user" ? "You" : "Assistant";
    const roleClass = message.role === "user" ? "user" : "assistant";
    
    html += `<div class="message ${roleClass}">`;
    html += `<div class="role">${roleText}</div>`;
    
    if (message.type === "text") {
      html += `<div class="content">${escapeHTML(message.content as string)}</div>`;
    } else if (message.type === "imagetext") {
      html += `<div class="content">${escapeHTML(message.content.text)}</div>`;
      
      // Add images if present
      if (message.content.images && message.content.images.length > 0) {
        html += `<div class="images">`;
        message.content.images.forEach(imgSrc => {
          html += `<img src="${imgSrc}" alt="Chat image">`;
        });
        html += `</div>`;
      }
    } else if (message.type === "workflow") {
      const workflow = message.content.workflow;
      
      if (workflow) {
        html += `<div class="workflow">`;
        html += `<div class="workflow-title">${escapeHTML(workflow.name || "Workflow")}</div>`;
        
        // Add steps
        if (workflow.steps && Array.isArray(workflow.steps)) {
          workflow.steps.forEach((step, index) => {
            if (step.agentName === "reporter") return; // Skip reporter steps
            
            html += `<div class="workflow-step">`;
            html += `<div class="step-title">Step ${index + 1}: ${getStepName(step)}</div>`;
            
            // Add tasks
            if (step.tasks && Array.isArray(step.tasks)) {
              step.tasks.forEach(task => {
                if (task.type === "thinking" && task.payload && task.payload.text) {
                  html += `<div class="thinking" style="opacity: 0.8; font-style: italic; margin: 5px 0; font-size: 0.9em;">
                    ${escapeHTML(task.payload.text)}
                  </div>`;
                } else if (task.type === "tool_call" && task.payload) {
                  html += `<div class="tool-call">`;
                  html += `<div class="tool-name">${formatToolName(task.payload.toolName)}</div>`;
                  
                  // Input
                  if (task.payload.input) {
                    html += `<div style="margin-bottom: 5px;">
                      <strong>Input:</strong> ${escapeHTML(JSON.stringify(task.payload.input))}
                    </div>`;
                  }
                  
                  // Output
                  if (task.payload.output) {
                    html += `<div>
                      <strong>Output:</strong> 
                      <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 0.9em;">${escapeHTML(task.payload.output)}</pre>
                    </div>`;
                  }
                  
                  html += `</div>`;
                }
              });
            }
            
            html += `</div>`;
          });
        }
        
        // Add reporter content if available
        const reporterStep = workflow.steps.find(step => step.agentName === "reporter");
        if (reporterStep && reporterStep.tasks && reporterStep.tasks.length > 0) {
          const reporterTask = reporterStep.tasks[0];
          if (reporterTask && reporterTask.type === "thinking" && reporterTask.payload && reporterTask.payload.text) {
            html += `<div style="margin-top: 15px; padding: 10px; background-color: #f0f5ff; border-radius: 8px; border: 1px solid #d6e4ff;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #1677ff;">Summary Report</div>
              <div style="white-space: pre-wrap;">${escapeHTML(reporterTask.payload.text)}</div>
            </div>`;
          }
        }
        
        html += `</div>`;
      }
    }
    
    html += `</div>`;
  });
  
  html += `
      <div class="footer">
        Exported from Autonoma Chat
      </div>
      <script>
        // Auto-print when loaded in browsers that block the automatic print dialog
        window.addEventListener('load', function() {
          // Small delay to ensure everything is rendered properly
          setTimeout(function() {
            window.print();
          }, 1000);
        });
      </script>
    </body>
    </html>
  `;

  // Open a new window/tab with the HTML content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // For browsers that don't automatically trigger print
    printWindow.focus();
  } else {
    // Fallback if popup is blocked
    alert('Please allow popups to export to PDF');
  }

  return Promise.resolve();
}

function exportToText(messages: Message[]): Promise<void> {
  const spacer = "\n" + "=".repeat(70) + "\n\n";
  let text = "==================== AUTONOMA CHAT EXPORT ====================\n\n";
  text += `Generated on: ${new Date().toLocaleString()}\n`;
  text += `Number of messages: ${messages.length}\n`;
  text += spacer;
  
  messages.forEach((message, index) => {
    const role = message.role === "user" ? "YOU" : "ASSISTANT";
    text += `### ${role} (Message ${index + 1}) ###\n\n`;
    
    if (message.type === "text") {
      text += `${message.content}\n`;
    } else if (message.type === "imagetext") {
      text += `${message.content.text}\n`;
      
      if (message.content.images && message.content.images.length > 0) {
        text += `\n[This message contains ${message.content.images.length} image(s)]\n`;
        message.content.images.forEach((img, i) => {
          text += `  Image ${i + 1}: ${img}\n`;
        });
      }
    } else if (message.type === "workflow") {
      const workflow = message.content.workflow;
      
      text += `WORKFLOW: ${workflow?.name || "Untitled Workflow"}\n`;
      text += "-".repeat(70) + "\n\n";
      
      if (workflow?.steps) {
        text += `Total steps: ${workflow.steps.length}\n\n`;
        
        workflow.steps.forEach((step: WorkflowStep, stepIndex: number) => {
          text += `STEP ${stepIndex + 1}: ${getStepName(step)}\n`;
          text += `Agent: ${step.agentName}\n`;
          text += "-".repeat(50) + "\n\n";
          
          if (step.tasks && Array.isArray(step.tasks)) {
            step.tasks.forEach((task: Task, taskIndex: number) => {
              text += `Task ${taskIndex + 1}: ${task.type.toUpperCase()} (${task.state})\n`;
              
              if (task.type === "thinking" && task.payload) {
                if (task.payload.text) {
                  text += "Content:\n";
                  text += "------------------\n";
                  text += `${task.payload.text}\n`;
                  text += "------------------\n";
                }
                if (task.payload.reason) {
                  text += `Reason: ${task.payload.reason}\n`;
                }
              } else if (task.type === "tool_call" && task.payload) {
                text += `Tool: ${formatToolName(task.payload.toolName)}\n\n`;
                
                // Input details
                text += "Input:\n";
                text += "```\n";
                text += JSON.stringify(task.payload.input, null, 2) + "\n";
                text += "```\n\n";
                
                // Output details
                if (task.payload.output) {
                  text += "Output:\n";
                  text += "```\n";
                  
                  // Try to format the output nicely if it's JSON
                  try {
                    // Check if it's a JSON string
                    const parsed = JSON.parse(task.payload.output);
                    text += JSON.stringify(parsed, null, 2);
                  } catch (e) {
                    // Not JSON, use as-is
                    text += task.payload.output;
                  }
                  
                  text += "\n```\n";
                }
              }
              
              text += "\n" + "-".repeat(40) + "\n\n";
            });
          }
        });
      }
    }
    
    text += spacer;
  });
  
  text += "==================== END OF EXPORT ====================\n";
  
  // Create a downloadable text file
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autonoma-chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return Promise.resolve();
}

function exportToJSON(messages: Message[]): Promise<void> {
  const data = JSON.stringify(messages, null, 2);
  
  // Create a downloadable JSON file
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autonoma-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return Promise.resolve();
}

function exportToHTML(messages: Message[]): Promise<void> {
  // Create HTML document
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Autonoma Chat Export</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .header h1 {
          margin-bottom: 5px;
        }
        .header .timestamp {
          color: #666;
          font-size: 14px;
        }
        .message {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .user {
          background-color: #e6f7ff;
          margin-left: 50px;
          border-left: 4px solid #1890ff;
        }
        .assistant {
          background-color: #f9f9f9;
          margin-right: 50px;
          border-left: 4px solid #52c41a;
        }
        .role {
          font-weight: bold;
          margin-bottom: 10px;
          color: #1890ff;
        }
        .assistant .role {
          color: #52c41a;
        }
        .content {
          white-space: pre-wrap;
        }
        .images {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 15px;
        }
        .images img {
          max-width: 200px;
          max-height: 150px;
          object-fit: contain;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 5px;
        }
        .workflow {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          border: 1px solid #e8e8e8;
        }
        .workflow-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e8e8e8;
        }
        .workflow-step {
          margin-bottom: 10px;
          padding: 8px;
          background-color: #fafafa;
          border-radius: 4px;
        }
        .step-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .tool-call {
          background-color: #e6f7ff;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #91caff;
        }
        .tool-name {
          font-weight: bold;
          color: #1677ff;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Autonoma Chat Export</h1>
        <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
      </div>
  `;
  
  messages.forEach(message => {
    const roleText = message.role === "user" ? "You" : "Assistant";
    const roleClass = message.role === "user" ? "user" : "assistant";
    
    html += `<div class="message ${roleClass}">`;
    html += `<div class="role">${roleText}</div>`;
    
    if (message.type === "text") {
      html += `<div class="content">${escapeHTML(message.content as string)}</div>`;
    } else if (message.type === "imagetext") {
      html += `<div class="content">${escapeHTML(message.content.text)}</div>`;
      
      // Add images if present
      if (message.content.images && message.content.images.length > 0) {
        html += `<div class="images">`;
        message.content.images.forEach(imgSrc => {
          html += `<img src="${imgSrc}" alt="Chat image">`;
        });
        html += `</div>`;
      }
    } else if (message.type === "workflow") {
      const workflow = message.content.workflow;
      
      if (workflow) {
        html += `<div class="workflow">`;
        html += `<div class="workflow-title">${escapeHTML(workflow.name || "Workflow")}</div>`;
        
        // Add steps
        if (workflow.steps && Array.isArray(workflow.steps)) {
          workflow.steps.forEach((step, index) => {
            if (step.agentName === "reporter") return; // Skip reporter steps
            
            html += `<div class="workflow-step">`;
            html += `<div class="step-title">Step ${index + 1}: ${getStepName(step)}</div>`;
            
            // Add tasks
            if (step.tasks && Array.isArray(step.tasks)) {
              step.tasks.forEach(task => {
                if (task.type === "thinking" && task.payload && task.payload.text) {
                  html += `<div class="thinking" style="opacity: 0.8; font-style: italic; margin: 5px 0; font-size: 0.9em;">
                    ${escapeHTML(task.payload.text)}
                  </div>`;
                } else if (task.type === "tool_call" && task.payload) {
                  html += `<div class="tool-call">`;
                  html += `<div class="tool-name">${formatToolName(task.payload.toolName)}</div>`;
                  
                  // Input
                  if (task.payload.input) {
                    html += `<div style="margin-bottom: 5px;">
                      <strong>Input:</strong> ${escapeHTML(JSON.stringify(task.payload.input))}
                    </div>`;
                  }
                  
                  // Output
                  if (task.payload.output) {
                    html += `<div>
                      <strong>Output:</strong> 
                      <pre style="margin: 5px 0; white-space: pre-wrap; font-size: 0.9em;">${escapeHTML(task.payload.output)}</pre>
                    </div>`;
                  }
                  
                  html += `</div>`;
                }
              });
            }
            
            html += `</div>`;
          });
        }
        
        // Add reporter content if available
        const reporterStep = workflow.steps.find(step => step.agentName === "reporter");
        if (reporterStep && reporterStep.tasks && reporterStep.tasks.length > 0) {
          const reporterTask = reporterStep.tasks[0];
          if (reporterTask && reporterTask.type === "thinking" && reporterTask.payload && reporterTask.payload.text) {
            html += `<div style="margin-top: 15px; padding: 10px; background-color: #f0f5ff; border-radius: 8px; border: 1px solid #d6e4ff;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #1677ff;">Summary Report</div>
              <div style="white-space: pre-wrap;">${escapeHTML(reporterTask.payload.text)}</div>
            </div>`;
          }
        }
        
        html += `</div>`;
      }
    }
    
    html += `</div>`;
  });
  
  html += `
      <div class="footer">
        Exported from Autonoma Chat
      </div>
    </body>
    </html>
  `;
  
  // Create a downloadable HTML file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autonoma-chat-export-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return Promise.resolve();
}

// Helper function to escape HTML special characters
function escapeHTML(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

/**
 * Truncates text if it's too long
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Formats a tool name for display
 */
function formatToolName(toolName: string): string {
  if (!toolName) return "Unknown Tool";
  
  // Convert snake_case to Title Case with spaces
  return toolName
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Gets a display name for a workflow step
 */
function getStepName(step: WorkflowStep): string {
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
    case "reporter":
      return "Report";
    default:
      return step.agentName;
  }
}