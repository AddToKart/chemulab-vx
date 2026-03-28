'use client';

import { useCallback, useState } from 'react';
import type { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';

interface UseGroupAvatarEditorOptions {
  initialAvatarSourceUrl?: string;
}

const LOCAL_IMAGE_PREFIXES = ['http://localhost', 'http://192.168'];

function resolveCropImageSrc(avatarSourceUrl: string) {
  const isDataUrl = avatarSourceUrl.startsWith('data:');
  const isLocalUrl =
    avatarSourceUrl.startsWith('/') ||
    LOCAL_IMAGE_PREFIXES.some((prefix) => avatarSourceUrl.startsWith(prefix));

  if (isDataUrl || isLocalUrl) {
    return avatarSourceUrl;
  }

  return `/api/image-proxy?url=${encodeURIComponent(avatarSourceUrl)}`;
}

export function useGroupAvatarEditor(options: UseGroupAvatarEditorOptions = {}) {
  const [avatarSourceUrl, setAvatarSourceUrl] = useState(options.initialAvatarSourceUrl ?? '');
  const [croppedAvatar, setCroppedAvatar] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState('');

  const avatarPreview = croppedAvatar || avatarSourceUrl;
  const finalAvatar = avatarPreview.trim();

  const handleAvatarSourceChange = useCallback(
    (nextAvatarSourceUrl: string) => {
      setAvatarSourceUrl(nextAvatarSourceUrl);
      if (croppedAvatar && nextAvatarSourceUrl !== avatarSourceUrl) {
        setCroppedAvatar('');
      }
      setError('');
    },
    [avatarSourceUrl, croppedAvatar],
  );

  const handleStartCrop = useCallback(() => {
    if (!avatarSourceUrl) {
      setError('Please provide an image URL first.');
      return;
    }

    setCropImageSrc(resolveCropImageSrc(avatarSourceUrl));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    setShowCropModal(true);
  }, [avatarSourceUrl]);

  const handleCropComplete = useCallback((_croppedArea: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) {
      return;
    }

    try {
      const croppedDataUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels, 256);
      setCroppedAvatar(croppedDataUrl);
      setShowCropModal(false);
      setCropImageSrc(null);
      setError('');
    } catch {
      setError('Failed to crop image. Please try again.');
    }
  }, [cropImageSrc, croppedAreaPixels]);

  const handleCropCancel = useCallback(() => {
    setCropImageSrc(null);
    setShowCropModal(false);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setAvatarSourceUrl('');
    setCroppedAvatar('');
    setError('');
  }, []);

  return {
    avatarSourceUrl,
    avatarPreview,
    crop,
    cropImageSrc,
    error,
    finalAvatar,
    showCropModal,
    zoom,
    setCrop,
    setZoom,
    handleAvatarSourceChange,
    handleCropCancel,
    handleCropComplete,
    handleCropConfirm,
    handleRemovePhoto,
    handleStartCrop,
  };
}
