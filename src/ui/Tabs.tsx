import React, { useState, useId } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'pill' | 'underline';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultTab,
  onChange,
  variant = 'pill',
  fullWidth = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || (items.length > 0 ? items[0].id : '')
  );
  const baseId = useId();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeItem = items.find((item) => item.id === activeTab);

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Navigation List */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={`
          flex items-center gap-1 overflow-x-auto no-scrollbar
          ${variant === 'underline' ? 'border-b border-ink-10 pb-px' : 'bg-sand-10 p-1 rounded-btn border border-sand-20'}
          ${fullWidth ? 'w-full' : 'inline-flex'}
        `}
      >
        {items.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              className={`
                touch-target inline-flex items-center justify-center font-medium text-xs sm:text-sm px-3.5 py-2
                transition-all duration-150 select-none outline-none disabled:opacity-40 disabled:cursor-not-allowed
                ${fullWidth ? 'flex-1' : ''}
                ${
                  variant === 'pill'
                    ? isActive
                      ? 'bg-ink text-paper shadow-sm rounded-lg'
                      : 'text-ink/80 hover:text-ink hover:bg-ink-10 rounded-lg'
                    : isActive
                      ? 'text-ink border-b-2 border-ink font-semibold -mb-px'
                      : 'text-ink/70 hover:text-ink hover:border-b-2 hover:border-ink-20'
                }
              `}
            >
              {tab.icon && <span className="mr-1.5 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span className="ml-1.5 shrink-0">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeItem && (
        <div
          id={`${baseId}-panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          className="pt-4 focus:outline-none"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
};
