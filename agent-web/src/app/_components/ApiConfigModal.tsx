"use client";

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import jsQR from 'jsqr';
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

import { Button } from "~/components/ui/button";
import { useApiUrlStore } from "~/core/api/api-url-store";
import { env } from "~/env";

// Add Capacitor type declaration for the window object
declare global {
  interface Window {
    Capacitor?: {
      isPluginAvailable?: (pluginName: string) => boolean;
      platform?: string;
    };
  }
}

export function ApiConfigModal() {
  const { apiUrl, isConfigured, showConfigModal, setApiUrl, setShowConfigModal } = useApiUrlStore();
  
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputInitialized = useRef(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  // Check if we're running in Capacitor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const capacitorObj = window.Capacitor || {};
      const isPluginAvailableFn = capacitorObj.isPluginAvailable;
      const platform = capacitorObj.platform || '';
      
      console.log("Capacitor details:", {
        exists: !!window.Capacitor,
        platform,
        isPluginAvailableFn: !!isPluginAvailableFn
      });
      
      // Stricter check: must be on iOS or Android platform, not web
      const isCapacitorAvailable = !!window.Capacitor && 
                   !!isPluginAvailableFn &&
                   isPluginAvailableFn('Camera') &&
                   ['ios', 'android'].includes(platform);
      
      console.log("Is Capacitor available:", isCapacitorAvailable);
      setIsCapacitor(!!isCapacitorAvailable);
    }
  }, []);

  // Initialize input value with the current API URL from store
  useEffect(() => {
    if (!inputInitialized.current && typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('api-url-direct') ?? apiUrl;
      setInputValue(savedUrl);
      inputInitialized.current = true;
    }
  }, [apiUrl]);

  // Web camera QR scanner
  const startWebScanner = async () => {
    setShowScanner(true);
    setIsProcessing(true);
    setError("");
    
    try {
      // if (!videoRef.current || !canvasRef.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Start scanning frames
      requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error("Failed to access camera:", err);
      setError("Failed to access camera. Please check permissions.");
      setIsProcessing(false);
      setShowScanner(false);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };
  
  const scanFrame = () => {    
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        // QR code detected - stop scanning and clean up
        stopWebScanner(code.data);
        return;
      }
    }
    
    // Continue scanning
    requestAnimationFrame(scanFrame);
  };
  
  const stopWebScanner = (qrData?: string) => {
    setShowScanner(false);
    setIsProcessing(false);
    
    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (qrData) {
      processQrResult(qrData);
    }
  };

  // Capacitor camera scanner
  const scanWithCapacitor = async () => {
    console.log("Starting QR code scan with Capacitor");
    try {
      setIsProcessing(true);
      setError("");
      setShowScanner(true);
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      console.log("Photo captured, processing for QR code");
      
      // Process the image to find QR code
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          setError("Failed to process image");
          setIsProcessing(false);
          setShowScanner(false);
          toast.error("Failed to process image");
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          processQrResult(code.data);
        } else {
          console.log("No QR code found in image");
          setError("No QR code found in image");
          toast.error("No QR code found in image. Please try again.");
        }
        
        setIsProcessing(false);
        setShowScanner(false);
      };
      
      img.onerror = () => {
        console.error("Failed to load image");
        setError("Failed to process image");
        setIsProcessing(false);
        setShowScanner(false);
        toast.error("Failed to process image");
      };
      
      img.src = image.dataUrl || "";
    } catch (err) {
      console.error("Failed to capture photo:", err);
      setError("Failed to access camera. Please check permissions.");
      setIsProcessing(false);
      setShowScanner(false);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  // Choose the appropriate scanning method based on platform
  const scanQRCode = async () => {
    if (isCapacitor) {
      await scanWithCapacitor();
    } else {
      await startWebScanner();
    }
  };

  // Process detected QR code data
  const processQrResult = (data: string) => {
    console.log("QR Code detected:", data);
    setInputValue(data);
    
    // Save to localStorage for reliability
    if (typeof window !== 'undefined') {
      localStorage.setItem('api-url-direct', data);
    }
    
    toast.success(`QR Code scanned successfully!`, {
      duration: 4000,
      style: {
        border: '1px solid #10b981',
        padding: '16px',
        color: '#10b981',
      },
    });
  };

  const handleSubmit = () => {
    if (inputValue.trim() === "") {
      setError("Please enter a valid API URL");
      toast.error("Please enter a valid API URL");
      return;
    }

    try {
      // Basic URL validation
      new URL(inputValue);
      
      // Save to localStorage for reliability
      if (typeof window !== 'undefined') {
        localStorage.setItem('api-url-direct', inputValue);
      }
      
      // Update Zustand store
      setApiUrl(inputValue);
      setError("");
      
      toast.success(`API URL saved successfully`, {
        duration: 4000,
        style: {
          border: '1px solid #10b981',
          padding: '16px',
          color: '#10b981',
        },
      });
      
      // Close the modal
      setShowConfigModal(false);
    } catch (err) {
      setError("Please enter a valid URL");
      toast.error("Please enter a valid URL");
    }
  };

  if (!showConfigModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[90%] max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Configure API URL</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          {!isConfigured 
            ? "Please enter the URL of your API or scan a QR code containing the URL to continue" 
            : "Update your API connection URL"}
        </p>

        {showScanner && !isCapacitor && (
          <div className="relative w-full mb-4 overflow-hidden rounded-lg" style={{ height: '300px' }}>
            {/* Camera display */}
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
            ></video>
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full opacity-0"
            ></canvas>
            
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Darkened overlay with transparent center */}
              <div className="absolute inset-0 bg-black opacity-50"></div>
              
              {/* Transparent scan area */}
              <div 
                className="relative z-10 border-2 border-white rounded-lg"
                style={{ 
                  width: '70%', 
                  height: '70%', 
                  boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Scan corners */}
                <div className="absolute left-0 top-0 w-6 h-6 border-t-2 border-l-2 border-blue-400"></div>
                <div className="absolute right-0 top-0 w-6 h-6 border-t-2 border-r-2 border-blue-400"></div>
                <div className="absolute left-0 bottom-0 w-6 h-6 border-b-2 border-l-2 border-blue-400"></div>
                <div className="absolute right-0 bottom-0 w-6 h-6 border-b-2 border-r-2 border-blue-400"></div>
                
                {/* Scan line animation */}
                <div 
                  className="absolute left-0 w-full h-0.5 bg-blue-400"
                  style={{ 
                    animation: 'scan-line 2s linear infinite',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                ></div>
              </div>
              
              {/* Scan instruction text */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm font-medium">
                Position QR code within the frame
              </div>
            </div>
            
            <Button 
              onClick={() => stopWebScanner()} 
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 z-20"
            >
              Cancel
            </Button>
          </div>
        )}

        {!showScanner && (
          <div className="mb-4">
            <label htmlFor="apiUrl" className="block text-sm font-medium mb-1">
              API URL
            </label>
            <input
              type="text"
              id="apiUrl"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="https://example.com/api"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        )}

        {showScanner && isCapacitor && (
          <div className="flex justify-center mb-4">
            <p className="text-center">Camera is active. Please point at a QR code.</p>
          </div>
        )}

        {!showScanner && (
          <div className="flex justify-between">
            <Button 
              type="button"
              onClick={scanQRCode} 
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Scan QR Code"}
            </Button>
            <Button 
              type="button"
              onClick={handleSubmit} 
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Save
            </Button>
          </div>
        )}

        {isProcessing && !showScanner && (
          <p className="text-sm text-blue-500 mt-4 mb-2">
            Processing image...
          </p>
        )}
        
        {showScanner && isCapacitor && (
          <Button 
            onClick={() => {
              setShowScanner(false);
              setIsProcessing(false);
            }} 
            className="w-full mt-2 bg-red-500 hover:bg-red-600"
          >
            Cancel
          </Button>
        )}
      </div>
      
      {/* Add global style for scan line animation */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
      `}</style>
    </div>
  );
}
