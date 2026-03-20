"use client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Grid3x3 } from "lucide-react";

interface Props {
  imageUrl: string | null;
  title: string;
}

export default function ServiceHero({ imageUrl, title }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <AspectRatio ratio={16 / 9}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Grid3x3 className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </AspectRatio>
    </div>
  );
}
