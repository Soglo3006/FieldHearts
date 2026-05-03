"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import AppImage from "@/components/ui/AppImage";

interface PortfolioItem {
  id?: string | number;
  image: string;
  title: string;
  description?: string;
}

interface Props {
  portfolio: PortfolioItem[];
  isPerson: boolean;
  isOwner?: boolean;
}

export default function ProfilePortfolio({ portfolio, isPerson, isOwner }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PortfolioItem | null>(null);

  useScrollLock(!!selected);

  if (portfolio.length === 0 && !isOwner) return null;

  return (
    <>
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {isPerson ? t("profile.portfolio") : t("profile.ourProjects")}
          </h2>
        </div>

        {portfolio.length === 0 ? (
          <p className="text-gray-400 text-sm">{t("profile.noPortfolio", "Aucun élément dans le portfolio.")}</p>
        ) : (
          <Carousel opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-4">
              {portfolio.map((item, index) => (
                <CarouselItem key={item.id || index} className="pl-4 basis-1/2 md:basis-1/3">
                  <div className="group cursor-pointer" onClick={() => setSelected(item)}>
                    <div className="relative overflow-hidden rounded-lg aspect-4/3">
                      <AppImage
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-700 text-center mt-2">{item.title}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {portfolio.length > 4 && (
              <>
                <CarouselPrevious className="-left-4 cursor-pointer" />
                <CarouselNext className="-right-4 cursor-pointer" />
              </>
            )}
          </Carousel>
        )}
      </Card>

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden relative animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              aria-label={t("common.close")}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded"
              onClick={() => setSelected(null)}
            >
              ✕
            </Button>
            <div className="w-full aspect-4/3 bg-gray-200">
              <div className="relative h-full w-full">
                <AppImage src={selected.image} alt={selected.title} fill sizes="100vw" className="object-cover" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-center px-4 py-3">{selected.title}</h3>
          </div>
        </div>
      )}
    </>
  );
}
