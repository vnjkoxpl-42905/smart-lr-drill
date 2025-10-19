import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeText(s: string) {
  return s
    .replace(/\r/g, '')
    .replace(/\n([A-Z][a-z]+):/g, '\n\n$1:')  // Preserve speaker breaks
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
    .replace(/\n{3,}/g, '\n\n')  // Collapse 3+ newlines to 2
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
