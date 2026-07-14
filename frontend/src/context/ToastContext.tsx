"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  isExiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const DURATION = 4000;
const MAX = 5;

const iconMap = {
  success: <CheckCircle size={18} className="shrink-0" />,
  error: <AlertCircle size={18} className="shrink-0" />,
  warning: <AlertTriangle size={18} className="shrink-0" />,
  info: <Info size={18} className="shrink-0" />,
};

const colorMap = {
  success: {
    bg: "bg-emerald-50/95 dark:bg-emerald-950/90",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    bg: "bg-rose-50/95 dark:bg-rose-950/90",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    bg: "bg-amber-50/95 dark:bg-amber-950/90",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "bg-brand-50/95 dark:bg-brand-950/90",
    border: "border-brand-200 dark:border-brand-800",
    text: "text-brand-900 dark:text-brand-300",
    icon: "text-brand-600 dark:text-brand-400",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, isExiting: false }];
      return next.length > MAX ? next.slice(next.length - MAX) : next;
    });

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, DURATION);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => {
          const colors = colorMap[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl p-4 shadow-xl border backdrop-blur-md w-full overflow-hidden transform transition-all duration-300 ${
                t.isExiting
                  ? "opacity-0 translate-x-full scale-95"
                  : "opacity-100 translate-x-0 scale-100 animate-slideInRight"
              } ${colors.bg} ${colors.border} ${colors.text}`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={colors.icon}>
                  {iconMap[t.type]}
                </div>
                <span className="text-sm font-medium leading-relaxed pt-0.5">{t.message}</span>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className={`shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200 ${colors.icon}`}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
