import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';
import { usePWA } from '../context/PWAContext';
import {
  Briefcase,
  Home,
  GraduationCap,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface DemoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSuccess?: () => void;
}

export const DemoPickerModal: React.FC<DemoPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSuccess,
}) => {
  const { t } = useTranslation();
  const { startDemo } = useAuth();
  const { setMode, refreshData } = useApp();
  const { triggerFirstActionSuccess } = usePWA();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const personas = [
    {
      id: 'rohan' as const,
      mode: 'earner' as const,
      nameKey: 'demo.rohan.name',
      roleKey: 'demo.rohan.role',
      ageKey: 'demo.rohan.age',
      incomeKey: 'demo.rohan.income',
      bioKey: 'demo.rohan.bio',
      icon: Briefcase,
      color: 'bg-ink text-paper',
      accentColor: 'border-ink',
      highlight: 'Bike EMI • PG Rent • Goa SIP',
    },
    {
      id: 'meena' as const,
      mode: 'household' as const,
      nameKey: 'demo.meena.name',
      roleKey: 'demo.meena.role',
      ageKey: 'demo.meena.age',
      incomeKey: 'demo.meena.income',
      bioKey: 'demo.meena.bio',
      icon: Home,
      color: 'bg-sand text-ink-dark',
      accentColor: 'border-sand-dark',
      highlight: 'Kirana Ration • School Fee • Chit Fund',
    },
    {
      id: 'aarav' as const,
      mode: 'student' as const,
      nameKey: 'demo.aarav.name',
      roleKey: 'demo.aarav.role',
      ageKey: 'demo.aarav.age',
      incomeKey: 'demo.aarav.income',
      bioKey: 'demo.aarav.bio',
      icon: GraduationCap,
      color: 'bg-sky text-ink-dark',
      accentColor: 'border-sky-dark',
      highlight: 'Hostel Mess • 5G Pack • Laptop Goal',
    },
  ];

  const handleSelectPersona = async (personaId: 'rohan' | 'meena' | 'aarav', mode: 'earner' | 'household' | 'student') => {
    setMode(mode);
    await startDemo(personaId);
    await refreshData();
    triggerFirstActionSuccess('select_demo_persona');
    onClose();
    if (onSelectSuccess) {
      onSelectSuccess();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-dark/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-paper rounded-card border-2 border-ink/20 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-ink/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="awning" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                100% Offline Demo
              </Badge>
            </div>
            <h2 id="demo-picker-title" className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
              {t('demo.title')}
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 mt-1 max-w-lg">
              {t('demo.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target p-2 rounded-btn hover:bg-ink/10 text-ink/60 hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Persona Cards */}
        <div className="mt-6 space-y-4">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => handleSelectPersona(persona.id, persona.mode)}
                className={`w-full text-left p-4 sm:p-5 rounded-card border-2 border-ink/15 hover:${persona.accentColor} hover:shadow-md bg-paper/80 hover:bg-paper transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${persona.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-fraunces text-lg font-bold text-ink">
                        {t(persona.nameKey)}
                      </h3>
                      <Badge variant="sand" size="sm">
                        {t(persona.roleKey)}
                      </Badge>
                      <span className="text-xs font-medium text-ink/60">
                        ({t(persona.ageKey)})
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-ink/80 mt-1 leading-relaxed">
                      {t(persona.bioKey)}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-accent">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{persona.highlight}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-ink/10 shrink-0">
                  <div className="text-sm font-bold text-ink bg-sand/30 px-2.5 py-1 rounded-md border border-sand/60">
                    {t(persona.incomeKey)}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-ink group-hover:text-accent transition-colors sm:mt-2">
                    <span>{t('demo.choose_persona')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Offline banner footer */}
        <div className="mt-6 pt-4 border-t border-ink/10 flex items-center justify-between text-xs text-ink/60">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-ink/80" />
            <span>Works with Airplane Mode ON. Seeds ~60 days of real ledger entries.</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Mid-month October 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
