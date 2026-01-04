import React, { FC, memo, useMemo, useCallback } from 'react';
import { AccountType, ExperienceLevel, ModalState, AccountTypeChoiceData } from '../types/AccountSetupTypes';

interface Props {
  modalState: ModalState;
  onAccountTypeChoice: (accountType: AccountType, experienceLevel: ExperienceLevel, reason?: string) => void;
}

const AccountTypeChoiceStep: FC<Props> = memo(({ modalState, onAccountTypeChoice }) => {
  const [selectedType, setSelectedType] = React.useState<AccountType | null>(null);
  const [experienceLevel, setExperienceLevel] = React.useState<ExperienceLevel>('beginner');
  const [reason, setReason] = React.useState('');

  const accountTypes = useMemo(() => [
    {
      type: 'checking' as AccountType,
      title: 'Checking Account',
      icon: 'fas fa-university',
      description: 'For daily transactions, bill payments, and regular expenses',
      features: ['Easy access to funds', 'Debit card included', 'Online banking', 'Check writing'],
      recommended: ['Daily expenses', 'Bill payments', 'Salary deposits', 'ATM access'],
      color: 'bg-blue-50 border-blue-200'
    },
    {
      type: 'savings' as AccountType,
      title: 'Savings Account',
      icon: 'fas fa-piggy-bank',
      description: 'For building emergency funds and earning interest on deposits',
      features: ['Higher interest rates', 'Limited transactions', 'FDIC insured', 'Goal tracking'],
      recommended: ['Emergency fund', 'Short-term goals', 'Interest earning', 'Future planning'],
      color: 'bg-green-50 border-green-200'
    },
    {
      type: 'credit' as AccountType,
      title: 'Credit Card',
      icon: 'fas fa-credit-card',
      description: 'For credit purchases and building credit history',
      features: ['Credit building', 'Rewards programs', 'Purchase protection', 'Emergency credit'],
      recommended: ['Building credit', 'Large purchases', 'Rewards earning', 'Online shopping'],
      color: 'bg-purple-50 border-purple-200'
    },
    {
      type: 'investment' as AccountType,
      title: 'Investment',
      icon: 'fas fa-chart-line',
      description: 'For stocks, bonds, mutual funds, and long-term wealth building',
      features: ['Portfolio management', 'Growth potential', 'Dividend income', 'Tax advantages'],
      recommended: ['Long-term growth', 'Passive income', 'Retirement planning', 'Wealth building'],
      color: 'bg-indigo-50 border-indigo-200'
    },
    {
      type: 'cash' as AccountType,
      title: 'Cash Wallet',
      icon: 'fas fa-money-bill-wave',
      description: 'For tracking cash on hand and petty expenses',
      features: ['Physical cash tracking', 'Petty expenses', 'No banking fees', 'Immediate access'],
      recommended: ['Daily cash expenses', 'Emergency cash', 'Local transactions', 'Budget tracking'],
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      type: 'other' as AccountType,
      title: 'Other Account',
      icon: 'fas fa-wallet',
      description: 'For specialized accounts not covered by standard types',
      features: ['Custom tracking', 'Flexible rules', 'Specialized reporting', 'Unique features'],
      recommended: ['Business accounts', 'Loan tracking', 'Gift cards', 'Special purposes'],
      color: 'bg-gray-50 border-gray-200'
    }
  ], []);

  const experienceLevels = useMemo(() => [
    {
      level: 'beginner' as ExperienceLevel,
      title: 'Beginner',
      description: 'New to personal finance and account management',
      features: ['Guided setup', 'Basic recommendations', 'Educational tips', 'Simplified interface']
    },
    {
      level: 'intermediate' as ExperienceLevel,
      title: 'Intermediate',
      description: 'Some experience with financial accounts and budgeting',
      features: ['Balanced guidance', 'Moderate customization', 'Performance insights', 'Goal tracking']
    },
    {
      level: 'advanced' as ExperienceLevel,
      title: 'Advanced',
      description: 'Experienced with complex financial management',
      features: ['Full customization', 'Advanced analytics', 'Investment tracking', 'Professional tools']
    }
  ], []);

  const handleAccountTypeSelect = useCallback((type: AccountType) => {
    setSelectedType(type);
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedType) {
      onAccountTypeChoice(selectedType, experienceLevel, reason);
    }
  }, [selectedType, experienceLevel, reason, onAccountTypeChoice]);

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="text-center">
        <h2 className="text-lg md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
          What type of account would you like to create?
        </h2>
        <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the account type that best fits your financial needs. Each type has different features and benefits.
        </p>
      </div>

      {/* Account Type Selection */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {accountTypes.map((account) => {
          const isSelected = selectedType === account.type;
          const iconColorMap = {
            'checking': 'text-blue-600',
            'savings': 'text-green-600', 
            'credit': 'text-purple-600',
            'investment': 'text-indigo-600',
            'cash': 'text-yellow-600',
            'other': 'text-gray-600'
          };
          const bgColorMap = {
            'checking': 'bg-blue-500',
            'savings': 'bg-green-500',
            'credit': 'bg-purple-500', 
            'investment': 'bg-indigo-500',
            'cash': 'bg-yellow-500',
            'other': 'bg-gray-500'
          };
          const selectedBgMap = {
            'checking': 'bg-blue-50 border-blue-500',
            'savings': 'bg-green-50 border-green-500',
            'credit': 'bg-purple-50 border-purple-500',
            'investment': 'bg-indigo-50 border-indigo-500', 
            'cash': 'bg-yellow-50 border-yellow-500',
            'other': 'bg-gray-50 border-gray-500'
          };
          
          return (
            <div
              key={account.type}
              className={`group relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg ${
                isSelected
                  ? `${selectedBgMap[account.type]} shadow-lg scale-[1.01]`
                  : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
              } rounded-lg`}
              style={isSelected ? { borderLeft: `4px solid ${
                account.type === 'checking' ? '#3B82F6' : 
                account.type === 'savings' ? '#10B981' : 
                account.type === 'credit' ? '#8B5CF6' : 
                account.type === 'investment' ? '#6366F1' : 
                account.type === 'cash' ? '#F59E0B' : 
                '#6B7280'
              }` } : {}}
              onClick={() => handleAccountTypeSelect(account.type)}
            >

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <div className={`px-2 py-1 ${bgColorMap[account.type]} rounded text-white shadow-md flex items-center space-x-1`}>
                    <i className="fas fa-check text-xs"></i>
                    <span className="text-xs font-medium">Selected</span>
                  </div>
                </div>
              )}

              <div className="relative z-10 p-5">
                {/* Icon and Title */}
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${isSelected ? bgColorMap[account.type] : 'bg-gray-100'} rounded-lg flex items-center justify-center shadow-sm transition-all duration-300 mr-3`}>
                    <i className={`${account.icon} text-lg ${isSelected ? 'text-white' : iconColorMap[account.type]}`}></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{account.title}</h3>
                    <div className={`w-12 h-0.5 ${isSelected ? bgColorMap[account.type] : 'bg-gray-300'} transition-all duration-300`}></div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">{account.description}</p>

                {/* Features and Benefits */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                      <i className="fas fa-star text-yellow-500 text-xs mr-2"></i>
                      Key Features
                    </h4>
                    <ul className="space-y-1.5">
                      {account.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-start text-xs text-gray-600">
                          <div className={`w-1.5 h-1.5 ${isSelected ? bgColorMap[account.type] : 'bg-green-500'} rounded-sm mr-3 flex-shrink-0 mt-1.5`}></div>
                          <span className="leading-relaxed flex-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                      <i className="fas fa-target text-blue-500 text-xs mr-2"></i>
                      Perfect For
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {account.recommended.slice(0, 2).map((item, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 border ${
                            isSelected 
                              ? `${bgColorMap[account.type]} text-white shadow-sm border-transparent` 
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hover Effect Indicator */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${bgColorMap[account.type]} transform transition-all duration-300 rounded-b-lg ${
                  isSelected ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                }`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Experience Level Selection */}
      {selectedType && (
        <div className="animate-fade-in">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              What's your experience level with financial accounts?
            </h3>
            <p className="text-gray-600 mb-6">
              This helps us customize the setup process and provide appropriate guidance.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {experienceLevels.map((level) => (
                <div
                  key={level.level}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    experienceLevel === level.level
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExperienceLevel(level.level)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{level.title}</h4>
                    {experienceLevel === level.level && (
                      <i className="fas fa-check-circle text-blue-600"></i>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {level.features.slice(0, 2).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <i className="fas fa-dot-circle text-xs mr-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Optional Reason */}
      {selectedType && (
        <div className="animate-fade-in">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Why are you creating this account? (Optional)
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Building an emergency fund, Managing daily expenses, Saving for a vacation..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-2">
              This helps us provide better recommendations and tips. {200 - reason.length} characters remaining.
            </p>
          </div>
        </div>
      )}

      {/* Continue Button - Desktop only (mobile uses fixed footer) */}
      {selectedType && (
        <div className="hidden md:flex justify-center animate-fade-in">
          <button
            onClick={handleContinue}
            className="bg-[#4e73df] hover:bg-[#2e59d9] text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <span>Continue Setup</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}
    </div>
  );
});

AccountTypeChoiceStep.displayName = 'AccountTypeChoiceStep';

export default AccountTypeChoiceStep;
