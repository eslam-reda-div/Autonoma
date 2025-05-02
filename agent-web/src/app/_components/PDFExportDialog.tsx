"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Slider } from "~/components/ui/slider";
import { Message } from "~/core/messaging";
import { ExportFormat, PDFExportOptions, defaultPDFOptions, exportChat } from "~/core/utils/export-utils";
import { FileDown, Settings, Eye, Workflow, Wrench, PanelLeft } from "lucide-react";
import { toast } from "~/components/ui/use-toast";
import { useMediaQuery } from "~/components/hooks/use-media-query";

// Helper function to workaround html2canvas color parsing issues
const preprocessColorsForPDF = () => {
  // Track all elements we modified for restoration later
  const modifiedElements = new Map();
  
  try {
    // Process inline style elements (stylesheets)
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((style, index) => {
      if (style && style.textContent) {
        const originalContent = style.textContent;
        modifiedElements.set(`style-${index}`, originalContent);
        
        // Replace oklch colors with rgb equivalents in stylesheets
        if (originalContent.includes('oklch')) {
          // Create a temporary element to compute styles
          const tempDiv = document.createElement('div');
          tempDiv.style.display = 'none';
          document.body.appendChild(tempDiv);
          
          // Find all oklch color declarations using regex
          const oklchRegex = /oklch\([^)]+\)/g;
          const matches = originalContent.match(oklchRegex);
          
          if (matches) {
            let modifiedCss = originalContent;
            
            matches.forEach(match => {
              try {
                // Apply the oklch color to the temp element
                tempDiv.style.color = match;
                
                // Get the computed RGB color
                const computedStyle = window.getComputedStyle(tempDiv);
                const rgbColor = computedStyle.color;
                
                // Replace the oklch with the rgb equivalent
                modifiedCss = modifiedCss.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rgbColor);
              } catch (e) {
                console.debug('Error converting oklch color:', e);
              }
            });
            
            // Update the style with converted colors
            style.textContent = modifiedCss;
          }
          
          // Clean up
          document.body.removeChild(tempDiv);
        }
      }
    });
    
    // Find and process all elements with inline styles containing oklch
    const processElementStyles = (elements: NodeListOf<Element> | Element[]) => {
      elements.forEach((element, index) => {
        if (element instanceof HTMLElement) {
          const originalStyle = element.getAttribute('style') || '';
          const elementId = `inline-${element.tagName}-${index}-${Math.random().toString(36).substring(2, 9)}`;
          
          interface ModifiedElement {
            element: HTMLElement;
            originalStyle: string;
          }
          
          modifiedElements.set(elementId, {
            element,
            originalStyle
          } as ModifiedElement);
          
          // Get computed styles and apply them directly to bypass oklch
          const computedStyle = window.getComputedStyle(element);
          
          // Create a new style attribute with computed values
          let newStyle = originalStyle;
          
          // Replace color properties with computed RGB values
          ['color', 'background-color', 'border-color'].forEach((prop: string) => {
            const computedValue = computedStyle.getPropertyValue(prop);
            if (computedValue && computedValue !== 'transparent' && computedValue !== 'rgba(0, 0, 0, 0)') {
              // Extract existing property if it exists
              const propRegex = new RegExp(`${prop}\\s*:\\s*[^;]+;?`, 'gi');
              if (propRegex.test(newStyle)) {
                newStyle = newStyle.replace(propRegex, `${prop}: ${computedValue};`);
              } else {
                newStyle += `${prop}: ${computedValue};`;
              }
            }
          });
          
          element.setAttribute('style', newStyle);
          element.setAttribute('data-pdf-converted', elementId);
        }
      });
    };
    
    // Process elements with oklch in inline styles
    const elementsWithOklch = document.querySelectorAll('[style*="oklch"]');
    processElementStyles(elementsWithOklch);
    
    // Also process any elements that might use oklch through stylesheets
    // This is more comprehensive and catches elements styled via class
    const allElements = document.querySelectorAll('*');
    const elementsToCheck = Array.from(allElements).filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      const computedStyle = window.getComputedStyle(el);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      const borderColor = computedStyle.borderColor;
      
      // Check if any of these properties might contain oklch (which we can't easily detect directly)
      // Instead, check if the element has color values that might be problematic
      return color.includes('oklch') || backgroundColor.includes('oklch') || borderColor.includes('oklch');
    });
    
    processElementStyles(elementsToCheck);
    
    // Tag external stylesheets for potential issues
    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link) => {
      if (link instanceof HTMLLinkElement && link.href) {
        link.setAttribute('data-pdf-external', 'true');
      }
    });
  } catch (error) {
    console.error('Error in color preprocessing:', error);
  }
  
  // Return a function to restore original styles
  return () => {
    try {
      // Restore modified inline styles
      modifiedElements.forEach((value, key) => {
        if (key.startsWith('style-')) {
          const styleIndex = parseInt(key.split('-')[1]);
          const styleElements = document.querySelectorAll('style');
          if (styleElements[styleIndex]) {
            styleElements[styleIndex].textContent = value;
          }
        } else if (typeof value === 'object' && value.element) {
          // Restore inline styles
          value.element.setAttribute('style', value.originalStyle);
          value.element.removeAttribute('data-pdf-converted');
        }
      });
      
      // Remove tags from external stylesheets
      document.querySelectorAll('[data-pdf-external="true"]').forEach((link) => {
        link.removeAttribute('data-pdf-external');
      });
    } catch (error) {
      console.error('Error restoring styles:', error);
    }
  };
};

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
}

