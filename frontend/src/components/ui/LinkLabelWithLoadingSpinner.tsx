import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LinkLabelWithLoadingSpinner({
  label,
  loading,
  spinnerClassName = "h-4 w-4",
}: {
  label: string;
  loading: boolean;
  spinnerClassName?: string;
}) {
  return (
    <span className="relative inline-grid place-items-center">
      <span
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 ease-out",
          loading ? "opacity-0" : "opacity-100",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-200 ease-out",
          loading ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Loader2 className={cn("animate-spin", spinnerClassName)} />
      </span>
    </span>
  );
}
