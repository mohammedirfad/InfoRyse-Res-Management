import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupees(cents: number) {
  return `₹${(cents / 100).toFixed(0)}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format order ID as readable string: e.g. #KPE0042
 * Takes 3 uppercase letters from the restaurant name + zero-padded order number.
 */
export function formatOrderId(restaurantName: string, orderNumber: number): string {
  const prefix = (restaurantName || "ORD")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  return `#${prefix}${String(orderNumber).padStart(4, "0")}`;
}
