import Image, { type ImageProps } from 'next/image';
import { shouldBypassImageOptimization, getOptimizedImageUrl } from '@/lib/image';

type AppImageProps = ImageProps;

export default function AppImage(props: AppImageProps) {
  const { src, width, unoptimized, ...rest } = props;

  const srcStr = typeof src === 'string' ? src : null;
  const bypass = unoptimized ?? (srcStr ? shouldBypassImageOptimization(srcStr) : false);

  // For Supabase Storage URLs: request a pre-resized version from Supabase's
  // image transform CDN instead of the full-resolution original. This means
  // Vercel's optimizer fetches a small file, making the first-load much faster.
  // We use the explicit `width` prop when provided; otherwise default to 1200
  // (covers fill-mode images like hero shots and large carousels).
  const optimizedSrc =
    !bypass && srcStr
      ? getOptimizedImageUrl(srcStr, typeof width === 'number' ? width : 1200)
      : src;

  return (
    <Image
      src={optimizedSrc ?? src}
      width={width}
      unoptimized={bypass}
      {...rest}
    />
  );
}
