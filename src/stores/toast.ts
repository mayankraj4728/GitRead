"use client";

import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  /** Optional action button. */
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: ({ message, variant = "default", action, duration = 4000 }) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, action, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helpers so non-React code (fetch handlers) can toast. */
export const toast = {
  success: (message: string, action?: Toast["action"]) =>
    useToast.getState().push({ message, variant: "success", action }),
  error: (message: string, action?: Toast["action"]) =>
    useToast.getState().push({ message, variant: "error", action }),
  info: (message: string, action?: Toast["action"]) =>
    useToast.getState().push({ message, variant: "info", action }),
  show: (message: string, action?: Toast["action"]) =>
    useToast.getState().push({ message, variant: "default", action }),
};
