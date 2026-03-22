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

        {/* Cropper Modal */}
        {showCropper && imageToCrop && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4">{t("profile.adjustPhoto")}</h2>

                <div className="relative w-full h-64 bg-gray-200 rounded-xl overflow-hidden">
                <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(croppedArea, croppedPixels) =>
                    setCroppedAreaPixels(croppedPixels)
                    }
                />
                </div>

                <div className="mt-4 mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t("profile.zoom")}</label>
                  <input
                    type="range"
                    title={t("profile.zoom")}
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCropper(false)} type="button" className="flex-1 cursor-pointer">
                    {t("profile.cancel")}
                </Button>
                <Button onClick={saveCroppedImage} type="button" className="flex-1 cursor-pointer">{t("profile.save")}</Button>
                </div>
            </div>
            </div>
        )}
        </>
    );
}
