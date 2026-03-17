import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Canadian dollars: 45.00 $ */
export function formatCAD(amount: number): string {
  return `${amount.toFixed(2)} $`;
}
