import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './auth/AuthContext';
import { PitchProvider } from './context/PitchContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './ui/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppContent } from './App';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import './i18n';

// Register PWA Service Worker for offline app shell and demo caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Pennypath update available');
  },
  onOfflineReady() {
    console.log('Pennypath ready to work offline in airplane/offline mode');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <PitchProvider>
              <PWAProvider>
                <ToastProvider>
                  <AppContent />
                </ToastProvider>
              </PWAProvider>
            </PitchProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
