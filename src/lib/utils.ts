import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeText(s: string) {
  return s
    .replace(/\r/g, '')
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
