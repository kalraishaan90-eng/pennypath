import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle } from 'lucide-react';

export const NetworkOfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-ink text-paper text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 border-b border-ink-dark transition-all duration-300 animate-in fade-in"
      >
        <CheckCircle className="w-3.5 h-3.5 text-sky" />
        <span>Back online. All services synchronized.</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-accent text-paper text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-xs transition-all duration-300 animate-in slide-in-from-top-2"
    >
      <WifiOff className="w-3.5 h-3.5 text-sand shrink-0" />
      <span>
        <strong>Offline Mode:</strong> Demo Mode & local storage are 100% functional.
      </span>
    </div>
  );
};
