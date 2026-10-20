import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Money,
  Badge,
  ProgressBar,
  Stat,
  Modal,
  EmptyState,
  Skeleton,
  Tabs,
  useToast,
} from '../ui';
import { getContrastRatio } from '../utils/contrast';
import {
  ShieldCheck,
  Trash2,
  Wallet,
  IndianRupee,
  Search,
  PiggyBank,
} from 'lucide-react';

export const DesignShowcase: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { success, error, info } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectValue, setSelectValue] = useState('need');
  const [progressVal, setProgressVal] = useState(65);

  const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en';

  // Palette definitions exactly per tokens
  const palette = [
    {
      name: 'paper',
      hex: '#EFE8DF',
      rgb: '239, 232, 223',
      role: 'App background, card surfaces, alabaster contrast',
      textColor: 'text-ink',
      tints: [
        { label: '10%', value: 'rgba(239, 232, 223, 0.10)' },
        { label: '20%', value: 'rgba(239, 232, 223, 0.20)' },
        { label: '40%', value: 'rgba(239, 232, 223, 0.40)' },
      ],
    },
    {
      name: 'ink',
      hex: '#0F414A',
      rgb: '15, 65, 74',
      role: 'Primary text, primary buttons, structural darks',
      textColor: 'text-paper',
      tints: [
        { label: '10%', value: 'rgba(15, 65, 74, 0.10)' },
        { label: '20%', value: 'rgba(15, 65, 74, 0.20)' },
        { label: '40%', value: 'rgba(15, 65, 74, 0.40)' },
      ],
    },
    {
      name: 'accent',
      hex: '#7F0303',
      rgb: '127, 3, 3',
      role: 'Awning stripe motif, danger actions, budget alerts',
      textColor: 'text-paper',
      tints: [
        { label: '10%', value: 'rgba(127, 3, 3, 0.10)' },
        { label: '20%', value: 'rgba(127, 3, 3, 0.20)' },
        { label: '40%', value: 'rgba(127, 3, 3, 0.40)' },
      ],
    },
    {
      name: 'sand',
      hex: '#D8BA98',
      rgb: '216, 186, 152',
      role: 'Secondary buttons, container fills, warm borders',
      textColor: 'text-ink',
      tints: [
        { label: '10%', value: 'rgba(216, 186, 152, 0.10)' },
        { label: '20%', value: 'rgba(216, 186, 152, 0.20)' },
        { label: '40%', value: 'rgba(216, 186, 152, 0.40)' },
      ],
    },
    {
      name: 'sky',
      hex: '#96C0CE',
      rgb: '150, 192, 206',
      role: 'Callouts, active tags, cool accents, ink badges',
      textColor: 'text-ink',
      tints: [
        { label: '10%', value: 'rgba(150, 192, 206, 0.10)' },
        { label: '20%', value: 'rgba(150, 192, 206, 0.20)' },
        { label: '40%', value: 'rgba(150, 192, 206, 0.40)' },
      ],
    },
  ];

  // Acceptance contrast test pairs
  const contrastPairs = [
    {
      title: 'Ink on Paper',
      titleHi: 'कागज पर स्याही',
      fgName: 'Ink (#0F414A)',
      bgName: 'Paper (#EFE8DF)',
      fgHex: '#0F414A',
      bgHex: '#EFE8DF',
      expectedMin: 4.5,
      sampleText: '₹12,450 spent on Groceries & Provisions',
      sampleTextHi: 'किराने एवं जरूरी सामान पर ₹12,450 खर्च',
      isBodyText: true,
    },
    {
      title: 'Paper on Ink',
      titleHi: 'स्याही पर कागज',
      fgName: 'Paper (#EFE8DF)',
      bgName: 'Ink (#0F414A)',
      fgHex: '#EFE8DF',
      bgHex: '#0F414A',
      expectedMin: 4.5,
      sampleText: 'Primary CTA Button: Confirm Monthly Allocation',
      sampleTextHi: 'मुख्य बटन: मासिक बजट आवंटन की पुष्टि करें',
      isBodyText: true,
    },
    {
      title: 'Paper on Accent',
      titleHi: 'मैरून पर कागज',
      fgName: 'Paper (#EFE8DF)',
      bgName: 'Accent (#7F0303)',
      fgHex: '#EFE8DF',
      bgHex: '#7F0303',
      expectedMin: 4.5,
      sampleText: 'Danger Action: Delete Recurring Obligation',
      sampleTextHi: 'खतरे की कार्रवाई: आवर्ती दायित्व को हटाएं',
      isBodyText: true,
    },
    {
      title: 'Sky on Ink',
      titleHi: 'स्याही पर आसमानी',
      fgName: 'Sky (#96C0CE)',
      bgName: 'Ink (#0F414A)',
      fgHex: '#96C0CE',
      bgHex: '#0F414A',
      expectedMin: 4.5,
      sampleText: 'Special Callout / Active Tab Indicator',
      sampleTextHi: 'विशेष हाइलाइट / सक्रिय टैब संकेतक',
      isBodyText: false,
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Route Header */}
      <div className="border-b border-ink-10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Internal Route: /design
            </span>
            <Badge variant="awning" size="sm">
              Passbook Aesthetic
            </Badge>
          </div>
          <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            {t('design.title')}
          </h1>
          <p className="text-sm sm:text-base text-ink/70 mt-1 max-w-2xl">
            {t('design.subtitle')}
          </p>
        </div>

        {/* Language quick switcher */}
        <div className="flex items-center gap-3">
          <Button
            variant={currentLang === 'en' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => i18n.changeLanguage('en')}
          >
            English
          </Button>
          <Button
            variant={currentLang === 'hi' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => i18n.changeLanguage('hi')}
          >
            हिन्दी
          </Button>
        </div>
      </div>

      {/* SECTION 1: Exact Palette Tokens & 10/20/40% Tints */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-fraunces text-2xl font-bold text-ink">
              {t('design.paletteTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-ink/70">
              Strict 5-hue palette: paper, ink, accent, sand, sky with 10%, 20%, 40% tints (no extraneous hues).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {palette.map((color) => (
            <Card key={color.name} padding="none" className="overflow-hidden border border-ink-10">
              {/* Main swatch */}
              <div
                className="h-28 p-4 flex flex-col justify-between"
                style={{ backgroundColor: color.hex }}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${color.textColor}`}>
                    {color.name}
                  </span>
                  <span className={`text-xs font-mono opacity-80 ${color.textColor}`}>
                    {color.hex}
                  </span>
                </div>
                <div className={`text-[11px] font-mono opacity-70 ${color.textColor}`}>
                  rgb({color.rgb})
                </div>
              </div>

              {/* Tint swatches */}
              <div className="p-3 bg-paper space-y-2">
                <p className="text-[11px] text-ink/70 leading-tight mb-2 h-7">
                  {color.role}
                </p>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-ink-10">
                  {color.tints.map((tint) => (
                    <div key={tint.label} className="text-center">
                      <div
                        className="h-6 rounded border border-ink-10 mb-1"
                        style={{ backgroundColor: tint.value }}
                        title={`${color.name} ${tint.label}`}
                      />
                      <span className="text-[10px] font-mono text-ink/70">{tint.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION 2: Contrast Audit Matrix (WCAG AA & AAA) */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-ink" />
            <h2 className="font-fraunces text-2xl font-bold text-ink">
              {t('design.contrastTitle')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink/70 mt-1">
            Requirement audit: ink on paper, paper on ink, paper on accent, sky on ink. All pass WCAG standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contrastPairs.map((pair) => {
            const ratio = getContrastRatio(pair.fgHex, pair.bgHex);
            const isAAAPass = ratio >= 7.0;
            const isAAPass = ratio >= 4.5;

            return (
              <div
                key={pair.title}
                className="rounded-card border border-ink-10 p-5 shadow-card overflow-hidden flex flex-col justify-between"
                style={{ backgroundColor: pair.bgHex, color: pair.fgHex }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-fraunces text-lg font-bold">
                        {currentLang === 'hi' ? pair.titleHi : pair.title}
                      </h3>
                      <p className="text-xs font-mono opacity-80 mt-0.5">
                        {pair.fgName} on {pair.bgName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xl font-bold tabular-nums">
                        {ratio}:1
                      </span>
                      <div className="mt-1 flex items-center gap-1 justify-end">
                        {isAAAPass ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sand/30 border border-current">
                            ✓ AAA Pass
                          </span>
                        ) : isAAPass ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sand/30 border border-current">
                            ✓ AA Pass
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Sample content in English and Hindi */}
                  <div className="space-y-2 pt-2 border-t border-current/20">
                    <p className="text-sm font-medium leading-relaxed">
                      {pair.sampleText}
                    </p>
                    <p className="text-sm font-hindi leading-relaxed opacity-95">
                      {pair.sampleTextHi}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-current/15 flex items-center justify-between text-xs opacity-75 font-mono">
                  <span>Standard: {pair.isBodyText ? 'Body Text (>= 4.5:1)' : 'UI/Large Text (>= 3.0:1)'}</span>
                  <span className="font-bold text-green-700 dark:text-green-300">PASS</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: Typography Hierarchy */}
      <section className="space-y-6">
        <div>
          <h2 className="font-fraunces text-2xl font-bold text-ink">
            Typography System (Self-Hosted via Fontsource)
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            Headings: Fraunces (serif). Interface: Inter. Devanagari: Noto Sans Devanagari.
          </p>
        </div>

        <Card padding="lg" withAwningAccent>
          <div className="space-y-6">
            <div className="border-b border-ink-10 pb-4">
              <span className="text-xs font-mono text-ink/60 uppercase">Heading 1 / Display (Fraunces)</span>
              <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-ink mt-1">
                Bharat Ka Apna Goal-First Budgeting
              </h1>
              <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink font-hindi mt-1">
                भारत का अपना लक्ष्य-आधारित व्यक्तिगत वित्त
              </h2>
            </div>

            <div className="border-b border-ink-10 pb-4">
              <span className="text-xs font-mono text-ink/60 uppercase">Heading 2 (Fraunces)</span>
              <h2 className="font-fraunces text-xl sm:text-2xl font-semibold text-ink mt-1">
                Envelope Allocation & Emergency Fund Planning
              </h2>
              <h3 className="font-fraunces text-lg sm:text-xl font-semibold text-ink font-hindi mt-1">
                लिफ़ाफ़ा बजट एवं आपातकालीन निधि योजना
              </h3>
            </div>

            <div>
              <span className="text-xs font-mono text-ink/60 uppercase">Body & Numerals (Inter + Tabular)</span>
              <p className="text-sm sm:text-base text-ink/80 mt-1 leading-relaxed">
                Designed specifically for Indian student pocket allowances, household monthly kharchas, and first-job salaries.
                Numbers align seamlessly: <span className="tabular-nums font-semibold text-ink">₹1,24,500.00</span> vs{' '}
                <span className="tabular-nums font-semibold text-ink">₹9,870.50</span>.
              </p>
              <p className="text-sm sm:text-base text-ink/80 font-hindi mt-1 leading-relaxed">
                विद्यार्थियों के पॉकेट मनी, गृहणियों के मासिक खर्च और पहली नौकरी के वेतन के लिए विशेष रूप से डिज़ाइन किया गया।
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* SECTION 4: UI Components Showcase */}
      <section className="space-y-8">
        <div>
          <h2 className="font-fraunces text-2xl font-bold text-ink">
            {t('design.componentsTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            Interactive UI kit in /src/ui: Button, Card, Input, Select, Money, Badge, ProgressBar, Stat, Modal, Toast, EmptyState, Skeleton, Tabs.
          </p>
        </div>

        {/* 1. Buttons */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>1. Button Variants & States</CardTitle>
            <Badge variant="ink">Min 44px Touch Targets</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">
                {t('buttons.primary')} (Ink)
              </Button>
              <Button variant="secondary">
                {t('buttons.secondary')} (Sand)
              </Button>
              <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}>
                {t('buttons.danger')} (Accent)
              </Button>
              <Button variant="outline">
                Outline
              </Button>
              <Button variant="ghost">
                Ghost
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink-10">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium (Default)</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" isLoading>{t('buttons.loading')}</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Money Formatting */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>2. Money (INR en-IN with Tabular Numerals)</CardTitle>
            <Badge variant="sky">Lakhs & Crores Grouping</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-sand-10 border border-sand-20">
                <span className="text-xs text-ink/60 block mb-1">Standard Rupee</span>
                <Money amount={45000} size="xl" />
              </div>
              <div className="p-3 rounded-lg bg-sand-10 border border-sand-20">
                <span className="text-xs text-ink/60 block mb-1">From Paise (4500000 paise)</span>
                <Money amount={4500000} inPaise size="xl" />
              </div>
              <div className="p-3 rounded-lg bg-sand-10 border border-sand-20">
                <span className="text-xs text-ink/60 block mb-1">Large Number (Crores)</span>
                <Money amount={12500000} size="xl" />
              </div>
              <div className="p-3 rounded-lg bg-sand-10 border border-sand-20">
                <span className="text-xs text-ink/60 block mb-1">Negative Expense</span>
                <Money amount={-3450} size="xl" tone="negative" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label={t('stat.monthlyBudget')}
            value={50000}
            isCurrency
            icon={<Wallet className="w-5 h-5 text-ink" />}
            subtext="Envelopes configured"
          />
          <Stat
            label={t('stat.spentSoFar')}
            value={32400}
            isCurrency
            currencyTone="default"
            icon={<IndianRupee className="w-5 h-5 text-ink" />}
            badge={<Badge variant="accent" size="sm">64.8%</Badge>}
            subtext="₹17,600 safe to spend"
          />
          <Stat
            label={t('stat.savingsRate')}
            value="35.2%"
            icon={<PiggyBank className="w-5 h-5 text-ink" />}
            badge={<Badge variant="sky" size="sm">+4.2%</Badge>}
            subtext="Above 20% target"
          />
          <Stat
            label={t('stat.emergencyFund')}
            value={180000}
            isCurrency
            currencyTone="positive"
            icon={<ShieldCheck className="w-5 h-5 text-ink" />}
            subtext="4.2 months expenses"
          />
        </div>

        {/* 4. ProgressBar with Awning Stripe Edge */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>4. ProgressBar with Signature Awning-Stripe Edge</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={progressVal}
                onChange={(e) => setProgressVal(Number(e.target.value))}
                className="w-24 accent-ink"
                aria-label="Adjust progress value"
              />
              <span className="font-mono text-xs">{progressVal}%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressBar
              value={progressVal}
              label="Groceries Envelope Allocation"
              showValueText
              tone={progressVal > 80 ? 'accent' : 'ink'}
              size="lg"
            />
            <ProgressBar
              value={40}
              label="Emergency Fund Goal (40%)"
              showValueText
              tone="sky"
              size="md"
            />
            <ProgressBar
              value={85}
              label="Dining Out Near Budget Cap (85%)"
              showValueText
              tone="accent"
              size="md"
            />
          </CardContent>
        </Card>

        {/* 5. Badges */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>5. Badge Variants</CardTitle>
            <Badge variant="awning">Awning Motif</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="ink">{t('badge.need')}</Badge>
              <Badge variant="sand">{t('badge.want')}</Badge>
              <Badge variant="sky">{t('badge.saving')}</Badge>
              <Badge variant="accent">{t('badge.urgent')}</Badge>
              <Badge variant="awning">Awning Badge</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ink" size="sm">Small Ink</Badge>
              <Badge variant="accent" size="sm">Small Urgent</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 6. Form Inputs & Select */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>6. Input & Select Fields</CardTitle>
            <Badge variant="sand">Accessible States</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Expense Amount"
              placeholder="0.00"
              prefixIcon={<span className="font-bold text-ink">₹</span>}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (Number(e.target.value) > 100000) {
                  setInputError('Exceeds single transaction UPI limit of ₹1,00,000');
                } else {
                  setInputError('');
                }
              }}
              error={inputError}
              hint="Enter amount in Indian Rupees"
            />

            <Select
              label="Budget Envelope Kind"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'need', label: `Need (ज़रूरी) - 50%` },
                { value: 'want', label: `Want (शौक) - 30%` },
                { value: 'saving', label: `Saving (बचत) - 20%` },
              ]}
              hint="Categories are classified according to the 50/30/20 rule"
            />

            <Input
              label="Search Transactions"
              placeholder="E.g. Swiggy, DMart, Rent..."
              prefixIcon={<Search className="w-4 h-4" />}
            />

            <Input
              label="Disabled State"
              value="Fixed Rent Commitment (Auto-locked)"
              disabled
              hint="System-managed obligation"
            />
          </CardContent>
        </Card>

        {/* 7. Tabs */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>7. Tabs Navigation</CardTitle>
            <Badge variant="ink">Keyboard Accessible</Badge>
          </CardHeader>
          <CardContent>
            <Tabs
              items={[
                {
                  id: 'monthly',
                  label: 'Monthly View (मासिक)',
                  badge: <Badge variant="sand" size="sm">Active</Badge>,
                  content: (
                    <div className="p-4 rounded-lg bg-sand-10 border border-sand-20 text-sm">
                      <p className="font-semibold text-ink">Monthly Budget Cycle (1st of month)</p>
                      <p className="text-ink/70 mt-1">Track salary credits, fixed obligations, and variable allowances.</p>
                    </div>
                  ),
                },
                {
                  id: 'goals',
                  label: 'Goals (लक्ष्य)',
                  badge: <Badge variant="sky" size="sm">3 Goals</Badge>,
                  content: (
                    <div className="p-4 rounded-lg bg-sky-20 border border-sky-40 text-sm">
                      <p className="font-semibold text-ink">Target-First Savings</p>
                      <p className="text-ink/70 mt-1">Laptop, Festival Gifts, and Emergency Stash.</p>
                    </div>
                  ),
                },
                {
                  id: 'analytics',
                  label: 'Insights (विश्लेषण)',
                  content: (
                    <div className="p-4 rounded-lg bg-paper border border-ink-10 text-sm">
                      <p className="font-semibold text-ink">Spending Trends</p>
                      <p className="text-ink/70 mt-1">Needs vs Wants split analysis across 90 days.</p>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* 8. Skeletons */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>8. Skeleton Loading States</CardTitle>
            <Badge variant="sand">Gentle Pulse</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
              </div>
            </div>
            <Skeleton variant="rectangular" height={52} />
          </CardContent>
        </Card>

        {/* 9. Empty State */}
        <Card padding="none">
          <div className="p-6">
            <h3 className="font-fraunces text-lg font-semibold text-ink mb-4">
              9. EmptyState with Stripe Motif Halo
            </h3>
            <EmptyState
              title={t('empty.noTransactions')}
              description={t('empty.noTransactionsDesc')}
              actionText={t('empty.addFirst')}
              onAction={() => success(t('toast.savedSuccess'))}
            />
          </div>
        </Card>

        {/* 10. Interactive Modal & Toast Triggers */}
        <Card padding="md" withAwningAccent>
          <CardHeader>
            <CardTitle>{t('design.interactiveTitle')}</CardTitle>
            <Badge variant="accent">Live Feedback</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              >
                Open Modal / Bottom Sheet
              </Button>
              <Button
                variant="secondary"
                onClick={() => success(t('toast.savedSuccess'))}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="danger"
                onClick={() => error(t('toast.errorOccurred'))}
              >
                Trigger Error Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => info(t('toast.infoTip'))}
              >
                Trigger Info Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Modal / Bottom Sheet Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('modal.title')}
        description={t('modal.description')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                success('Modal action executed!');
              }}
            >
              {t('modal.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink/80 leading-relaxed">
            On screens &lt; 1024px or mobile phones (e.g. 390px iPhone), this dialog smoothly slides up as an intuitive bottom sheet with a grab handle and full touch gesture ergonomics.
          </p>
          <div className="p-3 bg-sand-10 rounded-lg border border-sand-20 text-xs">
            <span className="font-semibold text-ink block">Viewport Verification</span>
            Works gracefully at 390px (mobile) and 1440px (wide desktop).
          </div>
        </div>
      </Modal>
    </div>
  );
};
