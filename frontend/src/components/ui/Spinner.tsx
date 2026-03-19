import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4 border-2",
  sm: "w-6 h-6 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-10 h-10 border-4",
  xl: "w-12 h-12 border-4",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-green-700 border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}

/** Full-page centered loading screen */
export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="xl" />
    </div>
  );
}

/** Centered in a flex container (no min-h-screen) */
export function InlineSpinner({ size = "lg" }: { size?: SpinnerProps["size"] }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Spinner size={size} />
    </div>
  );
}
