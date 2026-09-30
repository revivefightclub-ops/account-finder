"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-surface min-w-[300px] ${
                toast.type === "success"
                  ? "border-[#006c49]/30"
                  : toast.type === "error"
                  ? "border-error/30"
                  : toast.type === "warning"
                  ? "border-[#885500]/30"
                  : "border-primary/30"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#006c49]" />}
              {toast.type === "error" && <XCircle className="w-5 h-5 text-error" />}
              {toast.type === "warning" && <AlertCircle className="w-5 h-5 text-[#885500]" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-primary" />}
              <span className="text-on-surface font-body-md flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
