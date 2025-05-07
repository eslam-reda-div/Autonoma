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

  // Define page dimensions based on selected page size
  const pageSizes = {
    letter: [216, 279],   // mm
    legal: [216, 356],    // mm
    a4: [210, 297],       // mm
  };
  
  const pdfSize = pageSizes[options.pageSize || 'a4'] || pageSizes.a4;
  
  // Create a PDF document
  const pdf = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: options.pageSize || "a4",
  });

  // Set default font (sans-serif for better emoji support)
  pdf.setFont("Helvetica", "normal");

  // Calculate page dimensions based on orientation
  const pdfWidth = options.orientation === "landscape" ? pdfSize[1] : pdfSize[0];
  const pdfHeight = options.orientation === "landscape" ? pdfSize[0] : pdfSize[1];

  // Add document metadata
  if (options.includeMetadata) {
    pdf.setProperties({
      title: options.title || "Chat Export",
      subject: "Autonoma Chat Export",
      author: "Autonoma",
      keywords: "chat, export, autonoma, workflow",
      creator: "Autonoma Chat Export Tool",
    });
  }

  // Define color schemes
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
  
  // Define margins
  const margin = {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15
  };
  
  // Content area dimensions
  const contentWidth = pdfWidth - margin.left - margin.right;
  
  // Initialize page counter and content position
  let currentPage = 1;
  let yPosition = margin.top;

  // Initialize a virtual DOM for HTML rendering (for emoji support)
  const virtualContainer = document.createElement('div');
  virtualContainer.style.position = 'absolute';
  virtualContainer.style.left = '-9999px';
  document.body.appendChild(virtualContainer);

  // ========== HELPER FUNCTIONS ==========

  /**
   * Sets up a new page with header and background
   * @param isNewPage Whether this is a new page or the first page
   * @returns The y-position after the header
   */
  function setupPage(isNewPage = false): number {
    if (isNewPage) {
      pdf.addPage();
      currentPage++;
    }
    
    // Set background color for the page
    pdf.setFillColor(theme.background[0], theme.background[1], theme.background[2]);
    pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
    
    // Add header
    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
    pdf.setFontSize(isNewPage ? 14 : 18);
    pdf.setFont("Helvetica", "bold");
    pdf.text(options.headerTitle || "Chat Export", margin.left, margin.top);
    
    if (isNewPage) {
      // Add continuation marker
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(10);
      const headerColor = options.theme === "dark" ? [160, 174, 192] : [113, 128, 150];
      pdf.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
      pdf.text(`(Page ${currentPage})`, margin.left + contentWidth - 30, margin.top);
    }
    
    // Add separator line
    const lineColor = options.theme === "dark" ? [74, 85, 104] : [226, 232, 240];
    pdf.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    pdf.setLineWidth(0.2);
    pdf.line(margin.left, margin.top + 8, pdfWidth - margin.right, margin.top + 8);
    
    // Add page number at the bottom
    pdf.setFontSize(8);
    pdf.setFont("Helvetica", "normal");
    const pageNumColor = options.theme === "dark" ? [140, 140, 140] : [120, 120, 120];
    pdf.setTextColor(pageNumColor[0], pageNumColor[1], pageNumColor[2]);
    pdf.text(`Page ${currentPage}`, pdfWidth - margin.right - 15, pdfHeight - margin.bottom - 5);
    
    // Reset text color
    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
    
    return margin.top + 20; // Return position after header
  }

  /**
   * Splits text into lines that fit within the given width with improved handling
   * for complex content including code blocks, lists, and tables
   * @param text The text to split
   * @param maxWidth Maximum width in mm
   * @param fontSize Font size in points
   * @returns Array of text lines
   */
  function splitTextToLines(text: string, maxWidth: number, fontSize: number): string[] {
    if (!text) return [];
    
    // Convert non-string content to string
    if (typeof text !== 'string') {
      try {
        text = JSON.stringify(text, null, 2);
      } catch (e) {
        text = String(text);
      }
    }
    
    // Create a canvas for text measurements
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return pdf.splitTextToSize(text, maxWidth);
    
    // Set canvas font to match PDF
    ctx.font = `${fontSize}px Helvetica`;
    
    // Split by newlines first
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    
    // Keep track of whether we're in a code block
    let inCodeBlock = false;
    
    for (const paragraph of paragraphs) {
      // Handle code block markers
      if (paragraph.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        lines.push(paragraph);
        continue;
      }
      
      if (paragraph === '') {
        lines.push('');
        continue;
      }
      
      // Handle code blocks differently - preserve indentation and don't wrap aggressively
      if (inCodeBlock) {
        // For code blocks, maintain original formatting and only split if exceeds page width
        if (ctx.measureText(paragraph).width * 0.35 > maxWidth * 1.5) {
          // Only for extremely long lines
          let tempLine = '';
          const words = paragraph.split('');
          
          for (const char of words) {
            const testLine = tempLine + char;
            const metrics = ctx.measureText(testLine);
            const pdfLineWidth = metrics.width * 0.35;
            
            if (pdfLineWidth > maxWidth * 1.2) {
              lines.push(tempLine);
              tempLine = char;
            } else {
              tempLine = testLine;
            }
          }
          
          if (tempLine) {
            lines.push(tempLine);
          }
        } else {
          // Preserve code line as is
          lines.push(paragraph);
        }
        continue;
      }
      
      // Process regular text with word wrapping
      let line = '';
      const words = paragraph.split(' ');
      
      for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        
        // Convert canvas width to PDF width (approximate conversion)
        const pdfLineWidth = metrics.width * 0.35;
        
        if (pdfLineWidth > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      
      if (line) {
        lines.push(line);
      }
    }
    
    return lines;
  }
  
  /**
   * Calculates the height needed for a given text
   * @param lines Array of text lines
   * @param fontSize Font size in points
   * @param lineSpacing Line spacing multiplier
   * @returns Height in mm
   */
  function calculateTextHeight(lines: string[], fontSize: number, lineSpacing: number = 1.5): number {
    return lines.length * (fontSize * 0.35 * lineSpacing);
  }
  
  /**
   * Checks if a new page is needed based on required space
   * @param requiredSpace Height in mm needed
   * @returns true if new page was added
   */
  function checkAndAddNewPage(requiredSpace: number): boolean {
    const remainingSpace = pdfHeight - margin.bottom - yPosition;
    
    if (remainingSpace < requiredSpace + 5) { // 5mm buffer
      yPosition = setupPage(true);
      return true;
    }
    
    return false;
  }
  
  /**
   * Draws text at the specified position with improved page break handling
   * @param x X position in mm
   * @param lines Array of text lines
   * @param color Text color RGB array
   * @param fontSize Font size in points
   * @param fontStyle Font style (normal, bold, italic)
   * @param lineSpacing Line spacing multiplier
   * @returns New y position after drawing text
   */
  function drawTextWithPageBreaks(
    x: number,
    lines: string[],
    color: number[],
    fontSize: number,
    fontStyle: string = 'normal',
    lineSpacing: number = 1.5
  ): number {
    if (!lines.length) return yPosition;
    
    pdf.setFontSize(fontSize);
    pdf.setFont("Helvetica", fontStyle);
    pdf.setTextColor(color[0], color[1], color[2]);
    
    let localY = yPosition;
    const lineHeight = fontSize * 0.35 * lineSpacing;
    
    // Add context for page breaks: remember current font and color settings
    const contextState = {
      fontSize,
      fontStyle,
      color,
      indentation: x
    };
    
    for (let i = 0; i < lines.length; i++) {
      // Check if we need to move to a new page
      if (localY + lineHeight > pdfHeight - margin.bottom) {
        localY = setupPage(true);
        
        // Restore text context after page break
        pdf.setFontSize(contextState.fontSize);
        pdf.setFont("Helvetica", contextState.fontStyle);
        pdf.setTextColor(contextState.color[0], contextState.color[1], contextState.color[2]);
        
        // If we're in the middle of formatted content, add a continuation indicator
        if (i > 0 && i < lines.length - 1) {
          pdf.setFont("Helvetica", "italic");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text("(continued...)", contextState.indentation, localY - 5);
          
          // Restore original font settings
          pdf.setFontSize(contextState.fontSize);
          pdf.setFont("Helvetica", contextState.fontStyle);
          pdf.setTextColor(contextState.color[0], contextState.color[1], contextState.color[2]);
        }
      }
      
      // Handle code blocks with special formatting
      const isCodeLine = lines[i].trim().startsWith('```') || 
                         (i > 0 && lines[i-1].trim().startsWith('```') && !lines[i].trim().endsWith('```'));
      
      if (isCodeLine) {
        // Use monospace font for code blocks
        pdf.setFont("Courier", "normal");
        
        // Add light gray background for code blocks
        const codeLineWidth = pdf.getTextWidth(lines[i]) + 4;
        pdf.setFillColor(options.theme === "dark" ? 50 : 245, options.theme === "dark" ? 50 : 245, options.theme === "dark" ? 50 : 245);
        pdf.rect(x - 2, localY - (fontSize * 0.25), codeLineWidth, lineHeight, 'F');
        
        // Draw code text
        pdf.text(lines[i], x, localY);
        
        // Reset font
        pdf.setFont("Helvetica", fontStyle);
      } else {
        // Regular text rendering
        pdf.text(lines[i], x, localY);
      }
      
      localY += lineHeight;
    }
    
    return localY;
  }
  
  /**
   * Draws a rounded rectangle with support for page breaks
   * @param x X position in mm
   * @param y Y position in mm
   * @param width Width in mm
   * @param height Height in mm
   * @param radius Corner radius in mm
   * @param fillColor Fill color RGB array
   * @param borderColor Border color RGB array
   * @param contentDrawer Function to draw content inside the box
   */
  function drawRoundedRectWithContent(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor: number[],
    borderColor: number[],
    contentDrawer: () => number
  ): number {
    const startY = y;
    
    // Check if box will extend beyond the current page
    const bottomY = y + height;
    const pageBottomLimit = pdfHeight - margin.bottom;
    
    if (bottomY > pageBottomLimit) {
      // Box will extend beyond the page
      const firstPageHeight = pageBottomLimit - y - 5; // 5mm buffer
      
      if (firstPageHeight > 2 * radius) { // Ensure min height for rounded corners
        // Draw the top portion of the box
        pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.setLineWidth(0.5);
        
        // Draw with flat bottom corners
        pdf.roundedRect(x, y, width, firstPageHeight, radius, radius, 'FD', [1, 1, 0, 0]);
      }
      
      // Save the current position
      const savedY = yPosition;
      
      // Create a new page and continue the box
      yPosition = setupPage(true);
      const continueY = yPosition;
      
      // Draw the bottom portion of the box
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      
      // Set a temporary y position for content drawing
      yPosition = continueY + radius; // add padding from top
      
      // Draw content inside the box
      const contentEndY = contentDrawer();
      
      // Calculate the actual height of the bottom portion
      const bottomPortionHeight = contentEndY - continueY + 10; // Add padding
      
      // Draw the bottom portion with flat top corners
      pdf.roundedRect(x, continueY, width, bottomPortionHeight, radius, radius, 'FD', [0, 0, 1, 1]);
      
      return contentEndY + 5; // Return the new position with padding
    } else {
      // Box fits on the current page
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdf.setLineWidth(0.5);
      
      // Draw the complete rounded rectangle
      pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
      
      // Set position for content
      yPosition = y + radius; // Add padding from top
      
      // Draw content inside the box
      const contentEndY = contentDrawer();
      
      return contentEndY + 5; // Return the new position with padding
    }
  }
  
  /**
   * Formats tool name for display
   * @param toolName Raw tool name
   * @returns Formatted tool name
   */
  function formatToolName(toolName: string): string {
    if (!toolName) return "Unknown Tool";
    
    // Handle special case tools with better formatting
    if (toolName.includes('-')) {
      // Format hyphenated tool names (e.g., "azure_ai-get_models" -> "Azure AI: Get Models")
      return toolName
        .split('-')
        .map(part => 
          part.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        )
        .join(': ');
    }
    
    // Default formatting for snake_case to Title Case
    return toolName
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  
  /**
   * Gets a color for a task state
   * @param state Task state
   * @returns RGB color array
   */
  function getStateStyleColor(state: string): number[] {
    switch (state) {
      case "success": return [72, 187, 120]; // green
      case "pending":
      case "running": return [66, 153, 225]; // blue
      case "error": return [245, 101, 101]; // red
      default: return [180, 180, 180]; // grey
    }
  }
  
  /**
   * Cleans and formats output text for better rendering in PDFs
   * @param output Any output value
   * @returns Formatted string
   */
  function cleanOutputText(output: any): string {
    if (output === null || output === undefined) return "";
    
    // Handle strings directly
    if (typeof output === 'string') {
      // Check if it's a JSON string that we can pretty-print
      try {
        const parsedJson = JSON.parse(output);
        return JSON.stringify(parsedJson, null, 2);
      } catch {
        // Not valid JSON, return string as is
        return output.trim();
      }
    }
    
    // Handle arrays with special formatting
    if (Array.isArray(output)) {
      // Format arrays with single values differently than complex arrays
      if (output.length === 0) return "[]";
      
      // For simple arrays, use comma-separated format
      if (output.length < 10 && output.every(item => 
        typeof item === 'string' || 
        typeof item === 'number' || 
        typeof item === 'boolean'
      )) {
        return output.join(', ');
      }
      
      // For arrays of objects, format each object on its own line
      if (output.every(item => typeof item === 'object' && item !== null)) {
        let result = "";
        output.forEach((item, index) => {
          result += `Item ${index + 1}:\n`;
          result += JSON.stringify(item, null, 2);
          if (index < output.length - 1) {
            result += '\n\n';
          }
        });
        return result;
      }
    }
    
    // Format objects and complex arrays with proper indentation
    try {
      const formatted = JSON.stringify(output, null, 2);
      return formatted;
    } catch (error) {
      // Fallback for circular references or other JSON errors
      return String(output);
    }
  }
  
  /**
   * Process and format tool call output for better visual representation
   * @param output Tool call output
   * @returns Formatted output
   */
  function formatToolOutput(output: any): string {
    if (!output) return "";
    
    try {
      // Handle string outputs
      if (typeof output === 'string') {
        // Check if it's JSON string and try to parse it
        try {
          const parsedJson = JSON.parse(output);
          
          // Handle special case for function results that might contain markdown/code blocks
          if (typeof parsedJson === 'object' && parsedJson !== null) {
            // Check if it has a common structure of function results
            if ('function_results' in parsedJson || 'result' in parsedJson || 'content' in parsedJson) {
              const contentKey = 'function_results' in parsedJson ? 'function_results' : 
                                'result' in parsedJson ? 'result' : 'content';
              
              // If the content is a string with code blocks, return it as is
              const content = parsedJson[contentKey];
              if (typeof content === 'string' && 
                  (content.includes('```') || content.includes('---') || content.includes('|'))) {
                return content;
              }
            }
          }
          
          return JSON.stringify(parsedJson, null, 2);
        } catch {
          // Not JSON, check for markdown content
          if (output.includes('```') || output.includes('---') || output.includes('|')) {
            // This might be markdown content, preserve the formatting
            return output;
          }
          
          // Regular string
          return output;
        }
      }
      
      // Handle arrays with special formatting for readability
      if (Array.isArray(output)) {
        if (output.length === 0) return "[]";
        
        // For arrays of simple values, format as comma-separated list
        if (output.length < 5 && output.every(
          item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
        )) {
          return output.join(', ');
        }
        
        // For arrays of objects, format each item on its own line with headers
        if (output.every(item => typeof item === 'object' && item !== null)) {
          let result = "";
          output.forEach((item, index) => {
            result += `Item ${index + 1}:\n`;
            result += JSON.stringify(item, null, 2);
            if (index < output.length - 1) {
              result += '\n\n';
            }
          });
          return result;
        }
      }
      
      // For objects, use pretty JSON formatting
      if (typeof output === 'object' && output !== null) {
        // Check for common result structures
        if ('result' in output && typeof output.result === 'string') {
          return output.result;
        }
        
        if ('content' in output && typeof output.content === 'string') {
          return output.content;
        }
        
        if ('message' in output && typeof output.message === 'string') {
          return output.message;
        }
        
        // Check for special object types that might need custom formatting
        if ('data' in output && Array.isArray(output.data)) {
          let result = "";
          if ('headers' in output && Array.isArray(output.headers)) {
            // Format as a table with headers
            result += output.headers.join(' | ') + '\n';
            result += output.headers.map(() => '---').join(' | ') + '\n';
            
            output.data.forEach((row: any) => {
              if (Array.isArray(row)) {
                result += row.join(' | ') + '\n';
              } else if (typeof row === 'object' && row !== null) {
                result += Object.values(row).join(' | ') + '\n';
              }
            });
            
            return result;
          }
        }
      }
      
      // Default formatting for objects and other types
      return JSON.stringify(output, null, 2);
    } catch (error) {
      // Fallback for any errors
      return String(output);
    }
  }
  
  /**
   * Extracts plan data from thinking text
   * @param text Thinking text that might contain plan
   * @returns Plan title and steps
   */
  function extractPlanData(text: string): { title?: string; steps?: { title: string; description: string }[] } {
    const result: { title?: string; steps?: { title: string; description: string }[] } = {};
    
    // Look for plan title using regex
    const titleMatch = text.match(/^# (.*?)(?:\n|$)/m) || text.match(/^Plan: (.*?)(?:\n|$)/m);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
    
    // Look for numbered steps
    const stepMatches = Array.from(text.matchAll(/^\d+\.\s+(.*?)(?:\n|$)((?:.+?\n)*?)(?=\d+\.|$)/gm));
    
    if (stepMatches.length) {
      result.steps = stepMatches.map(match => ({
        title: match[1].trim(),
        description: match[2] ? match[2].trim() : ''
      }));
    } else {
      // Alternative step format (bullet points)
      const bulletMatches = Array.from(text.matchAll(/^[-*]\s+(.*?)(?:\n|$)((?:.+?\n)*?)(?=[-*]|$)/gm));
      
      if (bulletMatches.length) {
        result.steps = bulletMatches.map(match => ({
          title: match[1].trim(),
          description: match[2] ? match[2].trim() : ''
        }));
      }
    }
    
    return result;
  }

  // ========== START PDF GENERATION ==========
  
  // Initialize the first page
  yPosition = setupPage(false);
  
  // Add chat information if available
  if (messages.length > 0 && messages[0].args) {
    const chatInfo = messages[0].args;
    pdf.setFontSize(10);
    pdf.setFont("Helvetica", "normal");
    const infoColor = options.theme === "dark" ? [180, 180, 180] : [100, 100, 100];
    pdf.setTextColor(infoColor[0], infoColor[1], infoColor[2]);
    
    if (chatInfo.title) {
      pdf.text(`Title: ${chatInfo.title}`, margin.left, yPosition);
      yPosition += 5;
    }
    
    if (chatInfo.created_at) {
      pdf.text(`Created: ${new Date(chatInfo.created_at).toLocaleString()}`, margin.left, yPosition);
      yPosition += 5;
    }
    
    if (chatInfo.uuid) {
      pdf.text(`ID: ${chatInfo.uuid}`, margin.left, yPosition);
      yPosition += 5;
    }
    
    if (chatInfo.model) {
      pdf.text(`Model: ${chatInfo.model}`, margin.left, yPosition);
      yPosition += 5;
    }
    
    yPosition += 5; // Extra spacing after info
  }
  // Add timestamp if needed and no chat info
  else if (options.includeTimestamp) {
    pdf.setFontSize(10);
    pdf.setFont("Helvetica", "normal");
    const timestampColor = options.theme === "dark" ? [160, 174, 192] : [113, 128, 150];
    pdf.setTextColor(timestampColor[0], timestampColor[1], timestampColor[2]);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, margin.left, yPosition);
    yPosition += 10;
  }
  
  // Reset text color to default
  pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
  
  // ========== PROCESS MESSAGES ==========
  
  // Process each message
  for (const message of messages) {
    const isUser = message.role === "user";
    const boxBgColor = isUser ? theme.userBg : theme.assistantBg;
    const boxBorderColor = isUser ? theme.userBorder : theme.assistantBorder;
    const roleColor = isUser ? theme.userRole : theme.assistantRole;
    const roleName = isUser ? "You" : "Assistant";
    
    // Add spacing before message
    yPosition += 10;
    
    // Define message box position and dimensions
    const boxX = isUser ? margin.left + (contentWidth * 0.15) : margin.left;
    const boxWidth = contentWidth * 0.85;
    
    // Pre-process content to determine box height
    let estimatedBoxHeight = 50; // Minimum box height
    
    // Function to be passed to drawRoundedRectWithContent
    const drawMessageContent = () => {
      const startY = yPosition;
      
      // Draw message ID if available
      if (message.id) {
        const messageIdColor = options.theme === "dark" ? [140, 140, 140] : [120, 120, 120];
        pdf.setFontSize(8);
        pdf.setFont("Helvetica", "italic");
        pdf.setTextColor(messageIdColor[0], messageIdColor[1], messageIdColor[2]);
        pdf.text(`ID: ${message.id}`, boxX + 8, yPosition);
        yPosition += 8;
      }
      
      // Draw role label
      pdf.setFontSize(12);
      pdf.setFont("Helvetica", "bold");
      pdf.setTextColor(roleColor[0], roleColor[1], roleColor[2]);
      pdf.text(roleName, boxX + 8, yPosition);
      yPosition += 15;
      
      // Process message content based on type
      if (message.type === "text") {
        // Text message
        const textContent = String(message.content || "");
        const textLines = splitTextToLines(textContent, boxWidth - 16, options.fontSize || 10);
        
        yPosition = drawTextWithPageBreaks(
          boxX + 8,
          textLines,
          theme.text,
          options.fontSize || 10,
          'normal',
          options.lineSpacing || 1.5
        );
      } 
      else if (message.type === "imagetext") {
        // Text and image message
        if (message.content && typeof message.content === 'object' && 'text' in message.content) {
          const textContent = String(message.content.text || "");
          const textLines = splitTextToLines(textContent, boxWidth - 16, options.fontSize || 10);
          
          yPosition = drawTextWithPageBreaks(
            boxX + 8,
            textLines,
            theme.text,
            options.fontSize || 10,
            'normal',
            options.lineSpacing || 1.5
          );
        }
        
        // Add images if present
        if (message.content && typeof message.content === 'object' && 
            'images' in message.content && 
            Array.isArray(message.content.images) && 
            message.content.images.length > 0) {
          
          for (const imgSrc of message.content.images) {
            const imgPlaceholderHeight = 30;
            
            // Check if we need a new page
            if (yPosition + imgPlaceholderHeight + 10 > pdfHeight - margin.bottom) {
              yPosition = setupPage(true);
            }
            
            // Draw image placeholder
            pdf.setFillColor(
              options.theme === "dark" ? 26 : 248, 
              options.theme === "dark" ? 32 : 250, 
              options.theme === "dark" ? 44 : 252
            );
            pdf.setDrawColor(
              options.theme === "dark" ? 74 : 226, 
              options.theme === "dark" ? 85 : 232, 
              options.theme === "dark" ? 104 : 240
            );
            pdf.roundedRect(boxX + 8, yPosition, boxWidth - 16, imgPlaceholderHeight, 3, 3, 'FD');
            
            // Add image info text
            pdf.setFontSize(9);
            pdf.setFont("Helvetica", "italic");
            pdf.setTextColor(
              options.theme === "dark" ? 160 : 113, 
              options.theme === "dark" ? 174 : 128, 
              options.theme === "dark" ? 192 : 150
            );
            const imgText = `[Image: ${imgSrc.substring(0, 50)}${imgSrc.length > 50 ? '...' : ''}]`;
            pdf.text(imgText, boxX + 12, yPosition + 10);
            
            yPosition += imgPlaceholderHeight + 10;
          }
        }
      }
      else if (message.type === "workflow") {
        if (message.content && typeof message.content === 'object' && 'workflow' in message.content) {
          const workflow = message.content.workflow;
          
          // Add workflow title
          const workflowTitle = `Workflow: ${workflow.name || "Untitled"}`;
          const workflowTitleLines = splitTextToLines(workflowTitle, boxWidth - 16, 14);
          
          yPosition = drawTextWithPageBreaks(
            boxX + 8,
            workflowTitleLines,
            theme.text,
            14,
            'bold',
            1.2
          );
          
          yPosition += 10;
          
          // Process workflow steps
          const steps = workflow.steps || [];
          
          for (const [stepIndex, step] of steps.entries()) {
            if (!step) continue;
            
            // Check if we need a new page for this step
            if (yPosition + 30 > pdfHeight - margin.bottom) {
              yPosition = setupPage(true);
            }
            
            // Add step title with background
            const stepTitle = `Step ${stepIndex + 1}: ${getStepName(step)}`;
            const stepTitleLines = splitTextToLines(stepTitle, boxWidth - 24, 12);
            const stepTitleHeight = calculateTextHeight(stepTitleLines, 12, 1.2) + 10;
            
            // Draw step background
            pdf.setFillColor(
              options.theme === "dark" ? theme.stepBg[0] : 240, 
              options.theme === "dark" ? theme.stepBg[1] : 245, 
              options.theme === "dark" ? theme.stepBg[2] : 250
            );
            pdf.setDrawColor(
              options.theme === "dark" ? theme.stepBorder[0] : 220, 
              options.theme === "dark" ? theme.stepBorder[1] : 230, 
              options.theme === "dark" ? theme.stepBorder[2] : 240
            );
            pdf.roundedRect(boxX + 4, yPosition - 5, boxWidth - 12, stepTitleHeight, 3, 3, 'FD');
            
            // Draw step title
            pdf.setFontSize(12);
            pdf.setFont("Helvetica", "bold");
            pdf.setTextColor(
              options.theme === "dark" ? 180 : 80, 
              options.theme === "dark" ? 180 : 80, 
              options.theme === "dark" ? 180 : 80
            );
            pdf.text(stepTitleLines, boxX + 8, yPosition);
            
            yPosition += stepTitleHeight + 5;
            
            // Process tasks in the step
            if (step.tasks && Array.isArray(step.tasks)) {
              // Filter out empty thinking tasks
              const filteredTasks = step.tasks.filter(
                task => !(task.type === "thinking" && !task.payload?.text && !task.payload?.reason)
              );
              
              for (const task of filteredTasks) {
                if (!task) continue;
                
                if (task.type === "thinking") {
                  // Handle thinking tasks
                  const thinkingText = task.payload?.text || task.payload?.reason || "";
                  if (!thinkingText) continue;
                  
                  // Special handling for planner's thinking tasks
                  if (step.agentName === "planner") {
                    // Extract plan data if present
                    const planData = extractPlanData(thinkingText);
                    
                    if (planData.title || (planData.steps && planData.steps.length > 0)) {
                      // Draw plan title if available
                      if (planData.title) {
                        // Check if we need a new page
                        if (yPosition + 20 > pdfHeight - margin.bottom) {
                          yPosition = setupPage(true);
                        }
                        
                        const planTitleText = `## ${planData.title}`;
                        const planTitleLines = splitTextToLines(planTitleText, boxWidth - 32, 11);
                        
                        pdf.setFontSize(11);
                        pdf.setFont("Helvetica", "bold");
                        pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                        pdf.text(planTitleLines, boxX + 16, yPosition);
                        
                        yPosition += calculateTextHeight(planTitleLines, 11, 1.2) + 5;
                      }
                      
                      // Draw plan steps if available
                      if (planData.steps && planData.steps.length > 0) {
                        for (const planStep of planData.steps) {
                          // Check if we need a new page
                          if (yPosition + 20 > pdfHeight - margin.bottom) {
                            yPosition = setupPage(true);
                          }
                          
                          const planStepText = `- **${planStep.title || ''}**\n\n${planStep.description || ''}`;
                          const planStepLines = splitTextToLines(planStepText, boxWidth - 32, 10);
                          
                          pdf.setFontSize(10);
                          pdf.setFont("Helvetica", "normal");
                          pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                          pdf.text(planStepLines, boxX + 16, yPosition);
                          
                          yPosition += calculateTextHeight(planStepLines, 10, 1.5) + 5;
                        }
                      }
                    } else {
                      // Regular thinking display
                      const thinkingLines = splitTextToLines(thinkingText, boxWidth - 32, 10);
                      
                      // Check if we need a new page
                      if (yPosition + calculateTextHeight(thinkingLines, 10, 1.2) > pdfHeight - margin.bottom) {
                        yPosition = setupPage(true);
                      }
                      
                      // Set semi-transparent text
                      pdf.setGState(new pdf.GState({ opacity: 0.7 }));
                      
                      pdf.setFontSize(10);
                      pdf.setFont("Helvetica", "italic");
                      pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                      pdf.text(thinkingLines, boxX + 16, yPosition);
                      
                      // Reset opacity
                      pdf.setGState(new pdf.GState({ opacity: 1.0 }));
                      
                      yPosition += calculateTextHeight(thinkingLines, 10, 1.2) + 5;
                    }
                  } else {
                    // Regular thinking display for non-planner agents
                    const thinkingLines = splitTextToLines(thinkingText, boxWidth - 32, 10);
                    
                    // Check if we need a new page
                    if (yPosition + calculateTextHeight(thinkingLines, 10, 1.2) > pdfHeight - margin.bottom) {
                      yPosition = setupPage(true);
                    }
                    
                    // Set semi-transparent text
                    pdf.setGState(new pdf.GState({ opacity: 0.7 }));
                    
                    pdf.setFontSize(10);
                    pdf.setFont("Helvetica", "italic");
                    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                    pdf.text(thinkingLines, boxX + 16, yPosition);
                    
                    // Reset opacity
                    pdf.setGState(new pdf.GState({ opacity: 1.0 }));
                    
                    yPosition += calculateTextHeight(thinkingLines, 10, 1.2) + 5;
                  }
                } else if (task.type === "tool_call") {
                  // Handle tool call tasks
                  const toolName = formatToolName(task.payload?.toolName || "Unknown Tool");
                  
                  // Prepare input/output text
                  const inputString = typeof task.payload?.input === 'object' 
                    ? JSON.stringify(task.payload.input, null, 2)
                    : String(task.payload?.input || "");
                  
                  const inputLines = splitTextToLines(inputString, boxWidth - 40, 9);
                  const inputHeight = calculateTextHeight(inputLines, 9, 1.2);
                  
                  let outputLines: string[] = [];
                  let outputHeight = 0;
                  
                  if (task.payload?.output) {
                    const outputString = cleanOutputText(task.payload.output);
                    outputLines = splitTextToLines(outputString, boxWidth - 40, 9);
                    outputHeight = calculateTextHeight(outputLines, 9, 1.2);
                  }
                  
                  // Calculate total tool call height
                  const totalToolCallHeight = 24 + inputHeight + outputHeight + (task.payload?.output ? 15 : 0);
                  
                  // Check if we need a new page
                  if (yPosition + totalToolCallHeight > pdfHeight - margin.bottom) {
                    yPosition = setupPage(true);
                  }
                  
                  // Draw tool call container
                  pdf.setFillColor(
                    options.theme === "dark" ? theme.toolCallBg[0] : 240, 
                    options.theme === "dark" ? theme.toolCallBg[1] : 247, 
                    options.theme === "dark" ? theme.toolCallBg[2] : 255
                  );
                  pdf.setDrawColor(
                    options.theme === "dark" ? theme.toolCallBorder[0] : 191, 
                    options.theme === "dark" ? theme.toolCallBorder[1] : 219, 
                    options.theme === "dark" ? theme.toolCallBorder[2] : 254
                  );
                  pdf.roundedRect(boxX + 16, yPosition - 5, boxWidth - 32, totalToolCallHeight, 3, 3, 'FD');
                  
                  // Draw tool name
                  pdf.setFontSize(11);
                  pdf.setFont("Helvetica", "bold");
                  pdf.setTextColor(
                    options.theme === "dark" ? theme.toolCallTitle[0] : 22, 
                    options.theme === "dark" ? theme.toolCallTitle[1] : 119, 
                    options.theme === "dark" ? theme.toolCallTitle[2] : 255
                  );
                  pdf.text(toolName, boxX + 22, yPosition + 7);
                  
                  // Draw status indicator
                  const statusText = task.state === "pending" || task.state === "running" ? "Running..." : 
                                    task.state === "success" ? "Completed" : "Failed";
                  
                  const stateColor = getStateStyleColor(task.state || "unknown");
                  
                  pdf.setFont("Helvetica", "normal");
                  pdf.setFontSize(8);
                  pdf.setTextColor(stateColor[0], stateColor[1], stateColor[2]);
                  pdf.text(statusText, boxX + boxWidth - 65, yPosition + 7);
                  
                  yPosition += 15;
                  
                  // Draw input title
                  pdf.setFont("Helvetica", "bold");
                  pdf.setFontSize(9);
                  pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                  pdf.text("Input:", boxX + 22, yPosition);
                  
                  yPosition += 10;
                  
                  // Draw input content
                  pdf.setFont("Helvetica", "normal");
                  pdf.setFontSize(9);
                  pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                  pdf.text(inputLines, boxX + 26, yPosition);
                  
                  yPosition += inputHeight + 5;
                  
                  // Draw output if present
                  if (task.payload?.output) {
                    // Check if we need a new page
                    if (yPosition + outputHeight + 15 > pdfHeight - margin.bottom) {
                      yPosition = setupPage(true);
                      
                      // Redraw tool call header for continued content
                      pdf.setFillColor(
                        options.theme === "dark" ? theme.toolCallBg[0] : 240, 
                        options.theme === "dark" ? theme.toolCallBg[1] : 247, 
                        options.theme === "dark" ? theme.toolCallBg[2] : 255
                      );
                      pdf.setDrawColor(
                        options.theme === "dark" ? theme.toolCallBorder[0] : 191, 
                        options.theme === "dark" ? theme.toolCallBorder[1] : 219, 
                        options.theme === "dark" ? theme.toolCallBorder[2] : 254
                      );
                      pdf.roundedRect(boxX + 16, yPosition - 5, boxWidth - 32, outputHeight + 20, 3, 3, 'FD');
                      
                      pdf.setFontSize(11);
                      pdf.setFont("Helvetica", "bold");
                      pdf.setTextColor(
                        options.theme === "dark" ? theme.toolCallTitle[0] : 22, 
                        options.theme === "dark" ? theme.toolCallTitle[1] : 119, 
                        options.theme === "dark" ? theme.toolCallTitle[2] : 255
                      );
                      pdf.text(`${toolName} (continued)`, boxX + 22, yPosition + 7);
                      
                      yPosition += 15;
                    }
                    
                    pdf.setFont("Helvetica", "bold");
                    pdf.setFontSize(9);
                    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                    pdf.text("Output:", boxX + 22, yPosition);
                    
                    yPosition += 10;
                    
                    pdf.setFont("Helvetica", "normal");
                    pdf.setFontSize(9);
                    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
                    pdf.text(outputLines, boxX + 26, yPosition);
                    
                    yPosition += outputHeight;
                  }
                  
                  yPosition += 10; // Extra padding after tool call
                }
              }
            }
            
            // Add separator between steps if not the last step
            if (stepIndex < steps.length - 1) {
              // Check if we need a new page
              if (yPosition + 10 > pdfHeight - margin.bottom) {
                yPosition = setupPage(true);
              }
              
              pdf.setDrawColor(
                options.theme === "dark" ? 45 : 226, 
                options.theme === "dark" ? 55 : 232, 
                options.theme === "dark" ? 72 : 240
              );
              pdf.setLineWidth(0.2);
              pdf.line(boxX + 12, yPosition, boxX + boxWidth - 12, yPosition);
              
              yPosition += 10;
            }
          }
        }
      }
      
      return yPosition;
    };
    
    // Draw the message box and content together
    if (message.type === "workflow") {
      // For workflow messages, use a simplified container
      yPosition = drawMessageContent();
      
      // Draw a simple container around the workflow
      pdf.setDrawColor(boxBorderColor[0], boxBorderColor[1], boxBorderColor[2]);
      pdf.setLineWidth(0.5);
      pdf.line(boxX, startY - 5, boxX, yPosition);
      pdf.line(boxX, startY - 5, boxX + boxWidth, startY - 5);
      pdf.line(boxX + boxWidth, startY - 5, boxX + boxWidth, yPosition);
      pdf.line(boxX, yPosition, boxX + boxWidth, yPosition);
    } else {
      // Calculate approximate box height based on content
      let estimatedHeight = 0;
      
      // Role label and ID height
      estimatedHeight += message.id ? 23 : 15;
      
      // Content height estimate
      if (message.type === "text") {
        const textContent = String(message.content || "");
        const textLines = splitTextToLines(textContent, boxWidth - 16, options.fontSize || 10);
        estimatedHeight += calculateTextHeight(textLines, options.fontSize || 10, options.lineSpacing || 1.5) + 10;
      } else if (message.type === "imagetext") {
        if (message.content && typeof message.content === 'object' && 'text' in message.content) {
          const textContent = String(message.content.text || "");
          const textLines = splitTextToLines(textContent, boxWidth - 16, options.fontSize || 10);
          estimatedHeight += calculateTextHeight(textLines, options.fontSize || 10, options.lineSpacing || 1.5) + 10;
        }
        
        if (message.content && typeof message.content === 'object' && 
            'images' in message.content && 
            Array.isArray(message.content.images)) {
          estimatedHeight += message.content.images.length * 40;
        }
      }
      
      // Draw rounded rectangle and content
      yPosition = drawRoundedRectWithContent(
        boxX,
        yPosition,
        boxWidth,
        Math.max(50, estimatedHeight),
        6,
        boxBgColor,
        boxBorderColor,
        drawMessageContent
      );
    }
    
    // Add spacing after message
    yPosition += 10;
  }
  
  // Add footer if specified
  if (options.footerText) {
    // Ensure we're on the last page
    pdf.setPage(pdf.getNumberOfPages());
    
    pdf.setFontSize(8);
    pdf.setFont("Helvetica", "normal");
    const footerColor = options.theme === "dark" ? [160, 174, 192] : [113, 128, 150];
    pdf.setTextColor(footerColor[0], footerColor[1], footerColor[2]);
    
    const footerY = pdfHeight - (margin.bottom / 2);
    const footerText = options.footerText;
    const footerWidth = pdf.getTextWidth(footerText);
    const footerX = (pdfWidth - footerWidth) / 2;
    
    pdf.text(footerText, footerX, footerY);
  }
  
  // Clean up virtual DOM element
  document.body.removeChild(virtualContainer);
  
  // Save the PDF file
  pdf.save(filename);
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