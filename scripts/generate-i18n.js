import fs from 'fs';
import path from 'path';

// Read existing locales
const existingEn = JSON.parse(fs.readFileSync('./src/i18n/locales/en.json', 'utf8'));
const existingHi = JSON.parse(fs.readFileSync('./src/i18n/locales/hi.json', 'utf8'));

// Deep merge helper
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      deepMerge(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
  return target;
}

const enExtra = {
  app: {
    demo_mode: "Demo Active",
    footer_compliance: "PennyPath Bharat Edition • Zero Data Collection • 100% Offline",
    offline_badge: "Offline",
    online_badge: "Online",
    reset_confirm: "Are you sure you want to reset demo data to defaults?",
    reset_demo: "Reset Demo Data"
  },
  nav: {
    home: "Home",
    plan: "Plan",
    add: "Add",
    invest: "Invest Lab",
    more: "More",
    budget: "Budget",
    goals: "Goals",
    calculators: "Calculators",
    reminders: "Reminders",
    lessons: "Learn"
  },
  modes: {
    student: "Student",
    household: "Household",
    earner: "First-Job Earner"
  },
  badge: {
    need: "Need",
    want: "Want",
    saving: "Saving",
    urgent: "Urgent"
  },
  buttons: {
    primary: "Confirm",
    secondary: "Cancel",
    danger: "Delete",
    loading: "Processing..."
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    viewDesign: "Design Showcase"
  },
  empty: {
    addFirst: "Add your first entry",
    noTransactions: "No transactions found",
    noTransactionsDesc: "Start adding expenses or seed demo data to explore."
  },
  design: {
    title: "Pennypath Design System",
    subtitle: "Warm Indian Bharat FinTech aesthetic with WCAG AA compliance.",
    paletteTitle: "1. Color Tokens & Palette",
    contrastTitle: "2. Contrast Compliance Audit",
    componentsTitle: "3. UI Components Showcase",
    interactiveTitle: "4. Interactive Testing Playground"
  },
  modal: {
    title: "Confirm Action",
    description: "Please confirm your action before proceeding.",
    confirm: "Confirm"
  },
  stat: {
    monthlyBudget: "Monthly Budget",
    spentSoFar: "Spent So Far",
    savingsRate: "Savings Rate",
    emergencyFund: "Emergency Cushion"
  },
  toast: {
    savedSuccess: "Saved successfully!",
    errorOccurred: "An error occurred.",
    infoTip: "Tip updated."
  },
  pitch: {
    guide_title: "5-Minute Pitch Mode",
    next_step: "Next Step",
    prev_step: "Previous Step",
    reset_button: "Reset Demo",
    step1: {
      title: "1. Seed Rohan Demo",
      cue: "Load 60 days of real Indian transaction data offline",
      btn: "Load Rohan Persona"
    },
    step2: {
      title: "2. Safe-to-Spend Daily Allowance",
      cue: "Show how daily limit prevents month-end panic",
      btn: "View Dashboard"
    },
    step3: {
      title: "3. Shortfall Review & Engine Fixes",
      cue: "Show live mathematical deficit resolution",
      btn: "Trigger Shortfall"
    },
    step4: {
      title: "4. SEBI Educational Invest Lab",
      cue: "Demonstrate emergency fund readiness & asset allocation",
      btn: "Open Invest Lab"
    },
    step5: {
      title: "5. Zero English Leaks Hindi Experience",
      cue: "Switch to natural Hindustani interface with instant parity",
      btn: "Switch to हिन्दी"
    }
  },
  horizon: "Time Horizon",
  income_stability: "Income Stability",
  reaction_drop: "Reaction to Market Dip",
  goal_type: "Goal Type",
  experience: "Investment Experience",
  dependents: "Family Dependents",
  food: "Food & Mess",
  goal: "Goal",
  test: "Test Verification Key",
  tx: {
    expense_added_toast: "Expense of ₹{{amount}} logged successfully!",
    income_added_toast: "Income of ₹{{amount}} credited successfully!"
  },
  goals: {
    items: {
      custom_goal: "Personal Goal"
    }
  }
};

