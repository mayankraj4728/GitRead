"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, AlertCircle, Info } from "lucide-react";
import { useToast, type Toast } from "@/stores/toast";
import { cn } from "@/lib/utils";

const ICONS = {
  success: Check,
  error: AlertCircle,
  info: Info,
  default: Info,
} as const;

const ACCENT = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
  default: "text-muted-foreground",
} as const;

/** Bottom-center stacked toast notifications. */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    if (toast.duration <= 0) return;
    const id = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(id);
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg"
    >
      <Icon className={cn("size-4 shrink-0", ACCENT[toast.variant])} />
      <span className="min-w-0 flex-1 text-sm">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 text-sm font-medium text-accent hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
