import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  return (
    <div
      id="error-banner-container"
      className="p-4 bg-[#FDF2F2] border border-[#F87171] text-[#1A1A1A] flex items-center justify-between gap-3 mb-5 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white border border-[#F87171] flex items-center justify-center text-[#DC2626] shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-sans uppercase tracking-wider font-bold text-[#991B1B]">Persistence Notice</h4>
          <p className="text-xs font-serif text-[#7F1D1D] leading-snug mt-0.5">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            id="btn-retry-save"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans uppercase tracking-wider bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Retrying..." : "Retry Save"}</span>
          </button>
        )}
        <button
          id="btn-dismiss-error"
          onClick={onDismiss}
          className="p-1 text-[#991B1B] hover:text-[#1A1A1A] transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
