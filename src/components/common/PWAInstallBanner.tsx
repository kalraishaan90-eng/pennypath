import React from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';
import { Button } from '../../ui/Button';

export const PWAInstallBanner: React.FC = () => {
  const { showInstallBanner, promptInstall, dismissInstallBanner } = usePWA();

  if (!showInstallBanner) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-paper border-2 border-ink shadow-2xl rounded-card p-4 transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink text-paper font-fraunces text-xl font-bold flex items-center justify-center shrink-0 shadow-xs">
          ₹
        </div>

        <div className="flex-1 min-w-0">
          <h3 id="pwa-install-title" className="font-fraunces font-bold text-ink text-sm sm:text-base leading-tight">
            Install Pennypath
          </h3>
          <p id="pwa-install-desc" className="text-xs text-ink/75 mt-0.5 leading-relaxed">
            Add to home screen for 1-tap expense logging and 100% offline access.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={promptInstall}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Install App
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={dismissInstallBanner}
            >
              Maybe Later
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissInstallBanner}
          className="text-ink/50 hover:text-ink p-1 rounded touch-target shrink-0"
          aria-label="Dismiss installation prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
