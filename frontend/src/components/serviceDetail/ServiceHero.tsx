"use client";
import { useEffect, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Grid3x3 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface Props {
  images: string[];
  title: string;
}

export default function ServiceHero({ images, title }: Props) {
  const validImages = images.filter(Boolean);
  const count = validImages.length;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setIndex(api.selectedScrollSnap());
    };

    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);

    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="relative overflow-hidden rounded-xl">
        <AspectRatio ratio={16 / 9}>
          {count > 0 ? (
            <Carousel
              setApi={setApi}
              opts={{ align: "start", loop: count > 1 }}
              className="h-full w-full"
            >
              <CarouselContent className="ml-0 h-full">
                {validImages.map((image, imageIndex) => (
                  <CarouselItem key={`${image}-${imageIndex}`} className="pl-0 h-full">
                    <img
                      src={image}
                      alt={`${title} - ${imageIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {count > 1 && (
                <>
                  <CarouselPrevious
                    className="left-3 top-1/2 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  />
                  <CarouselNext
                    className="right-3 top-1/2 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                  />
                </>
              )}
            </Carousel>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Grid3x3 className="w-16 h-16 text-gray-300" />
            </div>
          )}

          {count > 1 && (
            <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {index + 1} / {count}
            </span>
          )}
        </AspectRatio>
      </div>

    </div>
  );
}
