import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { TransactionsPage } from './TransactionsPage';

export const AddPage: React.FC = () => {
  return <TransactionsPage />;
};

export const PlanPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-ink-10">
        <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          {t('nav.plan')}
        </h1>
        <p className="text-sm text-ink/70 mt-1">Budget and envelope planning stub</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plan Stub</CardTitle>
          <Badge variant="sand">Feature Stub</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink/80">
            Feature screens are disabled in Phase 1 per design system requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const InvestPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-ink-10">
        <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          {t('nav.invest')}
        </h1>
        <p className="text-sm text-ink/70 mt-1">Goal-based savings & investment guidance stub</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invest Stub</CardTitle>
          <Badge variant="sand">Feature Stub</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink/80">
            Feature screens are disabled in Phase 1 per design system requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const MorePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-ink-10">
        <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          {t('nav.more')}
        </h1>
        <p className="text-sm text-ink/70 mt-1">Settings, profile, and system tools stub</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>More Stub</CardTitle>
          <Badge variant="sand">Feature Stub</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink/80">
            Feature screens are disabled in Phase 1 per design system requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
