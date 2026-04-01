import Image, { type ImageProps } from 'next/image';
import { shouldBypassImageOptimization } from '@/lib/image';

type AppImageProps = ImageProps;

export default function AppImage(props: AppImageProps) {
  const { src, unoptimized, ...rest } = props;

  return (
    <Image
      src={src}
      unoptimized={unoptimized ?? (typeof src === 'string' ? shouldBypassImageOptimization(src) : false)}
      {...rest}
    />
  );
}