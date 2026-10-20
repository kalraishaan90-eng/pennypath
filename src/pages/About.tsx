import React from 'react';
import { useTranslation } from 'react-i18next';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pt-8">
      {/* Problem Statement Section */}
      <section className="border-b border-ink/10 pb-6 mb-6">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          {t('about.problem')}
        </h2>
        <p className="text-ink/70 leading-relaxed">
          {t('about.problemDescription')}
        </p>
      </section>

      {/* Team Section */}
      <section className="border-b border-ink/10 pb-6 mb-6">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          {t('about.team')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Team Member 1 */}
          <div className="p-4 rounded-card border border-ink/15 text-center">
            <div className="w-16 h-16 rounded-full bg-ink text-paper font-fraunces text-xl font-bold flex items-center justify-center mx-auto mb-2">
              IH
            </div>
            <h3 className="font-medium text-ink">{t('about.teamMember1')}</h3>
            <p className="text-xs text-ink/60">{t('about.role1')}</p>
          </div>
          {/* Team Member 2 */}
          <div className="p-4 rounded-card border border-ink/15 text-center">
            <div className="w-16 h-16 rounded-full bg-ink text-paper font-fraunces text-xl font-bold flex items-center justify-center mx-auto mb-2">
              TP
            </div>
            <h3 className="font-medium text-ink">{t('about.teamMember2')}</h3>
            <p className="text-xs text-ink/60">{t('about.role2')}</p>
          </div>
          {/* Team Member 3 */}
          <div className="p-4 rounded-card border border-ink/15 text-center">
            <div className="w-16 h-16 rounded-full bg-ink text-paper font-fraunces text-xl font-bold flex items-center justify-center mx-auto mb-2">
              JK
            </div>
            <h3 className="font-medium text-ink">{t('about.teamMember3')}</h3>
            <p className="text-xs text-ink/60">{t('about.role3')}</p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="border-b border-ink/10 pb-6 mb-6">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          {t('about.vision')}
        </h2>
        <p className="text-ink/70 leading-relaxed">
          {t('about.visionDescription')}
        </p>
      </section>

      {/* Contact Section */}
      <section className="pt-6">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
          {t('about.contact')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-card border border-ink/15">
            <div className="text-3x text-accent mb-2">
              📧
            </div>
            <p className="font-medium text-ink">{t('about.email')}</p>
            <p className="text-xs text-ink/60 capitalize">{t('about.email2')}</p>
          </div>
          <div className="p-4 rounded-card border border-ink/15">
            <div className="text-3x text-accent mb-2">
              📱
            </div>
            <p className="font-medium text-ink">{t('about.phone')}</p>
            <p className="text-xs text-ink/60 capitalize">{t('about.phone2')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};