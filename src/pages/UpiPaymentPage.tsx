import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QrCode,
  Smartphone,
  Building2,
  ShieldCheck,
  CheckCircle2,
  History,
  Sparkles,
  ArrowRight,
  Plus,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../engine/currency';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { UpiPaymentModal } from '../components/payment/UpiPaymentModal';
import {
  getConnectedUpiAccounts,
  getPrimaryUpiAccount,
  PRESET_MERCHANT_QRS,
  ConnectedUpiAccount,
  UpiPaymentReceipt,
} from '../services/upiService';

export const UpiPaymentPage: React.FC = () => {
  const { t } = useTranslation();
  const appContext = useApp();
  const mode = appContext?.mode || 'earner';
  const transactions = appContext?.transactions || [];
  const envelopes = appContext?.envelopes || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPresetVpa, setModalPresetVpa] = useState<string>('');
  const [modalPresetAmount, setModalPresetAmount] = useState<number | undefined>(undefined);
  const [modalPresetItem, setModalPresetItem] = useState<string>('');

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedUpiAccount[]>([]);
  const [primaryAccount, setPrimaryAccount] = useState<ConnectedUpiAccount | null>(null);

  useEffect(() => {
    const accs = getConnectedUpiAccounts(mode);
    setConnectedAccounts(accs);
    setPrimaryAccount(getPrimaryUpiAccount(mode));
  }, [mode, isModalOpen]);

  // Filter recent UPI transactions
  const upiTransactions = transactions.filter((tx) => tx.paymentMode === 'upi').slice(0, 10);

  const handleOpenPaymentWithPreset = (preset: typeof PRESET_MERCHANT_QRS[0]) => {
    setModalPresetVpa(preset.vpa);
    setModalPresetAmount(preset.defaultAmount);
    setModalPresetItem(preset.itemDescription);
    setIsModalOpen(true);
  };

  const handleOpenBlankPayment = () => {
    setModalPresetVpa('');
    setModalPresetAmount(undefined);
    setModalPresetItem('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-ink/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
              UPI Bharat Switch
            </span>
            <span className="text-xs text-ink/60 font-medium">
              Zero Data Collection • Local Calculation
            </span>
          </div>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
            UPI Payments & Auto-Expense
          </h1>
          <p className="text-xs sm:text-sm text-ink/75 mt-0.5">
            Connect your UPI, scan QR codes or pay to bank accounts. PennyPath automatically asks what item you spent on and manages your envelopes.
          </p>
        </div>

        {/* Big Action CTA Button */}
        <button
          type="button"
          onClick={handleOpenBlankPayment}
          className="touch-target px-5 py-3 bg-ink hover:bg-ink-light active:bg-ink-dark text-paper font-bold text-sm rounded-btn shadow-card flex items-center justify-center gap-2.5 transition-all self-start sm:self-auto"
        >
          <QrCode className="w-5 h-5 text-sky" />
          <span>Scan QR / Make Payment</span>
        </button>
      </div>

      {/* Main Grid: Left Column (Linked UPI & Quick Actions), Right Column (Recent UPI History) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connected Account & Fast QR Scan Hub */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected UPI Account Card */}
          <section className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink">
                <Smartphone className="w-4 h-4 text-ink" />
                <span>Connected UPI ID & Bank</span>
              </div>
              <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                NPCI Active
              </span>
            </div>

            <div className="bg-sand/20 border border-sand-dark/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-ink text-paper font-bold text-sm flex items-center justify-center shadow-xs">
                  UPI
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {primaryAccount?.bankName} ({primaryAccount?.accountMasked})
                  </h3>
                  <div className="text-xs font-mono font-medium text-ink/70">
                    {primaryAccount?.vpa}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-0.5">
                    Account Holder: <strong>{primaryAccount?.holderName}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenBlankPayment}
                className="touch-target px-4 py-2 bg-ink text-paper text-xs font-bold rounded-btn hover:bg-ink-light transition-colors self-start sm:self-auto shrink-0"
              >
                Manage / Switch UPI
              </button>
            </div>
          </section>

          {/* Quick Preset Merchant Bharat QRs */}
          <section className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Instant Scan & Pay Merchants
                </h3>
                <p className="text-xs text-ink/70 mt-0.5">
                  Tap any merchant to test instant UPI flow, item deduction, and automatic envelope math.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {PRESET_MERCHANT_QRS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleOpenPaymentWithPreset(preset)}
                  className="touch-target p-3.5 text-left rounded-xl border border-ink/15 hover:border-ink hover:bg-sand/20 bg-paper transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-ink/10 group-hover:bg-ink group-hover:text-paper text-ink flex items-center justify-center font-bold text-sm shrink-0 transition-colors">
                    ₹
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm font-bold text-ink truncate">
                        {preset.name}
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-fraunces text-accent shrink-0">
                        ₹{preset.defaultAmount}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink/75 truncate mt-0.5">
                      {preset.itemDescription}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] font-semibold text-ink/70 bg-sand/40 px-2 py-0.5 rounded">
                        {preset.tag}
                      </span>
                      <span className="text-[10px] text-accent font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Pay Now <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* How PennyPath Auto-Calculates Expenses */}
          <section className="bg-sand/15 border border-sand-dark/30 rounded-card p-4 sm:p-5 text-xs text-ink/80 space-y-2">
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-700" />
              How PennyPath Handles Your Expenses Automatically
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-paper p-3 rounded-lg border border-ink/10">
                <span className="font-bold text-ink block text-xs">1. Scan or Enter Bank</span>
                <p className="text-[11px] text-ink/70 mt-1">
                  Point camera at any BharatQR, enter UPI ID, or specify bank account details.
                </p>
              </div>
              <div className="bg-paper p-3 rounded-lg border border-ink/10">
                <span className="font-bold text-ink block text-xs">2. Specify the Item</span>
                <p className="text-[11px] text-ink/70 mt-1">
                  PennyPath asks what you bought and automatically matches it to your budget envelope.
                </p>
              </div>
              <div className="bg-paper p-3 rounded-lg border border-ink/10">
                <span className="font-bold text-ink block text-xs">3. Instant Envelope Math</span>
                <p className="text-[11px] text-ink/70 mt-1">
                  Amount is deducted from envelope, safe-to-spend limit updates, and receipt is saved.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Col: Recent UPI Payments & Activity */}
        <div className="space-y-6">
          <section className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <History className="w-4 h-4 text-ink" />
                Recent UPI Payments
              </h3>
              <span className="text-[11px] font-semibold text-ink/60">
                {upiTransactions.length} payments
              </span>
            </div>

            {upiTransactions.length === 0 ? (
              <div className="text-center py-8 text-ink/60 space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-ink/30" />
                <p className="text-xs">No UPI payments yet.</p>
                <button
                  type="button"
                  onClick={handleOpenBlankPayment}
                  className="touch-target text-xs font-bold text-accent hover:underline"
                >
                  Make your first payment
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upiTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border border-ink/10 bg-sand/10 hover:bg-sand/20 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ink truncate">
                          {tx.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink/60 font-mono">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="text-accent font-semibold">{t(tx.categoryKey)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold font-fraunces text-ink">
                        - {formatINR(tx.amount)}
                      </div>
                      <span className="text-[9px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.2 rounded">
                        UPI Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Embedded / Interactive Payment Modal */}
      <UpiPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPayeeVpa={modalPresetVpa}
        initialAmount={modalPresetAmount}
        initialItem={modalPresetItem}
      />
    </div>
  );
};
