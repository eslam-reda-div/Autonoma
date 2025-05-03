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
  options?: Partial<PDFExportOptions>
): Promise<void> {
  switch (format) {
    case ExportFormat.PDF:
      return exportToPDF(messages, options);
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
 * @param customOptions Optional custom options for the PDF export
 */
async function exportToPDF(
  messages: Message[],
  customOptions?: Partial<PDFExportOptions>
): Promise<void> {
  const options = { ...defaultPDFOptions, ...customOptions };
  const filename = `${options.filename}.pdf`;

  // Create a new PDF document with proper orientation and size
  const pdfSize = options.pageSize === "letter" 
    ? [216, 279] 
    : options.pageSize === "legal"
      ? [216, 356]
      : [210, 297]; // A4 default
  
  const pdf = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: options.pageSize || "a4",
  });

  // Calculate the width and height based on orientation
  const pdfWidth = options.orientation === "landscape" ? pdfSize[1] : pdfSize[0];
  const pdfHeight = options.orientation === "landscape" ? pdfSize[0] : pdfSize[1];
  
  // Add metadata if requested
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.title || "Chat Export",
      subject: "Autonoma Chat Export",
      author: "Autonoma",
      keywords: "chat, export, autonoma, workflow",
      creator: "Autonoma Chat Export Tool",
    });
  }

  // Set color schemes - using RGB values to ensure compatibility
  const colors = {
    light: {
      background: [255, 255, 255],  // White
      text: [51, 51, 51],           // Dark gray
      userBg: [230, 247, 255],      // Light blue
      userBorder: [99, 179, 237],   
      userRole: [49, 130, 206],     
      assistantBg: [248, 250, 252], // Light gray
      assistantBorder: [104, 211, 145],
      assistantRole: [56, 161, 105],
      toolCallBg: [230, 247, 255],  
      toolCallBorder: [191, 219, 254],
      toolCallTitle: [22, 119, 255],
      workflowBg: [248, 250, 252],  
      workflowBorder: [226, 232, 240],
      stepBg: [237, 242, 247],     
      stepBorder: [226, 232, 240],
      thinkingBg: [248, 250, 252],  
      thinkingBorder: [240, 244, 248],
    },
    dark: {
      background: [45, 45, 45],     // Dark gray
      text: [255, 255, 255],        // White
      userBg: [58, 58, 58],         // Darker gray
      userBorder: [66, 153, 225],   
      userRole: [99, 179, 237],     
      assistantBg: [42, 42, 42],    // Very dark gray
      assistantBorder: [72, 187, 120],
      assistantRole: [104, 211, 145],
      toolCallBg: [45, 55, 72],     
      toolCallBorder: [74, 85, 104],
      toolCallTitle: [99, 179, 237],
      workflowBg: [26, 32, 44],     
      workflowBorder: [45, 55, 72],
      stepBg: [45, 55, 72],         
      stepBorder: [74, 85, 104],
      thinkingBg: [26, 32, 44],     
      thinkingBorder: [45, 55, 72],
    }
  };
  
  const theme = options.theme === "dark" ? colors.dark : colors.light;
  
  // Set base font and background color
  pdf.setFillColor(theme.background[0], theme.background[1], theme.background[2]);
  pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
  pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
  pdf.setFont("helvetica");
  
  // Establish margins and content area
  const margin = 15; // mm
  const contentWidth = pdfWidth - (margin * 2);
  let yPosition = margin;
  
  // Add header
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(options.headerTitle || "Chat Export", margin, yPosition + 7);
  yPosition += 12;
  
  // Add timestamp if needed
  if (options.includeTimestamp) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(options.theme === "dark" ? 160 : 113, options.theme === "dark" ? 174 : 128, options.theme === "dark" ? 192 : 150);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, yPosition + 5);
    yPosition += 10;
  }
  
  // Add separator line
  pdf.setDrawColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
  pdf.setLineWidth(0.2);
  pdf.line(margin, yPosition, pdfWidth - margin, yPosition);
  yPosition += 10;
  
  // Helper function to add a new page when needed
  const checkAndAddNewPage = (requiredSpace: number): void => {
    if (yPosition + requiredSpace > pdfHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      
      // Add basic header to new page
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(options.theme === "dark" ? 160 : 113, options.theme === "dark" ? 174 : 128, options.theme === "dark" ? 192 : 150);
      pdf.text(`${options.headerTitle || "Chat Export"} (continued)`, margin, yPosition);
      yPosition += 10;
      
      // Add separator line
      pdf.setDrawColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
      pdf.setLineWidth(0.2);
      pdf.line(margin, yPosition, pdfWidth - margin, yPosition);
      yPosition += 10;
      
      // Reset text color to default
      pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
    }
  };
  
  // Helper function to split text into lines that fit the width
  const splitTextToLines = (text: string, maxWidth: number, fontSize: number): string[] => {
    pdf.setFontSize(fontSize);
    return pdf.splitTextToSize(text, maxWidth);
  };
  
  // Helper function to calculate required height for text
  const calculateTextHeight = (lines: string[], fontSize: number, lineSpacing: number): number => {
    return lines.length * (fontSize * 0.35 * lineSpacing);
  };
  
  // Helper function to draw a rounded rectangle
  const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, color: number[], borderColor: number[]): void => {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(0.5);
    
    // Draw the rounded rectangle
    pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
  };
  
  // Process messages
  for (const message of messages) {
    const isUser = message.role === "user";
    const msgBgColor = isUser ? theme.userBg : theme.assistantBg;
    const msgBorderColor = isUser ? theme.userBorder : theme.assistantBorder;
    const roleColor = isUser ? theme.userRole : theme.assistantRole;
    const roleName = isUser ? "You" : "Assistant";
    
    // Required initial space for message box
    const initialBoxSpace = 60; // Minimum height for the message box
    checkAndAddNewPage(initialBoxSpace);
    
    // Calculate message position based on role
    const msgX = isUser ? margin + (contentWidth * 0.15) : margin;
    const msgWidth = contentWidth * (isUser ? 0.85 : 0.85);
    
    // Draw message box start (we'll finish it after calculating full content height)
    const msgStartY = yPosition;
    
    // Add role label
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(roleColor[0], roleColor[1], roleColor[2]);
    pdf.text(roleName, msgX + 8, yPosition + 8);
    yPosition += 12;
    
    // Reset text color to default
    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
    
    let messageContentHeight = 0;
    
    // Process different message types
    if (message.type === "text") {
      // Add text content
      pdf.setFontSize(options.fontSize || 10);
      pdf.setFont("helvetica", "normal");
      
      // Explicitly set the text color with RGB values to ensure visibility
      pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
      
      // Need to explicitly cast content to string and handle possible null/undefined
      const textContent = String(message.content || "");
      const textLines = splitTextToLines(textContent, msgWidth - 16, options.fontSize || 10);
      const textHeight = calculateTextHeight(textLines, options.fontSize || 10, options.lineSpacing || 1.5);
      
      checkAndAddNewPage(textHeight);
      pdf.text(textLines, msgX + 8, yPosition + 5);
      messageContentHeight += textHeight + 8;
      
    } else if (message.type === "imagetext") {
      // Add text content first
      pdf.setFontSize(options.fontSize || 10);
      pdf.setFont("helvetica", "normal");
      
      // Explicitly set the text color with RGB values to ensure visibility
      pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
      
      // Make sure we're accessing the text property correctly from the content object
      const textContent = message.content && typeof message.content === 'object' && 'text' in message.content 
        ? String(message.content.text || "") 
        : "";
        
      const textLines = splitTextToLines(textContent, msgWidth - 16, options.fontSize || 10);
      const textHeight = calculateTextHeight(textLines, options.fontSize || 10, options.lineSpacing || 1.5);
      
      checkAndAddNewPage(textHeight);
      pdf.text(textLines, msgX + 8, yPosition + 5);
      messageContentHeight += textHeight + 8;
      yPosition += textHeight + 8;
      
      // Add images if present
      if (message.content && typeof message.content === 'object' && 
          'images' in message.content && 
          Array.isArray(message.content.images) && 
          message.content.images.length > 0) {
        // We'll add images as placeholders with URLs since we can't embed them directly
        // in a purely vector approach
        pdf.setDrawColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
        pdf.setFillColor(options.theme === "dark" ? 26 : 248, options.theme === "dark" ? 32 : 250, options.theme === "dark" ? 44 : 252);
        
        for (const imgSrc of message.content.images) {
          const imgPlaceholderHeight = 30;
          checkAndAddNewPage(imgPlaceholderHeight + 10);
          
          // Draw image placeholder
          pdf.roundedRect(msgX + 8, yPosition, msgWidth - 24, imgPlaceholderHeight, 3, 3, 'FD');
          
          // Add image info
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(options.theme === "dark" ? 160 : 113, options.theme === "dark" ? 174 : 128, options.theme === "dark" ? 192 : 150);
          pdf.text(
            `[Image: ${imgSrc.substring(0, 50)}${imgSrc.length > 50 ? '...' : ''}]`, 
            msgX + 12, 
            yPosition + 10
          );
          
          // Reset text color to default
          pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
          messageContentHeight += imgPlaceholderHeight + 10;
          yPosition += imgPlaceholderHeight + 10;
        }
      }
    } else if (message.type === "workflow") {
      // Process workflow content
      const workflow = message.content.workflow;
      if (workflow) {
        // Workflow header
        const workflowHeaderHeight = 25;
        checkAndAddNewPage(workflowHeaderHeight);
        
        // Draw workflow container
        pdf.setFillColor(theme.workflowBg[0], theme.workflowBg[1], theme.workflowBg[2]);
        pdf.setDrawColor(theme.workflowBorder[0], theme.workflowBorder[1], theme.workflowBorder[2]);
        pdf.setLineWidth(0.5);
        
        // We'll draw the complete box after calculating full content height
        
        // Add workflow title
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]); // Ensure title is visible
        pdf.text(workflow.name || "Workflow", msgX + 8, yPosition + 8);
        yPosition += 20;
        messageContentHeight += 20;
        
        // Draw separator line
        pdf.setDrawColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
        pdf.setLineWidth(0.2);
        pdf.line(msgX + 8, yPosition - 5, msgX + msgWidth - 8, yPosition - 5);
        
        // Generate workflow steps - excluding reporter steps if detailed view
        const steps = options.workflowStyle === "detailed"
          ? workflow.steps.filter((step: WorkflowStep) => step.agentName !== "reporter")
          : workflow.steps;
        
        // Process each step
        for (const step of steps) {
          const stepHeaderHeight = 20;
          checkAndAddNewPage(stepHeaderHeight);
          
          // Draw step container
          pdf.setFillColor(theme.stepBg[0], theme.stepBg[1], theme.stepBg[2]);
          pdf.setDrawColor(theme.stepBorder[0], theme.stepBorder[1], theme.stepBorder[2]);
          
          const stepStartY = yPosition;
          let stepContentHeight = 0;
          
          // Step header with number and name
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]); // Ensure header is visible
          pdf.text(`Step: ${getStepName(step)}`, msgX + 12, yPosition + 8);
          yPosition += 16;
          stepContentHeight += 16;
          
          // Filter out empty thinking tasks
          const filteredTasks = step.tasks.filter(
            (task: Task) => !(task.type === "thinking" && !task.payload.text && !task.payload.reason)
          );
          
          // Process tasks
          for (const task of filteredTasks) {
            if (task.type === "thinking" && step.agentName === "planner") {
              // Special handling for planner thinking tasks
              const planText = task.payload.text || "";
              const jsonMatch = planText.match(/```(?:json|ts)?\s*(\{[\s\S]*?\})\s*```/);
              
              if (jsonMatch && jsonMatch[1]) {
                try {
                  const planJson = JSON.parse(jsonMatch[1]);
                  
                  // Plan title
                  if (planJson.title) {
                    checkAndAddNewPage(15);
                    pdf.setFillColor(options.theme === "dark" ? 45 : 237, options.theme === "dark" ? 55 : 242, options.theme === "dark" ? 72 : 247);
                    pdf.setDrawColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
                    pdf.roundedRect(msgX + 16, yPosition, msgWidth - 32, 15, 3, 3, 'FD');
                    
                    pdf.setFontSize(11);
                    pdf.setFont("helvetica", "bold");
                    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                    pdf.text(planJson.title, msgX + 20, yPosition + 10);
                    yPosition += 20;
                    stepContentHeight += 20;
                  }
                  
                  // Plan steps
                  if (planJson.steps && Array.isArray(planJson.steps)) {
                    for (let i = 0; i < planJson.steps.length; i++) {
                      const planStep = planJson.steps[i];
                      const stepItemHeight = 25;
                      checkAndAddNewPage(stepItemHeight);
                      
                      const stepNumberWidth = 15;
                      // Draw step number circle
                      pdf.setFillColor(options.theme === "dark" ? 74 : 226, options.theme === "dark" ? 85 : 232, options.theme === "dark" ? 104 : 240);
                      pdf.circle(msgX + 22, yPosition + 6, 5, 'F');
                      
                      pdf.setTextColor(255, 255, 255); // White for contrast
                      pdf.setFontSize(8);
                      pdf.text((i + 1).toString(), msgX + 22 - 1.5, yPosition + 8);
                      pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]); // Reset to default
                      
                      // Step title and description
                      if (planStep.title) {
                        pdf.setFontSize(10);
                        pdf.setFont("helvetica", "bold");
                        pdf.text(planStep.title, msgX + 30, yPosition + 7);
                        yPosition += 10;
                      }
                      
                      if (planStep.description) {
                        pdf.setFontSize(9);
                        pdf.setFont("helvetica", "normal");
                        const descLines = splitTextToLines(planStep.description, msgWidth - 45, 9);
                        const descHeight = calculateTextHeight(descLines, 9, 1.3);
                        
                        pdf.text(descLines, msgX + 30, yPosition + 5);
                        yPosition += descHeight + 5;
                        stepContentHeight += descHeight + 5;
                      } else {
                        yPosition += 5;
                        stepContentHeight += 5;
                      }
                    }
                  }
                } catch (error) {
                  // Fallback for plan text that can't be parsed
                  const textLines = splitTextToLines(planText, msgWidth - 32, 9);
                  const textHeight = calculateTextHeight(textLines, 9, 1.3);
                  
                  checkAndAddNewPage(textHeight + 10);
                  pdf.setFontSize(9);
                  pdf.setFont("helvetica", "italic");
                  pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                  pdf.text(textLines, msgX + 16, yPosition + 5);
                  
                  yPosition += textHeight + 10;
                  stepContentHeight += textHeight + 10;
                }
              } else {
                // Raw thinking text
                const textLines = splitTextToLines(planText, msgWidth - 32, 9);
                const textHeight = calculateTextHeight(textLines, 9, 1.3);
                
                checkAndAddNewPage(textHeight + 10);
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                pdf.text(textLines, msgX + 16, yPosition + 5);
                
                yPosition += textHeight + 10;
                stepContentHeight += textHeight + 10;
              }
            } else if (task.type === "thinking") {
              // Regular thinking task
              const thinkingText = task.payload.text || "";
              if (thinkingText.trim()) {
                const textLines = splitTextToLines(thinkingText, msgWidth - 32, 9);
                const textHeight = calculateTextHeight(textLines, 9, 1.3);
                
                checkAndAddNewPage(textHeight + 15);
                
                // Draw thinking container
                pdf.setFillColor(theme.thinkingBg[0], theme.thinkingBg[1], theme.thinkingBg[2]);
                pdf.setDrawColor(theme.thinkingBorder[0], theme.thinkingBorder[1], theme.thinkingBorder[2]);
                pdf.roundedRect(msgX + 16, yPosition, msgWidth - 32, textHeight + 10, 3, 3, 'FD');
                
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(options.theme === "dark" ? 160 : 113, options.theme === "dark" ? 174 : 128, options.theme === "dark" ? 192 : 150);
                pdf.text(textLines, msgX + 20, yPosition + 7);
                pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]); // Reset to default
                
                yPosition += textHeight + 15;
                stepContentHeight += textHeight + 15;
              }
            } else if (task.type === "tool_call") {
              // Tool call task
              const toolCallHeight = 60; // Initial height estimation
              checkAndAddNewPage(toolCallHeight);
              
              const toolStartY = yPosition;
              let toolContentHeight = 0;
              
              // Draw tool call container
              pdf.setFillColor(theme.toolCallBg[0], theme.toolCallBg[1], theme.toolCallBg[2]);
              pdf.setDrawColor(theme.toolCallBorder[0], theme.toolCallBorder[1], theme.toolCallBorder[2]);
              
              // Tool header
              pdf.setFontSize(11);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(theme.toolCallTitle[0], theme.toolCallTitle[1], theme.toolCallTitle[2]);
              pdf.text(formatToolName(task.payload.toolName), msgX + 24, yPosition + 8);
              pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]); // Reset to default
              
              // Tool icon (simple circle)
              pdf.setFillColor(options.theme === "dark" ? 74 : 191, options.theme === "dark" ? 85 : 219, options.theme === "dark" ? 104 : 254);
              pdf.circle(msgX + 20, yPosition + 5, 3, 'F');
              
              yPosition += 15;
              toolContentHeight += 15;
              
              // Tool input
              if (task.payload.input) {
                pdf.setFillColor(options.theme === "dark" ? 26 : 248, options.theme === "dark" ? 32 : 250, options.theme === "dark" ? 44 : 252);
                pdf.setDrawColor(options.theme === "dark" ? 45 : 226, options.theme === "dark" ? 55 : 232, options.theme === "dark" ? 72 : 240);
                
                const inputStartY = yPosition;
                
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                pdf.text("Input:", msgX + 24, yPosition + 5);
                yPosition += 10;
                
                // Format input based on tool type
                let inputText = "";
                if (task.payload.toolName === "read_file") {
                  inputText = `File: ${task.payload.input.file_path}`;
                } else if (task.payload.toolName === "write_file") {
                  inputText = `File: ${task.payload.input.file_path}`;
                  
                  // Add file content preview if not too large
                  if (task.payload.input.text && task.payload.input.text.length < 500) {
                    inputText += `\n\nContent: ${truncateText(task.payload.input.text, 300)}`;
                  }
                } else if (task.payload.toolName === "list_directory") {
                  inputText = `Directory: ${task.payload.input.dir_path}`;
                } else if (task.payload.toolName === "file_search") {
                  inputText = `Directory: ${task.payload.input.dir_path}\nPattern: ${task.payload.input.pattern}`;
                } else if (task.payload.toolName === "copy_file" || task.payload.toolName === "move_file") {
                  inputText = `From: ${task.payload.input.source_path}\nTo: ${task.payload.input.destination_path}`;
                } else {
                  // For other tools, create a readable representation
                  inputText = JSON.stringify(task.payload.input, null, 2);
                }
                
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                const inputLines = splitTextToLines(inputText, msgWidth - 56, 8);
                const inputHeight = calculateTextHeight(inputLines, 8, 1.3);
                
                pdf.text(inputLines, msgX + 24, yPosition + 5);
                yPosition += inputHeight + 10;
                toolContentHeight += inputHeight + 20;
                
                // Draw input container
                pdf.roundedRect(msgX + 20, inputStartY, msgWidth - 48, inputHeight + 20, 2, 2, 'FD');
              }
              
              // Tool output
              if (task.payload.output) {
                pdf.setFillColor(options.theme === "dark" ? 26 : 248, options.theme === "dark" ? 32 : 250, options.theme === "dark" ? 44 : 252);
                pdf.setDrawColor(options.theme === "dark" ? 45 : 226, options.theme === "dark" ? 55 : 232, options.theme === "dark" ? 72 : 240);
                
                const outputStartY = yPosition;
                
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                pdf.text("Output:", msgX + 24, yPosition + 5);
                yPosition += 10;
                
                // Format output based on tool type
                let outputText = "";
                if (task.payload.toolName === "read_file") {
                  // For read_file, show the file content with some formatting
                  outputText = truncateText(task.payload.output, 1500);
                } else if (task.payload.toolName === "list_directory" || task.payload.toolName === "file_search") {
                  // For directory listings, try to format as a list
                  try {
                    const files = JSON.parse(task.payload.output);
                    if (Array.isArray(files)) {
                      outputText = files.slice(0, 20).join("\n");
                      if (files.length > 20) {
                        outputText += `\n... and ${files.length - 20} more files`;
                      }
                    } else {
                      outputText = task.payload.output;
                    }
                  } catch {
                    outputText = task.payload.output;
                  }
                } else {
                  // For other tools, just show the raw output
                  outputText = truncateText(task.payload.output, 1000);
                }
                
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                const outputLines = splitTextToLines(outputText, msgWidth - 56, 8);
                const outputHeight = calculateTextHeight(outputLines, 8, 1.3);
                
                pdf.text(outputLines, msgX + 24, yPosition + 5);
                yPosition += outputHeight + 10;
                toolContentHeight += outputHeight + 20;
                
                // Draw output container
                pdf.roundedRect(msgX + 20, outputStartY, msgWidth - 48, outputHeight + 20, 2, 2, 'FD');
              }
              
              // Draw complete tool call container
              pdf.setFillColor(theme.toolCallBg[0], theme.toolCallBg[1], theme.toolCallBg[2]);
              pdf.setDrawColor(theme.toolCallBorder[0], theme.toolCallBorder[1], theme.toolCallBorder[2]);
              pdf.roundedRect(msgX + 16, toolStartY, msgWidth - 32, toolContentHeight, 4, 4, 'FD');
              
              yPosition += 10;
              stepContentHeight += toolContentHeight + 10;
            }
          }
          
          // Draw complete step container
          pdf.setFillColor(theme.stepBg[0], theme.stepBg[1], theme.stepBg[2]);
          pdf.setDrawColor(theme.stepBorder[0], theme.stepBorder[1], theme.stepBorder[2]);
          pdf.roundedRect(msgX + 8, stepStartY, msgWidth - 16, stepContentHeight, 5, 5, 'FD');
          
          yPosition += 10;
          messageContentHeight += stepContentHeight + 10;
        }
        
        // Add reporter step output if available
        const reportStep = workflow.steps.find((step: WorkflowStep) => step.agentName === "reporter");
        if (reportStep && reportStep.tasks && reportStep.tasks.length > 0) {
          const reporterTask = reportStep.tasks[0];
          if (reporterTask.type === "thinking" && reporterTask.payload.text) {
            const reportText = reporterTask.payload.text;
            const reportLines = splitTextToLines(reportText, msgWidth - 24, 10);
            const reportHeight = calculateTextHeight(reportLines, 10, 1.5);
            
            checkAndAddNewPage(reportHeight + 35);
            
            // Draw report container
            pdf.setFillColor(theme.stepBg[0], theme.stepBg[1], theme.stepBg[2]);
            pdf.setDrawColor(theme.stepBorder[0], theme.stepBorder[1], theme.stepBorder[2]);
            pdf.roundedRect(msgX + 8, yPosition, msgWidth - 16, reportHeight + 25, 5, 5, 'FD');
            
            // Report title
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
            pdf.text("Summary Report", msgX + 16, yPosition + 10);
            
            // Report content
            pdf.setFontSize(options.fontSize || 10);
            pdf.setFont("helvetica", "normal");
            pdf.text(reportLines, msgX + 16, yPosition + 25);
            
            yPosition += reportHeight + 35;
            messageContentHeight += reportHeight + 35;
          }
        }
        
        // Draw complete workflow container
        pdf.setFillColor(theme.workflowBg[0], theme.workflowBg[1], theme.workflowBg[2]);
        pdf.setDrawColor(theme.workflowBorder[0], theme.workflowBorder[1], theme.workflowBorder[2]);
        pdf.roundedRect(msgX + 2, msgStartY + 15, msgWidth - 4, messageContentHeight + 5, 6, 6, 'FD');
      }
    }
    
    // Draw the message box (if not workflow, which has its own container)
    if (message.type !== "workflow") {
      messageContentHeight = Math.max(messageContentHeight, 10); // Ensure minimum height
      drawRoundedRect(msgX, msgStartY, msgWidth, messageContentHeight + 15, 6, msgBgColor, msgBorderColor);
    }
    
    // Move position for next message
    yPosition = msgStartY + messageContentHeight + 25;
  }
  
  // Add footer if specified
  if (options.footerText) {
    // Ensure we're on the last page
    pdf.setPage(pdf.getNumberOfPages());
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(options.theme === "dark" ? 160 : 113, options.theme === "dark" ? 174 : 128, options.theme === "dark" ? 192 : 150);
    
    const footerY = pdfHeight - margin / 2;
    const footerText = options.footerText;
    const footerWidth = pdf.getTextWidth(footerText);
    const footerX = (pdfWidth - footerWidth) / 2;
    
    pdf.text(footerText, footerX, footerY);
  }
  
  // Save the PDF file
  pdf.save(filename);
  return Promise.resolve();
}

// Exports a chat conversation to a plain text file with improved formatting
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