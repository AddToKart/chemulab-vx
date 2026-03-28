'use client';

import Cropper, { type Area } from 'react-easy-crop';

interface GroupAvatarCropModalProps {
  crop: { x: number; y: number };
  image: string;
  onApply: () => void;
  onCancel: () => void;
  onCropChange: (crop: { x: number; y: number }) => void;
  onCropComplete: (_croppedArea: Area, croppedPixels: Area) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}

export function GroupAvatarCropModal({
  crop,
  image,
  onApply,
  onCancel,
  onCropChange,
  onCropComplete,
  onZoomChange,
  zoom,
}: GroupAvatarCropModalProps) {
  return (
    <div className="fixed inset-0 z-[2500] flex flex-col items-center justify-center bg-[rgba(2,6,23,0.92)] backdrop-blur-[10px]">
      <div className="flex w-full max-w-[500px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)]">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-[var(--text-main)]">Crop Group Photo</h3>
          <p className="text-xs text-[var(--text-light)] mt-1">
            Drag to reposition. Scroll or use slider to zoom.
          </p>
        </div>

        <div className="relative w-full" style={{ height: 340 }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-6 py-3">
          <label className="text-xs font-semibold text-[var(--text-light)] mb-1 block">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="w-full accent-[var(--accent-color)] h-1.5 rounded-full"
          />
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            type="button"
            className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-6 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
            onClick={onApply}
          >
            Apply Crop
          </button>
          <button
            type="button"
            className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-6 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
