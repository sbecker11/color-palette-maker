import { useEffect, useRef } from 'react';
import { rgbToHex } from '../utils';

function ImageViewer({
  imageUrl,
  isSamplingMode,
  onSampledColorChange,
  onDoubleClickAddColor,
}) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasCtxRef = useRef(null);

  // Draw image to hidden canvas when imageUrl changes
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvasCtxRef.current = ctx;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.onerror = () => {
      if (canvasCtxRef.current && canvasRef.current) {
        canvasCtxRef.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getCanvasCoords = (event) => {
    const imgElement = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvasCtxRef.current;
    if (!imgElement || !canvas || !ctx || !imgElement.complete || imgElement.naturalWidth === 0) {
      return null;
    }

    const imgRect = imgElement.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgDispWidth = imgElement.clientWidth;
    const imgDispHeight = imgElement.clientHeight;

    const mouseX = event.clientX - imgRect.left;
    const mouseY = event.clientY - imgRect.top;

    const canvasRatio = canvasWidth / canvasHeight;
    const imgDispRatio = imgDispWidth / imgDispHeight;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgDispRatio) {
      scale = canvasHeight / imgDispHeight;
      const scaledWidth = canvasWidth / scale;
      offsetX = (scaledWidth - imgDispWidth) / 2;
    } else {
      scale = canvasWidth / imgDispWidth;
      const scaledHeight = canvasHeight / scale;
      offsetY = (scaledHeight - imgDispHeight) / 2;
    }

    const canvasX = Math.floor((mouseX + offsetX) * scale);
    const canvasY = Math.floor((mouseY + offsetY) * scale);

    const x = Math.max(0, Math.min(canvasX, canvasWidth - 1));
    const y = Math.max(0, Math.min(canvasY, canvasHeight - 1));

    return { x, y };
  };

  const handleMouseMove = (event) => {
    if (!isSamplingMode) return;

    const coords = getCanvasCoords(event);
    if (!coords) return;

    const ctx = canvasCtxRef.current;
    if (!ctx) return;

    try {
      const pixelData = ctx.getImageData(coords.x, coords.y, 1, 1).data;
      const r = pixelData[0];
      const g = pixelData[1];
      const b = pixelData[2];
      const hex = rgbToHex(r, g, b);
      onSampledColorChange?.(hex);
    } catch (e) {
      onSampledColorChange?.(null);
    }
  };

  const handleMouseLeave = () => {
    if (isSamplingMode) {
      onSampledColorChange?.(null);
    }
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isSamplingMode) return;
    onDoubleClickAddColor?.();
  };

  const hasImage = !!imageUrl;

  return (
    <div id="imageViewerContainer">
      <div id="imageViewer">
        {!hasImage && (
          <span className="placeholder">Select an image from the list</span>
        )}
        <img
          ref={imgRef}
          id="displayedImage"
          src={imageUrl || ''}
          alt="Selected Image"
          style={{ display: hasImage ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          id="imageCanvas"
          style={{ display: 'none' }}
          aria-hidden="true"
        />
        {hasImage && (
          <div
            className="image-viewer-overlay"
            style={{
              cursor: isSamplingMode ? 'crosshair' : 'default',
              pointerEvents: isSamplingMode ? 'auto' : 'none',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
          />
        )}
      </div>
    </div>
  );
}

export default ImageViewer;
