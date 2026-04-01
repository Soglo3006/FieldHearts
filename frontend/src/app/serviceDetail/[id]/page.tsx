import { Metadata } from "next";
import ServiceDetailClient from "./ServiceDetailClient";
import { getSafeMetadataImageUrl } from "@/lib/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const res = await fetch(`${API_URL}/services/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const service = await res.json();

    const title = `${service.title} — ${Number(service.price).toFixed(2)} $ | Uneden`;
    const description = service.description
      ? service.description.slice(0, 155)
      : `Découvre ce service sur Uneden — ${service.city ?? service.location ?? "Québec"}.`;
    const image = getSafeMetadataImageUrl(service.image_url) ?? "https://uneden.ca/og-image.png";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://uneden.ca/serviceDetail/${id}`,
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {};
  }
}

export default function ServiceDetailPage() {
  return <ServiceDetailClient />;
}
