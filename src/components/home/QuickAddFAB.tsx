import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

interface QuickAddFABProps {
  onClick: () => void;
}

export const QuickAddFAB: React.FC<QuickAddFABProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 touch-target w-14 h-14 rounded-full bg-accent hover:bg-accent-dark text-paper shadow-lg hover:shadow-xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-accent/40"
      aria-label={t('fab.title')}
      title={t('fab.title')}
    >
      <Plus className="w-7 h-7 stroke-[2.5]" />
    </button>
  );
};
