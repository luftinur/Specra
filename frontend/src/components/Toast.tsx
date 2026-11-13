import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const config = {
    success: {
      border: 'border-ok/40',
      iconColor: 'text-ok',
      bgGlow: 'bg-ok/5',
      Icon: CheckCircle2,
    },
    error: {
      border: 'border-err/40',
      iconColor: 'text-err',
      bgGlow: 'bg-err/5',
      Icon: AlertTriangle,
    },
    warn: {
      border: 'border-warn/40',
      iconColor: 'text-warn',
      bgGlow: 'bg-warn/5',
      Icon: AlertTriangle,
    },
    info: {
      border: 'border-primary/40',
      iconColor: 'text-primary',
      bgGlow: 'bg-primary/5',
      Icon: Info,
    },
  }[toast.type];

  const IconComponent = config.Icon;

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-xl border bg-surface/95 ${config.border} ${config.bgGlow} shadow-xl backdrop-blur-md flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
      role="alert"
    >
      <IconComponent className={`size-4.5 shrink-0 mt-0.5 ${config.iconColor}`} />
      
      <div className="flex-1 min-w-0 pr-1">
        <h5 className="font-semibold text-xs text-fg leading-snug">
          {toast.title}
        </h5>
        {toast.message && (
          <p className="text-[11px] text-muted leading-relaxed mt-0.5 break-words">
            {toast.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md text-muted hover:text-fg hover:bg-fill transition-colors -mr-1 -mt-1 cursor-pointer"
        title="Tutup pemberitahuan"
      >
        <X size={13} />
      </button>
    </div>
  );
};
