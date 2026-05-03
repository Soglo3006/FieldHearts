"use client";

import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PostSelectOption {
  value: string;
  label: string;
}

interface PostSelectProps {
  value: string;
  placeholder: string;
  options: PostSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  /** Passed to the trigger button for screen readers */
  ariaLabel?: string;
  /** Show an action to reset to placeholder (optional fields only). */
  allowClear?: boolean;
  /** Overrides default i18n label for the clear action */
  clearLabel?: string;
}

export default function PostSelect({
  value,
  placeholder,
  options,
  onValueChange,
  disabled = false,
  className,
  contentClassName,
  ariaLabel,
  allowClear = false,
  clearLabel,
}: PostSelectProps) {
  const { t } = useTranslation();
  const resolvedClearLabel = clearLabel ?? t("post.selectClearChoice");
  const selectedOption = options.find((option) => option.value === value);
  const showClear = allowClear && value !== "";
  const triggerWidthStyle = {
    width: "var(--radix-dropdown-menu-trigger-width)",
    minWidth: "var(--radix-dropdown-menu-trigger-width)",
  } as const;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className
          )}
        >
          <span className={cn("truncate text-left", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>

      {!disabled && (
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          style={triggerWidthStyle}
          className={contentClassName}
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {showClear && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-muted-foreground focus:text-muted-foreground"
                onSelect={() => onValueChange("")}
              >
                {resolvedClearLabel}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}