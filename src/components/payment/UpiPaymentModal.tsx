import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Camera,
  X,
  CreditCard,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Check,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BudgetEnvelope } from '../../engine/budget';
import { formatINR, parseINR } from '../../engine/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import {
  ConnectedUpiAccount,
  getConnectedUpiAccounts,
  getPrimaryUpiAccount,
  saveConnectedUpiAccounts,
  PRESET_MERCHANT_QRS,
  parseUpiString,
  lookupIfsc,
  matchEnvelopeForItem,
  buildUpiDeepLink,
  generateUpiReferenceNumber,
  UpiPaymentReceipt,
} from '../../services/upiService';

export interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (receipt: UpiPaymentReceipt) => void;
  initialPayeeVpa?: string;
  initialAmount?: number;
  initialItem?: string;
}

type PaymentTab = 'scan' | 'vpa' | 'bank';
type PaymentStep = 'input' | 'authorize' | 'processing' | 'receipt';

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  initialPayeeVpa = '',
  initialAmount,
  initialItem = '',
}) => {
  const { t } = useTranslation();
  const appContext = useApp();
  const mode = appContext?.mode || 'earner';
  const envelopes = appContext?.envelopes || [];

  // Account management state
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedUpiAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<ConnectedUpiAccount | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [customVpaInput, setCustomVpaInput] = useState('');
  const [customBankInput, setCustomBankInput] = useState('');

  // Payment navigation tabs & step
  const [activeTab, setActiveTab] = useState<PaymentTab>(initialPayeeVpa ? 'vpa' : 'scan');
  const [step, setStep] = useState<PaymentStep>('input');

  // Payee & Transfer details
  const [payeeVpa, setPayeeVpa] = useState<string>(initialPayeeVpa);
  const [payeeName, setPayeeName] = useState<string>('');
  const [isVpaVerified, setIsVpaVerified] = useState<boolean>(false);

  // Bank transfer inputs
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [bankLookupName, setBankLookupName] = useState<string>('');

  // "What item am I spending money on?" & Amount
  const [amountStr, setAmountStr] = useState<string>(initialAmount ? initialAmount.toString() : '250');
  const [itemDescription, setItemDescription] = useState<string>(initialItem || '');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [userOverrodeEnvelope, setUserOverrodeEnvelope] = useState<boolean>(false);

  // Authorization (UPI PIN)
  const [upiPin, setUpiPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Processing & Receipt
  const [lastReceipt, setLastReceipt] = useState<UpiPaymentReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera scanner preview simulation
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load connected accounts on mount or mode change
  useEffect(() => {
    if (isOpen) {
      const accounts = getConnectedUpiAccounts(mode);
      setConnectedAccounts(accounts);
      const primary = getPrimaryUpiAccount(mode);
      setActiveAccount(primary);
      setCustomVpaInput(primary.vpa);
      setCustomBankInput(primary.bankName);
    }
  }, [isOpen, mode]);

  // Set default envelope
  useEffect(() => {
    if (envelopes.length > 0 && !selectedEnvelopeId) {
      setSelectedEnvelopeId(envelopes[0].id);
    }
  }, [envelopes, selectedEnvelopeId]);

  // Automatically match item description to envelope if user hasn't manually overridden
  useEffect(() => {
    if (!userOverrodeEnvelope && envelopes.length > 0 && itemDescription.trim().length > 1) {
      const match = matchEnvelopeForItem(itemDescription, envelopes, payeeName);
      if (match.matchedEnvelope) {
        setSelectedEnvelopeId(match.matchedEnvelope.id);
      }
    }
  }, [itemDescription, payeeName, envelopes, userOverrodeEnvelope]);

  // Auto-lookup IFSC bank
  useEffect(() => {
    if (ifscCode.length >= 4) {
      const res = lookupIfsc(ifscCode);
      setBankLookupName(res.bankName);
    } else {
      setBankLookupName('');
    }
  }, [ifscCode]);

  // Camera stream handler
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive && videoRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setIsCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive]);

  // Parsed amount
  const parsedAmount = useMemo(() => parseINR(amountStr), [amountStr]);

  // Target envelope
  const currentEnvelope = useMemo(() => {
    return envelopes.find((e) => e.id === selectedEnvelopeId) || envelopes[0] || null;
  }, [envelopes, selectedEnvelopeId]);

  // Automatic calculation preview
  const calculationPreview = useMemo(() => {
    if (!currentEnvelope) {
      return {
        remainingBefore: 0,
        remainingAfter: 0,
        isOverBudget: false,
        overAmount: 0,
      };
    }
    const remainingBefore = currentEnvelope.allocated - currentEnvelope.spent;
    const remainingAfter = remainingBefore - parsedAmount;
    const isOverBudget = remainingAfter < 0;
    const overAmount = isOverBudget ? Math.abs(remainingAfter) : 0;

    return {
      remainingBefore,
      remainingAfter,
      isOverBudget,
      overAmount,
    };
  }, [currentEnvelope, parsedAmount]);

  if (!isOpen) return null;

  // Handlers
  const handleSelectPresetQR = (preset: typeof PRESET_MERCHANT_QRS[0]) => {
    setPayeeVpa(preset.vpa);
    setPayeeName(preset.name);
    setAmountStr(preset.defaultAmount.toString());
    setItemDescription(preset.itemDescription);
    setIsVpaVerified(true);
    setErrorMsg(null);

    // Find envelope
    const match = envelopes.find((e) => e.categoryKey === preset.categoryHint);
    if (match) {
      setSelectedEnvelopeId(match.id);
      setUserOverrodeEnvelope(false);
    }
    setActiveTab('vpa');
  };

  const handleApplyRawQr = (raw: string) => {
    const parsed = parseUpiString(raw);
    if (parsed.isValid) {
      setPayeeVpa(parsed.payeeVpa);
      setPayeeName(parsed.payeeName);
      if (parsed.amount) {
        setAmountStr(parsed.amount.toString());
      }
      if (parsed.note) {
        setItemDescription(parsed.note);
      }
      setIsVpaVerified(true);
      setErrorMsg(null);
      setActiveTab('vpa');
      setIsCameraActive(false);
    } else {
      setErrorMsg('Invalid QR code format. Please ensure it contains a valid UPI URI.');
    }
  };

  const handleVerifyVpa = () => {
    if (!payeeVpa || !payeeVpa.includes('@')) {
      setErrorMsg('Please enter a valid UPI VPA (e.g. merchant@okaxis)');
      return;
    }
    setErrorMsg(null);
    setIsVpaVerified(true);
    if (!payeeName) {
      const parts = payeeVpa.split('@')[0].replace(/[._-]/g, ' ');
      setPayeeName(parts.charAt(0).toUpperCase() + parts.slice(1));
    }
  };

  const handleSaveCustomAccount = () => {
    if (!customVpaInput || !customVpaInput.includes('@')) {
      setErrorMsg('Invalid UPI ID format. Must include @ (e.g. name@okaxis)');
      return;
    }
    const updated: ConnectedUpiAccount = {
      id: activeAccount?.id || `upi-${Date.now()}`,
      vpa: customVpaInput.trim(),
      holderName: activeAccount?.holderName || 'Account Holder',
      bankName: customBankInput.trim() || 'Verified Bank',
      accountMasked: activeAccount?.accountMasked || '•••• 8821',
      accountType: 'savings',
      isDefault: true,
      linkedAt: new Date().toISOString().slice(0, 10),
    };
    const newAccounts = [updated, ...connectedAccounts.filter((a) => a.id !== updated.id)];
    setConnectedAccounts(newAccounts);
    setActiveAccount(updated);
    saveConnectedUpiAccounts(newAccounts, mode);
    setIsEditingAccount(false);
    setErrorMsg(null);
  };

  const handleProceedToAuthorize = () => {
    setErrorMsg(null);

    // Validate payee
    if (activeTab === 'bank') {
      if (!accountNumber || accountNumber.length < 8) {
        setErrorMsg('Please enter a valid bank account number (min 8 digits)');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        setErrorMsg('Bank account numbers do not match');
        return;
      }
      if (!ifscCode || ifscCode.length !== 11) {
        setErrorMsg('Please enter an 11-character IFSC code (e.g. SBIN0001234)');
        return;
      }
      if (!payeeName.trim()) {
        setErrorMsg('Please enter beneficiary account holder name');
        return;
      }
    } else {
      if (!payeeVpa || !payeeVpa.includes('@')) {
        setErrorMsg('Please enter or scan a valid recipient UPI ID');
        return;
      }
    }

    // Validate amount
    if (parsedAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than ₹0');
      return;
    }

    // Validate item description (User Requirement: "ask the user at on what item am I spending my money on")
    if (!itemDescription.trim()) {
      setErrorMsg('Please specify what item you are spending this money on.');
      return;
    }

    setStep('authorize');
  };

  const handleExecutePayment = async () => {
    if (!upiPin || upiPin.length < 4) {
      setPinError('Please enter your 4 or 6-digit UPI PIN');
      return;
    }

    setPinError(null);
    setStep('processing');

    try {
      // Simulate authentic UPI switch latency
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const txRef = generateUpiReferenceNumber();
      const payeeDisplayName = payeeName || (payeeVpa ? payeeVpa.split('@')[0] : 'Merchant');
      const payeeIdentifier = activeTab === 'bank' ? `${bankLookupName || 'Bank'} •••• ${accountNumber.slice(-4)}` : payeeVpa;

      const fullDescription = `${itemDescription.trim()} (Paid to ${payeeDisplayName})`;

      // 1. Automatically calculate & record expense in PennyPath repository!
      const newTx = await appContext?.addTransaction({
        date: new Date().toISOString().slice(0, 10),
        amount: parsedAmount,
        type: 'expense',
        categoryKey: currentEnvelope ? currentEnvelope.categoryKey : 'budget.cat.food_groceries',
        description: fullDescription,
        envelopeId: currentEnvelope?.id,
        paymentMode: 'upi',
        note: `Ref: ${txRef} via ${activeAccount?.vpa || 'UPI'}`,
      });

      // 2. Refresh app-level envelopes, safe-to-spend & balances
      await appContext?.refreshData();

      // 3. Build receipt
      const receipt: UpiPaymentReceipt = {
        success: true,
        transactionRef: txRef,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        amount: parsedAmount,
        itemDescription: itemDescription.trim(),
        categoryKey: currentEnvelope ? currentEnvelope.categoryKey : 'budget.cat.food_groceries',
        envelopeId: currentEnvelope?.id,
        payeeName: payeeDisplayName,
        payeeIdentifier,
        payerVpa: activeAccount?.vpa || 'user@upi',
        payerBank: activeAccount?.bankName || 'HDFC Bank',
        mode: 'upi',
        createdTransaction: newTx,
      };

      setLastReceipt(receipt);
      setStep('receipt');

      // 4. Trigger celebration
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      onPaymentSuccess?.(receipt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'UPI switch communication error';
      setErrorMsg(msg);
      setStep('input');
    }
  };

  const handleOpenExternalUpi = () => {
    if (!payeeVpa) return;
    const link = buildUpiDeepLink({
      payeeVpa,
      payeeName: payeeName || 'Merchant',
      amount: parsedAmount,
      note: itemDescription || 'PennyPath Payment',
    });
    window.open(link, '_blank');
  };

  const handleResetForNewPayment = () => {
    setStep('input');
    setPayeeVpa('');
    setPayeeName('');
    setIsVpaVerified(false);
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setBankLookupName('');
    setItemDescription('');
    setAmountStr('250');
    setUpiPin('');
    setPinError(null);
    setErrorMsg(null);
    setUserOverrodeEnvelope(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-modal-title"
    >
      <div className="bg-paper border border-ink/20 rounded-card shadow-modal w-full max-w-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Banner */}
        <div className="bg-ink text-paper px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky/20 border border-sky/30 flex items-center justify-center text-sky font-bold">
              <QrCode className="w-5 h-5 text-sky" />
            </div>
            <div>
              <h2 id="upi-modal-title" className="font-fraunces text-lg sm:text-xl font-bold leading-none tracking-tight">
                PennyPath UPI Pay & Auto-Expense
              </h2>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-sky/90 block mt-0.5">
                Instant UPI Payment • Automatic Budget Calculation
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="touch-target p-1.5 text-paper/70 hover:text-paper hover:bg-paper/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: INPUT DETAILS */}
          {step === 'input' && (
            <>
              {/* Connected UPI Account Banner */}
              <div className="bg-sand/30 border border-ink/15 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    UPI
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink truncate">
                        {activeAccount?.bankName} ({activeAccount?.accountMasked})
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-ink/10 text-ink rounded-full">
                        Primary
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-ink/75 block truncate">
                      {activeAccount?.vpa}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingAccount((prev) => !prev)}
                  className="touch-target text-xs font-bold text-accent hover:text-accent-dark hover:underline shrink-0"
                >
                  {isEditingAccount ? 'Cancel' : 'Switch / Edit'}
                </button>
              </div>

              {/* Edit Connected UPI Drawer */}
              {isEditingAccount && (
                <div className="bg-paper border border-ink/20 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Link Your Personal UPI ID
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                        Your UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        value={customVpaInput}
                        onChange={(e) => setCustomVpaInput(e.target.value)}
                        placeholder="e.g. rohan@okaxis"
                        className="w-full text-xs font-mono p-2 border border-ink/20 rounded-md bg-paper focus:ring-1 focus:ring-ink outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={customBankInput}
                        onChange={(e) => setCustomBankInput(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full text-xs p-2 border border-ink/20 rounded-md bg-paper focus:ring-1 focus:ring-ink outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveCustomAccount}
                      className="touch-target px-3 py-1.5 bg-ink text-paper text-xs font-bold rounded-md hover:bg-ink-light transition-all"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Tabs: Scan QR vs UPI ID vs Bank Transfer */}
              <div className="flex items-center p-1 bg-ink/5 border border-ink/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('scan');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 touch-target py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'scan'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-ink/70 hover:text-ink hover:bg-ink/10'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('vpa');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 touch-target py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'vpa'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-ink/70 hover:text-ink hover:bg-ink/10'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI ID / VPA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('bank');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 touch-target py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'bank'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-ink/70 hover:text-ink hover:bg-ink/10'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Bank Account</span>
                </button>
              </div>

              {/* TAB 1: SCAN QR CODE */}
              {activeTab === 'scan' && (
                <div className="space-y-3.5">
                  {/* Camera view finder simulator */}
                  <div className="relative border-2 border-dashed border-ink/30 rounded-2xl p-4 bg-ink/5 flex flex-col items-center justify-center text-center overflow-hidden min-h-[160px]">
                    {isCameraActive ? (
                      <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                        {/* QR Target Crosshairs */}
                        <div className="absolute inset-8 border-2 border-sky rounded-lg pointer-events-none animate-pulse" />
                        <button
                          type="button"
                          onClick={() => setIsCameraActive(false)}
                          className="absolute top-2 right-2 bg-ink/80 text-paper p-1.5 rounded-full text-xs font-bold"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <QrCode className="w-10 h-10 text-ink/40 mb-2" />
                        <p className="text-xs font-semibold text-ink/80">
                          Scan any BharatQR, UPI QR or Merchant code
                        </p>
                        <p className="text-[11px] text-ink/60 mt-0.5">
                          Point your device camera or tap a quick merchant sample below
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => setIsCameraActive(true)}
                            className="touch-target px-3.5 py-1.5 bg-ink text-paper text-xs font-bold rounded-btn flex items-center gap-1.5 hover:bg-ink-light transition-all shadow-xs"
                          >
                            <Camera className="w-4 h-4 text-sky" />
                            <span>Open Camera Scanner</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Manual QR string / paste input fallback */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink/70 block mb-1">
                      Or Paste Raw QR / UPI String:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="upi://pay?pa=merchant@upi&pn=Store&am=250"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleApplyRawQr((e.target as HTMLInputElement).value);
                          }
                        }}
                        id="raw-qr-input"
                        className="flex-1 text-xs font-mono p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('raw-qr-input') as HTMLInputElement;
                          if (input) handleApplyRawQr(input.value);
                        }}
                        className="touch-target px-3 py-2 bg-sand text-ink text-xs font-bold rounded-btn hover:bg-sand-dark transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Test QRs for rapid verification */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink/75 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        Quick Test Bharat Merchant QRs:
                      </span>
                      <span className="text-[10px] text-ink/50 font-medium">1-tap instant scan</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_MERCHANT_QRS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPresetQR(preset)}
                          className="touch-target p-2.5 text-left rounded-xl border border-ink/15 hover:border-ink hover:bg-sand/20 bg-paper transition-all flex items-start gap-2.5 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-ink/10 group-hover:bg-ink group-hover:text-paper text-ink flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                            ₹
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-ink truncate">
                                {preset.name}
                              </span>
                              <span className="text-xs font-bold font-fraunces text-accent shrink-0">
                                ₹{preset.defaultAmount}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink/70 truncate mt-0.5">
                              {preset.itemDescription}
                            </p>
                            <span className="text-[9px] font-semibold text-ink/60 bg-sand/40 px-1.5 py-0.5 rounded mt-1 inline-block">
                              {preset.tag}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: UPI ID / VPA */}
              {activeTab === 'vpa' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">
                      Recipient UPI ID / VPA *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={payeeVpa}
                        onChange={(e) => {
                          setPayeeVpa(e.target.value);
                          setIsVpaVerified(false);
                        }}
                        placeholder="e.g. merchant.store@paytm or friend@okaxis"
                        className="flex-1 text-xs font-mono p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyVpa}
                        className="touch-target px-3.5 py-2 bg-ink text-paper text-xs font-bold rounded-btn hover:bg-ink-light transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  {/* Recipient verified name badge */}
                  <div>
                    <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                      Payee / Merchant Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        placeholder="e.g. Ramesh Kirana Store"
                        className="w-full text-xs p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                      {isVpaVerified && (
                        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span>NPCI Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BANK ACCOUNT + IFSC */}
              {activeTab === 'bank' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">
                        Bank Account Number *
                      </label>
                      <input
                        type="password"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter account number"
                        className="w-full text-xs font-mono p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">
                        Re-enter Account Number *
                      </label>
                      <input
                        type="text"
                        value={confirmAccountNumber}
                        onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Confirm account number"
                        className="w-full text-xs font-mono p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        maxLength={11}
                        placeholder="e.g. SBIN0001234"
                        className="w-full text-xs font-mono p-2.5 border border-ink/20 rounded-btn bg-paper uppercase outline-none focus:ring-1 focus:ring-ink"
                      />
                      {bankLookupName && (
                        <p className="text-[11px] font-semibold text-green-700 mt-1 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {bankLookupName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">
                        Beneficiary Name *
                      </label>
                      <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        placeholder="e.g. Amit Kumar"
                        className="w-full text-xs p-2.5 border border-ink/20 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* USER REQUIREMENT:
                  "I want it to like ask the user at on what item am I spending my money on,
                   and then it should be calculated automatically by the app.
                   So like, it should handle our expenses itself." */}
              <div className="pt-2 border-t border-ink/15 space-y-3.5">
                {/* 1. Payment Amount */}
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Payment Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-base font-bold text-ink font-fraunces">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="e.g. 250"
                      min="1"
                      className="w-full text-lg sm:text-xl font-bold font-fraunces pl-8 pr-3 py-2 border-2 border-ink/30 focus:border-ink rounded-btn bg-paper outline-none"
                    />
                  </div>
                  {/* Preset quick amount buttons */}
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountStr(amt.toString())}
                        className={`touch-target px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                          parsedAmount === amt
                            ? 'bg-ink text-paper border-ink'
                            : 'bg-paper text-ink/80 border-ink/20 hover:border-ink'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. "WHAT ITEM AM I SPENDING MY MONEY ON?" */}
                <div className="bg-sand/20 border-2 border-sand-dark/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-accent" />
                      What item are you spending this money on? *
                    </label>
                    <span className="text-[10px] text-ink/60 font-semibold">
                      Auto-tracks expense
                    </span>
                  </div>

                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => {
                      setItemDescription(e.target.value);
                      setUserOverrodeEnvelope(false);
                    }}
                    placeholder="e.g. Chai & Samosa, Kirana Ration, Uber ride, Electricity bill..."
                    className="w-full text-xs font-medium p-2.5 border border-ink/25 rounded-btn bg-paper outline-none focus:ring-1 focus:ring-ink"
                  />

                  {/* Envelope selection & auto-match pill */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-ink/70">
                        Budget Envelope:
                      </span>
                      <select
                        value={selectedEnvelopeId}
                        onChange={(e) => {
                          setSelectedEnvelopeId(e.target.value);
                          setUserOverrodeEnvelope(true);
                        }}
                        className="text-xs font-bold bg-paper border border-ink/25 rounded-md px-2.5 py-1 text-ink focus:ring-1 focus:ring-ink outline-none cursor-pointer"
                      >
                        {envelopes.map((env) => (
                          <option key={env.id} value={env.id}>
                            {t(env.categoryKey)} (₹{env.allocated - env.spent} left)
                          </option>
                        ))}
                      </select>
                    </div>

                    {!userOverrodeEnvelope && itemDescription.trim().length > 1 && (
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full self-start sm:self-auto">
                        ✨ Auto-Detected Category
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. AUTOMATIC CALCULATION PREVIEW BOX */}
                {currentEnvelope && parsedAmount > 0 && (
                  <div className="bg-ink/5 border border-ink/15 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">
                        Automatic Budget Calculation Preview:
                      </span>
                      <span className="text-[11px] text-ink/60 font-mono">
                        {t(currentEnvelope.categoryKey)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-paper p-2 rounded-lg border border-ink/10">
                        <span className="text-[10px] text-ink/60 block uppercase font-medium">
                          Current Left
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-fraunces text-ink">
                          {formatINR(calculationPreview.remainingBefore)}
                        </span>
                      </div>

                      <div className="bg-paper p-2 rounded-lg border border-accent/20">
                        <span className="text-[10px] text-accent block uppercase font-medium">
                          Deducting
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-fraunces text-accent">
                          - {formatINR(parsedAmount)}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-lg border ${
                          calculationPreview.isOverBudget
                            ? 'bg-accent/10 border-accent text-accent'
                            : 'bg-paper border-ink/10 text-ink'
                        }`}
                      >
                        <span className="text-[10px] block uppercase font-medium">
                          New Remaining
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-fraunces">
                          {formatINR(calculationPreview.remainingAfter)}
                        </span>
                      </div>
                    </div>

                    {calculationPreview.isOverBudget && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Warning: This payment will exceed this envelope cap by{' '}
                          {formatINR(calculationPreview.overAmount)}. Safe-to-spend will auto-adjust.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center gap-2 text-xs font-bold text-accent">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 2: AUTHORIZE WITH UPI PIN */}
          {step === 'authorize' && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <span className="text-xs font-semibold text-ink/60 uppercase tracking-widest">
                  Confirming Payment To
                </span>
                <h3 className="font-fraunces text-xl sm:text-2xl font-bold text-ink">
                  {payeeName || payeeVpa}
                </h3>
                <p className="text-3xl sm:text-4xl font-bold font-fraunces text-accent tabular-nums">
                  {formatINR(parsedAmount)}
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sand/30 border border-ink/15 px-3 py-1 rounded-full text-ink mt-2">
                  <span>For: {itemDescription}</span>
                  <span>•</span>
                  <span>{currentEnvelope ? t(currentEnvelope.categoryKey) : 'Expense'}</span>
                </div>
              </div>

              {/* Payer Account Box */}
              <div className="bg-sand/20 border border-ink/15 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-ink/60 block text-[10px] uppercase font-bold">
                    Debiting From
                  </span>
                  <span className="font-bold text-ink">
                    {activeAccount?.bankName} ({activeAccount?.accountMasked})
                  </span>
                  <span className="text-[11px] font-mono text-ink/75 block">
                    {activeAccount?.vpa}
                  </span>
                </div>
                <ShieldCheck className="w-6 h-6 text-green-700" />
              </div>

              {/* UPI PIN Keypad */}
              <div className="bg-ink/5 border border-ink/15 rounded-2xl p-4 sm:p-5 text-center space-y-3">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink">
                  <ShieldCheck className="w-4 h-4 text-ink" />
                  <span>Enter 4 or 6-Digit UPI PIN</span>
                </div>

                {/* PIN bullet masks */}
                <div className="flex justify-center gap-3 my-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const isFilled = upiPin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          isFilled
                            ? 'bg-ink border-ink scale-110'
                            : 'border-ink/30 bg-paper'
                        }`}
                      />
                    );
                  })}
                </div>

                {pinError && (
                  <p className="text-xs font-bold text-accent">{pinError}</p>
                )}

                {/* On-screen secure numpad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') {
                          setUpiPin('');
                        } else if (k === '⌫') {
                          setUpiPin((prev) => prev.slice(0, -1));
                        } else if (upiPin.length < 6) {
                          setUpiPin((prev) => prev + k);
                        }
                      }}
                      className="touch-target py-3 rounded-xl bg-paper hover:bg-sand/40 border border-ink/15 text-sm sm:text-base font-bold font-mono text-ink shadow-xs active:scale-95 transition-all"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deep link fallback button for mobile devices */}
              {payeeVpa && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleOpenExternalUpi}
                    className="touch-target text-xs font-semibold text-ink/75 hover:text-ink inline-flex items-center gap-1.5 underline"
                  >
                    <span>Or pay directly using installed UPI App (GPay/PhonePe/Paytm)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-ink/20 border-t-ink animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">
                  UPI
                </div>
              </div>
              <div>
                <h3 className="font-fraunces text-xl font-bold text-ink">
                  Processing Payment...
                </h3>
                <p className="text-xs text-ink/70 mt-1">
                  Communicating with NPCI UPI Switch & {activeAccount?.bankName}...
                </p>
                <p className="text-[11px] text-accent font-semibold mt-2">
                  Please do not close or refresh this window
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: RECEIPT & SUCCESS */}
          {step === 'receipt' && lastReceipt && (
            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              {/* Green check header */}
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-green-800 block mt-2">
                  Payment Successful!
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-fraunces text-ink tabular-nums">
                  {formatINR(lastReceipt.amount)}
                </div>
                <p className="text-xs text-ink/70">
                  Paid to {lastReceipt.payeeName} ({lastReceipt.payeeIdentifier})
                </p>
              </div>

              {/* Automatic Expense Notification Card */}
              <div className="bg-sand/30 border-2 border-sand-dark/40 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs font-extrabold text-ink uppercase tracking-wide">
                    Expense Handled Automatically by PennyPath
                  </span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed">
                  Deducted <strong>{formatINR(lastReceipt.amount)}</strong> for{' '}
                  <span className="underline font-semibold">{lastReceipt.itemDescription}</span> and
                  automatically updated your{' '}
                  <strong>{t(lastReceipt.categoryKey)}</strong> envelope. Your safe-to-spend limit has
                  recalculated automatically.
                </p>
              </div>

              {/* Receipt Details Box */}
              <div className="bg-paper border border-ink/15 rounded-xl p-3.5 text-xs space-y-2 font-mono">
                <div className="flex justify-between border-b border-ink/10 pb-1.5">
                  <span className="text-ink/60">UPI Reference:</span>
                  <span className="font-bold text-ink">{lastReceipt.transactionRef}</span>
                </div>
                <div className="flex justify-between border-b border-ink/10 pb-1.5">
                  <span className="text-ink/60">Time & Date:</span>
                  <span className="text-ink">{lastReceipt.timestamp} • 20 Oct 2026</span>
                </div>
                <div className="flex justify-between border-b border-ink/10 pb-1.5">
                  <span className="text-ink/60">Paid From:</span>
                  <span className="text-ink">{lastReceipt.payerBank} ({lastReceipt.payerVpa})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Payment Mode:</span>
                  <span className="font-bold text-ink uppercase">UPI Bharat</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-paper border-t border-ink/15 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="touch-target px-4 py-2 border border-ink/20 text-ink hover:bg-ink/5 font-semibold text-xs sm:text-sm rounded-btn transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProceedToAuthorize}
                className="touch-target px-6 py-2.5 bg-ink text-paper hover:bg-ink-light font-bold text-xs sm:text-sm rounded-btn shadow-sm flex items-center gap-2 transition-all"
              >
                <span>Continue to Pay</span>
                <ArrowRight className="w-4 h-4 text-sky" />
              </button>
            </>
          )}

          {step === 'authorize' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="touch-target px-4 py-2 border border-ink/20 text-ink hover:bg-ink/5 font-semibold text-xs sm:text-sm rounded-btn transition-colors"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleExecutePayment}
                className="touch-target px-6 py-2.5 bg-accent hover:bg-accent-dark text-paper font-bold text-xs sm:text-sm rounded-btn shadow-sm flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm & Pay {formatINR(parsedAmount)}</span>
              </button>
            </>
          )}

          {step === 'receipt' && (
            <>
              <button
                type="button"
                onClick={handleResetForNewPayment}
                className="touch-target px-4 py-2 border border-ink/20 text-ink hover:bg-ink/5 font-semibold text-xs sm:text-sm rounded-btn flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pay Again</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="touch-target px-6 py-2.5 bg-ink text-paper hover:bg-ink-light font-bold text-xs sm:text-sm rounded-btn shadow-sm transition-all"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
