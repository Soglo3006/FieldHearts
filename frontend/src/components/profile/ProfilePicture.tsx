"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslation } from "react-i18next";

interface ProfilePictureUploaderProps {
currentProfilePicture: string;
userName: string;
onProfileChange: (newProfilePicture: string) => void;
size?: "sm" | "md" | "lg" | "xl" | "2xl";
showLabel?: boolean;
readOnly?: boolean;
}

export default function ProfilePictureUploader({
    currentProfilePicture,
    userName,
    onProfileChange,
    size = "md",
    showLabel = true,
    readOnly = false,
    }: ProfilePictureUploaderProps) {
        const { t } = useTranslation();
        const [showCropper, setShowCropper] = useState(false);
        const [imageToCrop, setImageToCrop] = useState<string | null>(null);
        const [crop, setCrop] = useState({ x: 0, y: 0 });
        useScrollLock(showCropper);
        const [zoom, setZoom] = useState(1);
        const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

        const sizeClasses = {
            sm: "w-16 h-16",
            md: "w-24 h-24",
            lg: "w-32 h-32",
            xl: "w-40 h-40",
            "2xl": "w-48 h-48",
        } as const;

        const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image.");
            return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
            setImageToCrop(reader.result as string);
            setShowCropper(true);
            };
            reader.readAsDataURL(file);
        };

        const saveCroppedImage = async () => {
            if (!croppedAreaPixels) return;
            try {
            const croppedImage = await getCroppedImg(imageToCrop!, croppedAreaPixels);
            onProfileChange(croppedImage);
            setShowCropper(false);
            } catch (err) {
            }
        };
        return (
        <>
        <div className="flex flex-col items-center gap-3">
            <Avatar className={`${sizeClasses[size]} border-4 border-gray-100`}>
            <AvatarImage src={currentProfilePicture} alt={userName} />
            <AvatarFallback className="text-2xl bg-green-100 text-green-800 font-semibold">{userName.charAt(0)}</AvatarFallback>
            </Avatar>
            {!readOnly && (
                <div className="flex flex-col items-center gap-2">
            <input
                type="file"
                accept="image/*"
                id="profileInput"
                onChange={handleProfileUpload}
                className="hidden"
            />

            <Button
                variant="outline"
                className="gap-2 cursor-pointer"
                onClick={() => document.getElementById("profileInput")?.click()}
                type="button"
            >
                <Camera className="h-4 w-4" />
                {t("profile.uploadImageLabel")}
            </Button>
            {showLabel && (
                <p className="text-xs text-gray-500">{t("profile.imageHint")}</p>
            )}
            </div>
            )}
        </div>

        {/* Cropper Modal — full screen */}
        {showCropper && imageToCrop && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col">
              {/* Header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-black/80">
                <h2 className="text-white font-semibold text-base">{t("profile.adjustPhoto")}</h2>
                <button
                  onClick={() => setShowCropper(false)}
                  type="button"
                  className="text-white/70 hover:text-white text-sm cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {t("profile.cancel")}
                </button>
              </div>

              {/* Crop area — takes all remaining space */}
              <div className="relative flex-1 bg-gray-900">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(croppedArea, croppedPixels) =>
                    setCroppedAreaPixels(croppedPixels)
                  }
                />
              </div>

              {/* Controls */}
              <div className="shrink-0 bg-black/90 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {/* Zoom label + percentage */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-sm font-medium">{t("profile.zoom")}</span>
                  <span className="text-white/50 text-xs tabular-nums">{Math.round((zoom - 1) / 2 * 100)}%</span>
                </div>
                {/* Zoom row: − slider + */}
                <div className="flex items-center gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none"
                  >−</button>
                  <input
                    type="range"
                    title={t("profile.zoom")}
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full cursor-pointer accent-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center shrink-0 cursor-pointer select-none"
                  >+</button>
                </div>
                <Button
                  onClick={saveCroppedImage}
                  type="button"
                  className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base font-semibold rounded-xl cursor-pointer"
                >
                  {t("profile.save")}
                </Button>
              </div>
            </div>
        )}
        </>
    );
}
