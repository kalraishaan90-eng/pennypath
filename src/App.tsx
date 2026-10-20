import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useApp } from './context/AppContext';
import { usePitch } from './context/PitchContext';
import { LandingPage } from './components/LandingPage';
import { DemoChip } from './components/DemoChip';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/Home';
import { ScreenLoadingSkeleton } from './components/common/ScreenLoadingSkeleton';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { AboutPage } from './pages/About';
import { HealthPage } from './pages/HealthPage';
// Lazy-load secondary feature modals, screens, and charts
const AuthModal = React.lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const DemoPickerModal = React.lazy(() =>
  import('./components/DemoPickerModal').then((m) => ({ default: m.DemoPickerModal }))
);
const OnboardingWizard = React.lazy(() =>
  import('./components/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard }))
);
const AddPage = React.lazy(() =>
  import('./pages/Stubs').then((m) => ({ default: m.AddPage }))
);
const DemoGuidePanel = React.lazy(() =>
  import('./components/pitch/DemoGuidePanel').then((m) => ({ default: m.DemoGuidePanel }))
);
const BudgetScreen = React.lazy(() =>
  import('./components/BudgetScreen').then((m) => ({ default: m.BudgetScreen }))
);
const GoalsScreen = React.lazy(() =>
  import('./components/GoalsScreen').then((m) => ({ default: m.GoalsScreen }))
);
const CalculatorsScreen = React.lazy(() =>
  import('./components/CalculatorsScreen').then((m) => ({ default: m.CalculatorsScreen }))
);
const InvestLabScreen = React.lazy(() =>
  import('./components/InvestLabScreen').then((m) => ({ default: m.InvestLabScreen }))
);
const MicroLessonsScreen = React.lazy(() =>
  import('./components/MicroLessonsScreen').then((m) => ({ default: m.MicroLessonsScreen }))
);
const RemindersScreen = React.lazy(() =>
  import('./components/RemindersScreen').then((m) => ({ default: m.RemindersScreen }))
);
const InsightsScreen = React.lazy(() =>
  import('./components/insights/InsightsScreen').then((m) => ({ default: m.InsightsScreen }))
);
const DesignShowcase = React.lazy(() =>
  import('./pages/DesignShowcase').then((m) => ({ default: m.DesignShowcase }))
);
export const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isOnboarded, isDemo, startDemo } = useAuth();
  const { refreshData } = useApp();
  const { isPitchMode, setIsPitchMode } = usePitch();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // If visiting /pitch directly, ensure pitch mode and demo are activated
  useEffect(() => {
    if (location.pathname === '/pitch') {
      setIsPitchMode(true);
      if (!isDemo) {
        startDemo('rohan').then(() => refreshData());
      }
    }
  }, [location.pathname, isDemo, setIsPitchMode, startDemo, refreshData]);

  // Route /health is accessible regardless of authentication or demo status
  if (location.pathname === '/health') {
    return (
      <React.Suspense fallback={<ScreenLoadingSkeleton />}>
        <HealthPage />
      </React.Suspense>
    );
  }

  // Route /about is always accessible
  if (location.pathname === '/about') {
    return (
      <React.Suspense fallback={<ScreenLoadingSkeleton />}>
        <AboutPage />
      </React.Suspense>
    );
  }

  // If in onboarding wizard flow (and not in pitch mode)
  if (
    !isPitchMode &&
    location.pathname !== '/pitch' &&
    location.pathname !== '/about' &&
    (showOnboarding || (isAuthenticated && !isOnboarded && !isDemo))
  ) {
    return (
      <div className="min-h-screen bg-paper text-ink p-4 sm:p-6 flex flex-col justify-center">
        <React.Suspense fallback={<ScreenLoadingSkeleton />}>
          <OnboardingWizard
            onComplete={async () => {
              setShowOnboarding(false);
              await refreshData();
            }}
            onCancel={() => {
              setShowOnboarding(false);
            }}
          />
        </React.Suspense>
        <PWAInstallBanner />
      </div>
    );
  }

  // If user is not yet logged in / authenticated and not in demo (and not in pitch mode)
  if (
    !isAuthenticated &&
    !isDemo &&
    !isOnboarded &&
    !isPitchMode &&
    location.pathname !== '/pitch' &&
    location.pathname !== '/about'
  ) {
    return (
      <>
        <LandingPage
          onGetStarted={() => setShowAuthModal(true)}
          onTryDemo={() => setShowDemoPicker(true)}
        />

        <React.Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={() => {
              setShowAuthModal(false);
              setShowOnboarding(true);
            }}
            onOpenDemo={() => {
              setShowAuthModal(false);
              setShowDemoPicker(true);
            }}
          />

          <DemoPickerModal
            isOpen={showDemoPicker}
            onClose={() => setShowDemoPicker(false)}
            onSelectSuccess={async () => {
              setShowDemoPicker(false);
              await refreshData();
            }}
          />
        </React.Suspense>

        <PWAInstallBanner />
      </>
    );
  }

  // Authenticated, Demo Active, or Pitch Mode Active: Render Main Application Shell
  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <React.Suspense fallback={<ScreenLoadingSkeleton />}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route
              index
              element={
                <HomePage
                  onStartOnboarding={() => setShowOnboarding(true)}
                  onOpenDemo={() => setShowDemoPicker(true)}
                />
              }
            />
            <Route
              path="pitch"
              element={
                <HomePage
                  onStartOnboarding={() => setShowOnboarding(true)}
                  onOpenDemo={() => setShowDemoPicker(true)}
                />
              }
            />
            <Route path="plan" element={<BudgetScreen />} />
            <Route path="reminders" element={<RemindersScreen />} />
            <Route path="insights" element={<InsightsScreen />} />
            <Route path="add" element={<AddPage />} />
            <Route path="invest" element={<InvestLabScreen />} />
            <Route path="more" element={<GoalsScreen />} />
            <Route path="calculators" element={<CalculatorsScreen />} />
            <Route path="lessons" element={<MicroLessonsScreen />} />
            <Route path="design" element={<DesignShowcase />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*"
              element={<Navigate to="/" replace />}
            />
          </Route>
        </Routes>
      </React.Suspense>

      {/* Floating Demo Guide Panel for 5-Minute Pitch Mode */}
      <React.Suspense fallback={null}>
        <DemoGuidePanel />
      </React.Suspense>

      {/* Persistent Demo Mode Chip (hidden automatically in Big-Screen mode) */}
      <DemoChip />

      {/* PWA Install Banner (only appears after first successful user action) */}
      <PWAInstallBanner />

      {/* Modals accessible from inside the app if needed */}
      <DemoPickerModal
        isOpen={showDemoPicker}
        onClose={() => setShowDemoPicker(false)}
        onSelectSuccess={async () => {
          setShowDemoPicker(false);
          await refreshData();
        }}
      />
    </div>
  );
};