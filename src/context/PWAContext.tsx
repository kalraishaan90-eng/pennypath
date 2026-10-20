import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  canInstall: boolean;
  isInstalled: boolean;
  showInstallBanner: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstallBanner: () => void;
  triggerFirstActionSuccess: (actionName?: string) => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

const FIRST_ACTION_KEY = 'pennypath_first_action_done';
const INSTALL_DISMISSED_KEY = 'pennypath_install_dismissed';

export const PWAProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone display mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);

      // Check if user has already performed a successful action and not previously dismissed
      const actionDone = sessionStorage.getItem(FIRST_ACTION_KEY) === 'true';
      const dismissed = sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
      if (actionDone && !dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerFirstActionSuccess = useCallback((_actionName?: string) => {
    sessionStorage.setItem(FIRST_ACTION_KEY, 'true');
    const dismissed = sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';

    // Show install prompt only if installable, not yet installed, and not dismissed
    if (canInstall && !isInstalled && !dismissed) {
      setShowInstallBanner(true);
    }
  }, [canInstall, isInstalled]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // In desktop testing or browsers without deferred prompt, still dismiss gracefully
      setShowInstallBanner(false);
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
    setShowInstallBanner(false);
    return false;
  }, [deferredPrompt]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
  }, []);

  return (
    <PWAContext.Provider
      value={{
        canInstall,
        isInstalled,
        showInstallBanner,
        promptInstall,
        dismissInstallBanner,
        triggerFirstActionSuccess,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
