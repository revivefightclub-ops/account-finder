"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Upload, Check, X, ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatar: string;
  onSave: (newName: string, newAvatar: string) => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
];

export function ProfileModal({ isOpen, onClose, currentName, currentAvatar, onSave }: ProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar);

  // Zoom & Pan adjustment states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setAvatar(currentAvatar);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, currentName, currentAvatar]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const resetAdjustment = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Generate final cropped & zoomed image via HTML5 Canvas
  const getCroppedCanvasImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(avatar);
          return;
        }

        // Draw circular clip path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        const viewportSize = 160;
        const scaleFactor = size / viewportSize;

        // Calculate aspect ratio fill to eliminate any gaps
        const scaleRatio = Math.max(size / img.width, size / img.height);
        const drawWidth = img.width * scaleRatio;
        const drawHeight = img.height * scaleRatio;

        ctx.translate(size / 2 + pan.x * scaleFactor, size / 2 + pan.y * scaleFactor);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(avatar);
      img.src = avatar;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Apply canvas crop/zoom/pan adjustments before saving
    let finalAvatar = avatar;
    if (zoom !== 1 || pan.x !== 0 || pan.y !== 0) {
      finalAvatar = await getCroppedCanvasImage();
    }

    onSave(name.trim(), finalAvatar);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/20 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface w-full max-w-[460px] rounded-xl shadow-xl border border-outline-variant/50 overflow-hidden relative"
          >
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Edit Profile</h3>
              <button
                type="button"
                className="text-outline hover:text-on-surface text-sm font-medium"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Avatar Drag & Zoom Crop Viewport */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <span className="text-xs font-semibold text-on-surface-variant flex items-center justify-center gap-1">
                    <Move className="w-3.5 h-3.5" /> Drag photo to adjust position • Slider to zoom
                  </span>
                </div>

                {/* Viewport Box */}
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30 shadow-md bg-neutral-900 cursor-grab active:cursor-grabbing select-none shrink-0"
                >
                  <div
                    className="w-full h-full relative"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: isDragging ? "none" : "transform 0.1s ease-out",
                    }}
                  >
                    <img
                      src={avatar}
                      alt="Avatar Preview"
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  </div>

                  {/* Circular Ring Overlay */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/60 pointer-events-none" />
                </div>

                {/* Zoom Control Slider */}
                <div className="w-full max-w-[300px] flex items-center justify-between gap-3 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/40">
                  <ZoomOut className="w-4 h-4 text-outline shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1.5 bg-surface-variant rounded-lg"
                  />
                  <ZoomIn className="w-4 h-4 text-primary shrink-0" />

                  {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                    <button
                      type="button"
                      onClick={resetAdjustment}
                      className="p-1 text-outline hover:text-on-surface rounded transition-colors shrink-0"
                      title="Reset Position & Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Custom Photo
                </button>
              </div>

              {/* Avatar Presets */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2 text-center">
                  Or Choose a Preset Avatar
                </label>
                <div className="flex justify-center gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatar(url);
                        resetAdjustment();
                      }}
                      className={`relative rounded-full overflow-hidden w-10 h-10 border-2 transition-all ${
                        avatar === url ? "border-primary scale-110 shadow" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      {avatar === url && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white font-bold" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm font-medium"
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex justify-end gap-3 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-container text-on-primary font-semibold rounded-lg hover:bg-primary-container/90 transition-colors text-sm shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
