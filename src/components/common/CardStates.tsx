import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

interface CardStateProps {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export const CardLoadingState: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`p-4 animate-pulse space-y-3 ${className}`} aria-label="Loading card content">
      <div className="h-4 bg-ink/10 rounded w-1/3"></div>
      <div className="h-8 bg-ink/10 rounded w-2/3"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-ink/10 rounded w-full"></div>
      ))}
    </div>
  );
};

export const CardErrorState: React.FC<CardStateProps> = ({ onRetry, message, className = '' }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`p-4 bg-accent/5 border border-accent/20 rounded-card text-center flex flex-col items-center justify-center space-y-2 text-ink ${className}`}
      role="alert"
    >
      <AlertCircle className="w-6 h-6 text-accent" />
      <p className="text-xs sm:text-sm font-medium text-accent">
        {message || t('common.error')}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent bg-paper border border-accent/30 rounded-btn hover:bg-accent/10 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
};

export const CardEmptyState: React.FC<CardStateProps> = ({ message, className = '' }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`p-6 text-center flex flex-col items-center justify-center space-y-2 text-ink/60 border border-dashed border-ink/20 rounded-card ${className}`}
    >
      <Inbox className="w-7 h-7 text-ink/40" />
      <p className="text-xs sm:text-sm font-medium">
        {message || t('common.empty')}
      </p>
    </div>
  );
};