export function PDFExportDialog({ open, onOpenChange, messages }: PDFExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PDFExportOptions>({...defaultPDFOptions});
  const [activeTab, setActiveTab] = useState("general");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [showPreview, setShowPreview] = useState(true);
  
  // Count number of workflow messages
  const workflowCount = messages.filter(msg => msg.type === "workflow").length;
  
  // Media queries for responsive design
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");
  
  // Toggle preview visibility on mobile
  useEffect(() => {
    if (isMobile) {
      setShowPreview(false);
    } else {
      setShowPreview(true);
    }
  }, [isMobile]);
  
  const handleExport = async () => {
    setIsExporting(true);
    let restoreStyles: (() => void) | null = null;
    
    try {
      // Apply color preprocessing before export
      restoreStyles = preprocessColorsForPDF();
      // Proceed with export
      await exportChat(messages, ExportFormat.PDF, options);
      onOpenChange(false);
      toast({
        title: "Export Successful",
        description: "Your conversation has been exported to PDF.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Export Failed",
        description: "There was a problem exporting to PDF. Try using a different theme or format.",
        variant: "destructive",
      });
    } finally {
      // Restore original styles
      if (restoreStyles) {
        restoreStyles();
      }
      setIsExporting(false);
    }
  };
  
  const updateOption = <K extends keyof PDFExportOptions>(key: K, value: PDFExportOptions[K]) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileDown className="h-5 w-5" />
            Export Conversation to PDF
          </DialogTitle>
        </DialogHeader>
        
        {isMobile && (
          <div className="mb-4 flex justify-between items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1"
            >
              {showPreview ? <Settings className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Settings" : "Preview"}
            </Button>
            
            {!showPreview && (
              <Select 
                value={previewMode} 
                onValueChange={(value) => setPreviewMode(value as "light" | "dark")}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue placeholder="Preview mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        
        <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-3' : 'grid-cols-5'} gap-4 md:gap-6`}>
          {/* Configuration panel */}
          {(!isMobile || (isMobile && !showPreview)) && (
            <div className={`${isMobile ? 'col-span-1' : isTablet ? 'col-span-2' : 'col-span-3'}`}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid ${isMobile ? 'grid-cols-2 mb-4' : 'grid-cols-5 mb-4'}`}>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  {!isMobile && <TabsTrigger value="header">Header & Footer</TabsTrigger>}
                  {!isMobile && <TabsTrigger value="workflow">
                    <div className="flex items-center gap-1">
                      <Workflow className="h-3.5 w-3.5" />
                      <span>Workflow</span>
                    </div>
                  </TabsTrigger>}
                  {!isMobile && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
                  {isMobile && (
                    <TabsTrigger value="header" className="col-span-2">
                      Header & Footer
                    </TabsTrigger>
                  )}
                  {isMobile && (
                    <TabsTrigger value="workflow" className="col-span-1">
                      <div className="flex items-center gap-1">
                        <Workflow className="h-3.5 w-3.5" />
                        <span>Workflow</span>
                      </div>
                    </TabsTrigger>
                  )}
                  {isMobile && (
                    <TabsTrigger value="advanced" className="col-span-1">
                      Advanced
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Export Title</Label>
                    <Input 
                      id="title" 
                      value={options.title || ''} 
                      onChange={e => updateOption('title', e.target.value)}
                      placeholder="Chat Export"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="filename">Filename</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        id="filename" 
                        value={options.filename || ''} 
                        onChange={e => updateOption('filename', e.target.value)}
                        placeholder="autonoma-chat-export"
                      />
                      <span className="text-sm text-gray-500">.pdf</span>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Page Size</Label>
                    <RadioGroup 
                      value={options.pageSize || 'a4'} 
                      onValueChange={value => updateOption('pageSize', value as "a4" | "letter" | "legal")}
                      className="flex flex-wrap gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="a4" id="a4" />
                        <Label htmlFor="a4" className="cursor-pointer">A4</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="letter" id="letter" />
                        <Label htmlFor="letter" className="cursor-pointer">Letter</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="legal" id="legal" />
                        <Label htmlFor="legal" className="cursor-pointer">Legal</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Orientation</Label>
                    <RadioGroup 
                      value={options.orientation || 'portrait'} 
                      onValueChange={value => updateOption('orientation', value as "portrait" | "landscape")}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="portrait" id="portrait" />
                        <Label htmlFor="portrait" className="cursor-pointer">Portrait</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="landscape" id="landscape" />
                        <Label htmlFor="landscape" className="cursor-pointer">Landscape</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>
                
                <TabsContent value="appearance" className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Theme</Label>
                    <RadioGroup 
                      value={options.theme || 'professional'} 
                      onValueChange={value => updateOption('theme', value as "light" | "dark" | "professional" | "minimal")}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="cursor-pointer">Light</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="professional" id="professional" />
                        <Label htmlFor="professional" className="cursor-pointer">Professional</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="minimal" id="minimal" />
                        <Label htmlFor="minimal" className="cursor-pointer">Minimal</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="fontSize" className="flex justify-between">
                      <span>Font Size</span>
                      <span className="text-sm font-normal text-gray-500">{options.fontSize}px</span>
                    </Label>
                    <Slider 
                      id="fontSize"
                      min={8}
                      max={14}
                      step={1}
                      value={[options.fontSize || 10]}
                      onValueChange={([value]) => updateOption('fontSize', value)}
                      className="py-2"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="lineSpacing" className="flex justify-between">
                      <span>Line Spacing</span>
                      <span className="text-sm font-normal text-gray-500">{options.lineSpacing}x</span>
                    </Label>
                    <Slider 
                      id="lineSpacing"
                      min={1}
                      max={2}
                      step={0.1}
                      value={[options.lineSpacing || 1.5]}
                      onValueChange={([value]) => updateOption('lineSpacing', value)}
                      className="py-2"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-4">
                  {workflowCount > 0 ? (
                    <>
                      <div className="flex items-center space-x-2 pt-1 pb-3">
                        <Workflow className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          Workflow Export Options ({workflowCount} workflow{workflowCount > 1 ? 's' : ''} detected)
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                          id="includeWorkflowDetails" 
                          checked={options.includeWorkflowDetails !== false}
                          onCheckedChange={checked => updateOption('includeWorkflowDetails', Boolean(checked))}
                        />
                        <Label htmlFor="includeWorkflowDetails" className="cursor-pointer">
                          Include detailed workflow steps
                        </Label>
                      </div>
                      
                      {options.includeWorkflowDetails && (
                        <>
                          <div className="grid gap-2 mt-2 pl-6">
                            <Label>Workflow Display Style</Label>
                            <RadioGroup 
                              value={options.workflowStyle || 'detailed'} 
                              onValueChange={value => updateOption('workflowStyle', value as "compact" | "detailed")}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="detailed" id="detailed" />
                                <Label htmlFor="detailed" className="cursor-pointer flex items-center gap-1">
                                  <PanelLeft className="h-3.5 w-3.5" />
                                  <span>Detailed (show all steps and thinking)</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="compact" id="compact" />
                                <Label htmlFor="compact" className="cursor-pointer">Compact (simplified view)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div className="flex items-center space-x-2 pl-6 pt-2">
                            <Checkbox 
                              id="highlightToolCalls" 
                              checked={options.highlightToolCalls !== false}
                              onCheckedChange={checked => updateOption('highlightToolCalls', Boolean(checked))}
                            />
                            <Label htmlFor="highlightToolCalls" className="cursor-pointer flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5 text-blue-500" />
                              <span>Highlight tool calls</span>
                            </Label>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 flex flex-col items-center justify-center py-4">
                      <Workflow className="h-8 w-8 text-gray-300 mb-2" />
                      <p>No workflows detected in this conversation.</p>
                      <p className="text-xs mt-1">Workflow options are only available for conversations containing workflows.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="header" className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="headerTitle">Header Title</Label>
                    <Input 
                      id="headerTitle" 
                      value={options.headerTitle || ''} 
                      onChange={e => updateOption('headerTitle', e.target.value)}
                      placeholder="Autonoma Chat Export"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="includeTimestamp" 
                      checked={options.includeTimestamp} 
                      onCheckedChange={checked => updateOption('includeTimestamp', Boolean(checked))}
                    />
                    <Label htmlFor="includeTimestamp" className="cursor-pointer">
                      Include timestamp in header
                    </Label>
                  </div>
                  
                  <div className="grid gap-2 pt-4">
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Input 
                      id="footerText" 
                      value={options.footerText || ''} 
                      onChange={e => updateOption('footerText', e.target.value)}
                      placeholder="Generated by Autonoma"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeMetadata" 
                      checked={options.includeMetadata} 
                      onCheckedChange={checked => updateOption('includeMetadata', Boolean(checked))}
                    />
                    <Label htmlFor="includeMetadata" className="cursor-pointer">
                      Include PDF metadata (title, author, etc.)
                    </Label>
                  </div>
                  
                  <div className="pt-4">
                    <Label className="block mb-2">Export to other formats:</Label>
                    <div className={`flex flex-wrap gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChat(messages, ExportFormat.TEXT)}
                        className={isMobile ? "justify-start" : ""}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export as Text
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChat(messages, ExportFormat.HTML)}
                        className={isMobile ? "justify-start" : ""}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export as HTML
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChat(messages, ExportFormat.JSON)}
                        className={isMobile ? "justify-start" : ""}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export as JSON
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {/* Preview panel */}
          {(!isMobile || (isMobile && showPreview)) && (
            <div className={`${isMobile ? 'col-span-1' : isTablet ? 'col-span-1' : 'col-span-2'} border rounded-md p-3 md:p-4 bg-gray-50 h-fit`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Preview</h3>
                {!isMobile && (
                  <Select 
                    value={previewMode} 
                    onValueChange={(value) => setPreviewMode(value as "light" | "dark")}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue placeholder="Preview mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div 
                className={`rounded-md overflow-hidden ${previewMode === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} border`}
                style={{ height: isMobile ? '300px' : '400px', fontSize: '10px' }}
              >
                {/* Header preview */}
                <div 
                  className={`p-3 border-b ${previewMode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  style={{ fontSize: '12px' }}
                >
                  <div className="font-bold">{options.headerTitle || "Autonoma Chat"}</div>
                  {options.includeTimestamp && (
                    <div className={`text-xs ${previewMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Generated on {new Date().toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Message preview */}
                <div className="p-3 overflow-y-auto" style={{ height: isMobile ? '230px' : '330px' }}>
                  {/* User message example */}
                  <div 
                    className={`mb-2 p-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-700' : 'bg-blue-50'} ml-6`}
                    style={{ fontSize: `${options.fontSize}px` }}
                  >
                    <div className="font-bold">You</div>
                    <div style={{ lineHeight: `${options.lineSpacing}` }}>
                      Example user message in the chat export.
                    </div>
                  </div>
                  
                  {/* Assistant message example */}
                  <div 
                    className={`mb-2 p-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-600' : 'bg-gray-50'} mr-6`}
                    style={{ fontSize: `${options.fontSize}px` }}
                  >
                    <div className="font-bold">Assistant</div>
                    <div style={{ lineHeight: `${options.lineSpacing}` }}>
                      This is an example response from the assistant.
                    </div>
                  </div>
                  
                  {/* Workflow example if option is enabled */}
                  {workflowCount > 0 && (
                    <div 
                      className={`mb-2 p-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-600' : 'bg-gray-50'} mr-6`}
                    >
                      <div className="font-bold text-green-500">
                        <span className="flex items-center gap-1">
                          <Workflow className="h-3 w-3" /> Workflow
                        </span>
                      </div>
                      
                      {options.includeWorkflowDetails ? (
                        <div className="mt-2 text-xs">
                          <div className={`p-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-700' : 'bg-blue-50/50'}`}>
                            <div className="font-bold">Step 1: Planning</div>
                            <div className="pl-3 mt-1 opacity-80">
                              Detailed steps and thinking...
                            </div>
                            
                            {options.highlightToolCalls && (
                              <div className={`mt-2 p-1.5 rounded ${previewMode === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} border ${previewMode === 'dark' ? 'border-blue-800/30' : 'border-blue-100'}`}>
                                <div className="flex items-center gap-1 text-[9px] font-medium text-blue-600">
                                  <Wrench className="h-2.5 w-2.5" /> Tool Call
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className={`p-2 mt-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-700' : 'bg-blue-50/50'}`}>
                            <div className="font-bold">Step 2: File Management</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded-full bg-gray-300 flex items-center justify-center text-[8px]">1</span>
                            <span>Planning</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded-full bg-gray-300 flex items-center justify-center text-[8px]">2</span>
                            <span>File Management</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* More sample messages */}
                  <div 
                    className={`mb-2 p-2 rounded-md ${previewMode === 'dark' ? 'bg-gray-700' : 'bg-blue-50'} ml-6`}
                    style={{ fontSize: `${options.fontSize}px` }}
                  >
                    <div className="font-bold">You</div>
                    <div style={{ lineHeight: `${options.lineSpacing}` }}>
                      Another sample message to show spacing.
                    </div>
                  </div>
                </div>
                
                {/* Footer preview */}
                {options.footerText && (
                  <div 
                    className={`p-2 text-center text-xs ${previewMode === 'dark' ? 'border-t border-gray-700 text-gray-400' : 'border-t text-gray-500'}`}
                  >
                    {options.footerText}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-6 flex-wrap gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto mb-2 sm:mb-0"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            {isExporting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}