const hiExtra = {
  app: {
    demo_mode: "डेमो सक्रिय",
    footer_compliance: "पेनीपाथ भारत संस्करण • पूर्ण गोपनीयता • 100% ऑफलाइन",
    offline_badge: "ऑफलाइन",
    online_badge: "ऑनलाइन",
    reset_confirm: "क्या आप सभी डेटा को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?",
    reset_demo: "डेमो डेटा रीसेट करें"
  },
  nav: {
    home: "होम",
    plan: "प्लान",
    add: "खर्चा जोड़ें",
    invest: "निवेश लैब",
    more: "अन्य",
    budget: "बजट",
    goals: "लक्ष्य",
    calculators: "कैलकुलेटर",
    reminders: "रिमाइंडर",
    lessons: "सीखें"
  },
  modes: {
    student: "विद्यार्थी",
    household: "गृहस्थी",
    earner: "नौकरीपेशा"
  },
  badge: {
    need: "ज़रूरत",
    want: "शौक",
    saving: "बचत",
    urgent: "ज़रूरी"
  },
  buttons: {
    primary: "पुष्टि करें",
    secondary: "रद्द करें",
    danger: "हटाएं",
    loading: "प्रगति पर..."
  },
  common: {
    save: "सहेजें",
    cancel: "रद्द करें",
    viewDesign: "डिज़ाइन सिस्टम"
  },
  empty: {
    addFirst: "अपनी पहली एंट्री जोड़ें",
    noTransactions: "कोई लेन-देन नहीं मिला",
    noTransactionsDesc: "खर्चा जोड़ना शुरू करें या डेमो डेटा लोड करें।"
  },
  design: {
    title: "पेनीपाथ डिज़ाइन सिस्टम",
    subtitle: "भारतीय परिवेश के अनुकूल वित्तीय डिज़ाइन प्रणाली।",
    paletteTitle: "1. रंग और पैलेट",
    contrastTitle: "2. कंट्रास्ट ऑडिट",
    componentsTitle: "3. घटक और कंपोनेंट्स",
    interactiveTitle: "4. टेस्टिंग प्लेग्राउंड"
  },
  modal: {
    title: "पुष्टि करें",
    description: "आगे बढ़ने से पहले कृपया पुष्टि करें।",
    confirm: "पुष्टि करें"
  },
  stat: {
    monthlyBudget: "मासिक बजट",
    spentSoFar: "अब तक का खर्चा",
    savingsRate: "बचत दर",
    emergencyFund: "इमरजेंसी कुशन"
  },
  toast: {
    savedSuccess: "सफलतापूर्वक सहेजा गया!",
    errorOccurred: "एक त्रुटि हुई।",
    infoTip: "टिप अपडेट हुई।"
  },
  pitch: {
    guide_title: "5-मिनट डेमो गाइड",
    next_step: "अगला कदम",
    prev_step: "पिछला कदम",
    reset_button: "डेमो रीसेट करें",
    step1: {
      title: "1. रोहन का डेमो लोड करें",
      cue: "60 दिनों का वास्तविक भारतीय लेन-देन डेटा ऑफलाइन लोड करें",
      btn: "रोहन प्रोफाइल लोड करें"
    },
    step2: {
      title: "2. रोज़ का सुरक्षित खर्च",
      cue: "दिखाएं कि कैसे दैनिक सीमा महीने के अंत के तनाव से बचाती है",
      btn: "डैशबोर्ड देखें"
    },
    step3: {
      title: "3. बजट कमी और इंजन समाधान",
      cue: "गणितीय बजट समाधान लाइव देखें",
      btn: "कमी का परीक्षण करें"
    },
    step4: {
      title: "4. SEBI शैक्षिक निवेश लैब",
      cue: "इमरजेंसी फंड तैयारी और निवेश बंटवारा प्रदर्शित करें",
      btn: "निवेश लैब खोलें"
    },
    step5: {
      title: "5. पूर्ण हिन्दी अनुभव",
      cue: "रोज़मर्रा की आसान हिन्दी भाषा में स्विच करें",
      btn: "हिन्दी में बदलें"
    }
  },
  horizon: "निवेश की अवधि",
  income_stability: "कमाई की स्थिरता",
  reaction_drop: "बाज़ार गिरने पर प्रतिक्रिया",
  goal_type: "लक्ष्य का प्रकार",
  experience: "निवेश का अनुभव",
  dependents: "परिवार के आश्रित",
  food: "भोजन और मेस",
  goal: "लक्ष्य",
  test: "परीक्षण सत्यापन कुंजी",
  tx: {
    expense_added_toast: "₹{{amount}} का खर्चा सफलतापूर्वक दर्ज हुआ!",
    income_added_toast: "₹{{amount}} की आमदनी सफलतापूर्वक जोड़ी गई!"
  },
  goals: {
    items: {
      custom_goal: "व्यक्तिगत लक्ष्य"
    }
  }
};

deepMerge(existingEn, enExtra);
deepMerge(existingHi, hiExtra);

fs.writeFileSync('./src/i18n/locales/en.json', JSON.stringify(existingEn, null, 2) + '\n', 'utf8');
fs.writeFileSync('./src/i18n/locales/hi.json', JSON.stringify(existingHi, null, 2) + '\n', 'utf8');

console.log('Successfully updated en.json and hi.json with all missing keys!');
