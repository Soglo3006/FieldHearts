"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type HelpFaqItem = {
  question: string;
  answer: string;
};

export function HelpFaq({ items }: { items: HelpFaqItem[] }) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());

  const toggle = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="divide-y divide-gray-200 border-t border-gray-200">
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index);

        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={isOpen ? "true" : "false"}
              suppressHydrationWarning
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-sm font-medium text-gray-900 sm:text-base">{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ease-in-out",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p
                  className={cn(
                    "pb-5 text-sm leading-relaxed text-gray-600 transition-opacity duration-300 ease-in-out",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
