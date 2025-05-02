/**
 * Utilities for working with SVG elements, including conversion to PNG
 * for better compatibility with PDF exports and other formats.
 */

/**
 * Converts an SVG element to a PNG image data URL
 * @param svgElement The SVG element to convert
 * @param scale Optional scale factor to improve quality (default: 2)
 * @returns A Promise that resolves to a PNG data URL
 */
export async function svgToPng(
  svgElement: SVGElement,
  scale: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Get the SVG dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const width = svgRect.width;
      const height = svgRect.height;
      
      if (width === 0 || height === 0) {
        // Handle empty SVG case
        resolve("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
        return;
      }
      
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Apply explicit dimensions if not present
      if (!clonedSvg.hasAttribute('width')) {
        clonedSvg.setAttribute('width', width.toString());
      }
      if (!clonedSvg.hasAttribute('height')) {
        clonedSvg.setAttribute('height', height.toString());
      }
      
      // Serialize the SVG to a string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      
      // Add XML declaration and ensure namespace is set
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      // Create a data URL from the SVG
      const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
      
      // Create an Image object to load the SVG
      const img = new Image();
      img.width = width * scale;
      img.height = height * scale;
      
      // Set up event handlers for the image loading
      img.onload = () => {
        try {
          // Create a canvas element to draw the image
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          
          // Get the canvas context and draw the image
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Apply high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Set white background to handle transparency
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the SVG onto the canvas
          ctx.drawImage(img, 0, 0, width * scale, height * scale);
          
          // Convert the canvas to a data URL and resolve the promise
          const pngDataUrl = canvas.toDataURL('image/png');
          resolve(pngDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      // Handle errors in loading the image
      img.onerror = (error) => {
        console.error('Error loading SVG for conversion to PNG:', error);
        reject(error);
      };
      
      // Start loading the image
      img.src = svgUrl;
    } catch (error) {
      console.error('Error in svgToPng conversion:', error);
      reject(error);
    }
  });
}

/**
 * Checks if an SVG is complex enough to warrant conversion to PNG
 * @param svgElement The SVG element to check
 * @returns True if the SVG is complex, false otherwise
 */
export function isSvgComplex(svgElement: SVGElement): boolean {
  // Count the number of elements in the SVG
  const childCount = svgElement.querySelectorAll('*').length;
  
  // Check for filters, which can be problematic in PDFs
  const hasFilters = svgElement.querySelector('filter') !== null;
  
  // Check for gradients
  const hasGradients = 
    svgElement.querySelector('linearGradient, radialGradient') !== null;
  
  // Check for animations
  const hasAnimations = svgElement.querySelector('animate, animateTransform, animateMotion') !== null;
  
  // Check for masks or clip paths
  const hasMasksOrClips = svgElement.querySelector('mask, clipPath') !== null;
  
  // Check for embedded images
  const hasImages = svgElement.querySelector('image') !== null;
  
  // Consider an SVG complex if it has many elements or uses advanced features
  return (
    childCount > 50 ||
    hasFilters ||
    hasGradients ||
    hasAnimations ||
    hasMasksOrClips ||
    hasImages
  );
}

/**
 * Optimizes an SVG element for use in a PDF by cleaning up unnecessary attributes
 * and simplifying complex structures
 * @param svgElement The SVG element to optimize
 * @returns The optimized SVG element
 */
export function optimizeSvgForPdf(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const optimizedSvg = svgElement.cloneNode(true) as SVGElement;
  
  // Remove any animations as they won't work in PDFs
  optimizedSvg.querySelectorAll('animate, animateTransform, animateMotion').forEach(el => {
    el.parentNode?.removeChild(el);
  });
  
  // Remove any script elements
  optimizedSvg.querySelectorAll('script').forEach(el => {
    el.parentNode?.removeChild(el);
  });
  
  // Remove any event handlers (onclick, etc.)
  const allElements = optimizedSvg.querySelectorAll('*');
  allElements.forEach(el => {
    const attributes = Array.from(el.attributes);
    attributes.forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // Set explicit dimensions if not present
  const svgRect = svgElement.getBoundingClientRect();
  if (!optimizedSvg.hasAttribute('width')) {
    optimizedSvg.setAttribute('width', svgRect.width.toString());
  }
  if (!optimizedSvg.hasAttribute('height')) {
    optimizedSvg.setAttribute('height', svgRect.height.toString());
  }
  
  // Add viewBox if not present
  if (!optimizedSvg.hasAttribute('viewBox') && 
      optimizedSvg.hasAttribute('width') && 
      optimizedSvg.hasAttribute('height')) {
    optimizedSvg.setAttribute(
      'viewBox', 
      `0 0 ${optimizedSvg.getAttribute('width')} ${optimizedSvg.getAttribute('height')}`
    );
  }
  
  return optimizedSvg;
}