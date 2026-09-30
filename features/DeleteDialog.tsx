"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDialog({ isOpen, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-on-background/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-surface w-full max-w-[400px] rounded-xl shadow-xl border border-outline-variant/50 overflow-hidden relative z-10"
          >
            <div className="p-6">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-2">Delete this account?</h3>
              <p className="text-on-surface-variant font-body-md">
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
