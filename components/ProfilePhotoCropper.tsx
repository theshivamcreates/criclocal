"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";

interface ProfilePhotoCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ProfilePhotoCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: ProfilePhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedFile) {
        onCropComplete(croppedFile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative flex h-full max-h-[600px] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline px-4 py-3">
          <h3 className="text-lg font-black text-on-surface">Crop Photo</h3>
          <button
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface font-bold text-sm"
          >
            Cancel
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black w-full min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 p-4 border-t border-outline bg-surface">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => {
                setZoom(Number(e.target.value));
              }}
              className="flex-1 accent-primary"
            />
          </div>
          <button
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="w-full rounded-md bg-primary py-3 font-black text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
