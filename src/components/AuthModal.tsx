import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  Mail,
  X,
  Sparkles,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onOpenDemo?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onOpenDemo,
}) => {
  const { t } = useTranslation();
  const { signInWithMagicLink, signInWithGoogle, signInAsGuest } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithMagicLink(trimmed);
      if (result.success) {
        setSuccessMsg(result.message || t('auth.magic_link_sent'));
        setTimeout(() => {
          onClose();
          if (onAuthSuccess) onAuthSuccess();
        }, 1500);
      } else {
        setErrorMsg(result.error || 'Failed to send magic link.');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      } else if (result.error) {
        setErrorMsg(result.error);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBypass = () => {
    signInAsGuest();
    onClose();
    if (onAuthSuccess) onAuthSuccess();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-dark/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-paper rounded-card border-2 border-ink/20 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Awning Accent Top Stripe */}
        <div className="awning-stripe-banner absolute top-0 left-0 right-0 h-2" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="touch-target absolute top-4 right-4 p-2 rounded-btn hover:bg-ink/10 text-ink/60 hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center pt-2 pb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-ink text-paper font-fraunces text-2xl font-bold flex items-center justify-center shadow-md mb-3">
            ₹
          </div>
          <h2 id="auth-modal-title" className="font-fraunces text-2xl font-bold text-ink">
            {t('auth.title')}
          </h2>
          <p className="text-xs sm:text-sm text-ink/70 mt-1">
            {t('auth.subtitle')}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-btn bg-accent/10 border border-accent text-accent text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-btn bg-sky/20 border border-ink text-ink text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-ink" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form: Magic Link */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-bold text-ink mb-1">
              {t('auth.email_label')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-btn bg-paper border border-ink/30 focus:border-ink focus:ring-1 focus:ring-ink text-sm text-ink placeholder:text-ink/40 transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            className="py-2.5 font-bold"
          >
            {t('auth.magic_link_btn')}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold text-ink/50">
            <span className="bg-paper px-2">{t('auth.or')}</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="touch-target w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-btn border border-ink/30 bg-paper hover:bg-sand/20 active:bg-sand/40 text-ink text-sm font-semibold transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{t('auth.google_btn')}</span>
        </button>

        {/* Guest Bypass Option */}
        <div className="mt-4 pt-4 border-t border-ink/15 text-center space-y-2">
          <button
            type="button"
            onClick={handleGuestBypass}
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn bg-sand/30 hover:bg-sand/50 text-ink text-xs font-bold transition-colors border border-sand-dark/40"
          >
            <UserCheck className="w-4 h-4 text-ink" />
            <span>{t('auth.guest_bypass')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <p className="text-[11px] text-ink/60">
            {t('auth.guest_note')}
          </p>

          {onOpenDemo && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDemo();
              }}
              className="touch-target text-xs font-semibold text-accent hover:text-accent-dark underline inline-flex items-center gap-1 mt-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('auth.demo_shortcut')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
