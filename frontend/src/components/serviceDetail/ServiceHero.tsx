"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Grid3x3 } from "lucide-react";
import AppImage from "@/components/ui/AppImage";
import { ImageLightbox } from "@/components/messages/ImageLightbox";
import { fullListingImageUrl } from "@/lib/listingImages";
import ListingLangPills from "@/components/ui/ListingLangPills";
import type { ServiceLikeWithI18n } from "@/lib/serviceListingI18n";
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
  /** Affiche Fr / Eng selon les textes disponibles (pas la langue parlée seule). */
  listingForLangPills?: ServiceLikeWithI18n | null;
}

export default function ServiceHero({ images, title, listingForLangPills }: Props) {
  const validImages = images.filter(Boolean);
  const count = validImages.length;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { t } = useTranslation();

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
          <div className="relative h-full w-full">
            {listingForLangPills && <ListingLangPills service={listingForLangPills} />}
            {count > 0 ? (
              <Carousel
                setApi={setApi}
                opts={{ align: "start", loop: count > 1 }}
                className="h-full w-full"
              >
                <CarouselContent className="ml-0 h-full">
                  {validImages.map((image, imageIndex) => (
                    <CarouselItem key={`${image}-${imageIndex}`} className="pl-0 h-full">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(image)}
                        aria-label={t("serviceDetail.viewFullImage")}
                        className="block h-full w-full cursor-zoom-in"
                      >
                        <AppImage
                          src={image}
                          alt={`${title} - ${imageIndex + 1}`}
                          width={1600}
                          height={900}
                          sizes="(max-width: 1024px) 100vw, 66vw"
                          className="h-full w-full object-cover"
                        />
                      </button>
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
              <span className="absolute top-3 right-3 z-[11] bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                {index + 1} / {count}
              </span>
            )}
          </div>
        </AspectRatio>
      </div>

      {lightboxImage && (
        // Cards show the poster's framing; the lightbox shows the whole photo.
        <ImageLightbox
          imageUrl={fullListingImageUrl(lightboxImage)}
          fallbackImageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
