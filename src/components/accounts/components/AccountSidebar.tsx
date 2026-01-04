import React, { FC, memo, useMemo } from 'react';
import { ModalStep, ModalState, AccountType } from '../types/AccountSetupTypes';

interface Props {
  currentStep: ModalStep;
  accountType?: AccountType;
  modalState: ModalState;
  onTipClick: (tipId: string) => void;
}

const AccountSidebar: FC<Props> = memo(({
  currentStep,
  accountType,
  modalState,
  onTipClick
}) => {
  const getSidebarContent = useMemo(() => {
    switch (currentStep) {
      case 'workflow_choice':
        return <WorkflowChoiceTips onTipClick={onTipClick} />;
      case 'account_type_choice':
        return <AccountTypeChoiceTips onTipClick={onTipClick} />;
      case 'account_config':
        return <AccountConfigTips accountType={accountType} modalState={modalState} onTipClick={onTipClick} />;
      case 'cash_in_setup':
        return <CashInSetupTips modalState={modalState} onTipClick={onTipClick} />;
      case 'review_confirmation':
        return <ReviewConfirmationTips modalState={modalState} onTipClick={onTipClick} />;
      default:
        return <DefaultTips onTipClick={onTipClick} />;
    }
  }, [currentStep, accountType, modalState, onTipClick]);

  return (
    <div className="space-y-6">
      {getSidebarContent}
    </div>
  );
});

AccountSidebar.displayName = 'AccountSidebar';

// Account Type Choice Tips
const AccountTypeChoiceTips: React.FC<{ onTipClick: (tipId: string) => void }> = ({ onTipClick }) => (
  <>
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-lightbulb text-blue-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Choosing the Right Account</h4>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• <strong>Checking:</strong> For daily expenses and bill payments</li>
            <li>• <strong>Savings:</strong> For emergency funds and earning interest</li>
            <li>• <strong>Credit:</strong> For building credit and large purchases</li>
            <li>• <strong>Investment:</strong> For long-term wealth building</li>
            <li>• <strong>Cash:</strong> For tracking physical money</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-user-graduate text-green-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-green-900 mb-2">Experience Levels</h4>
          <ul className="text-green-800 text-sm space-y-2">
            <li>• <strong>Beginner:</strong> Simplified interface with guided setup</li>
            <li>• <strong>Intermediate:</strong> Balanced features and customization</li>
            <li>• <strong>Advanced:</strong> Full control and professional tools</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-yellow-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-star text-yellow-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-yellow-900 mb-2">Pro Tips</h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• Start with a checking or savings account if you're new</li>
            <li>• Consider your primary financial goals</li>
            <li>• You can always create more accounts later</li>
          </ul>
        </div>
      </div>
    </div>
  </>
);

// Account Config Tips
const AccountConfigTips: React.FC<{
  accountType?: AccountType;
  modalState: ModalState;
  onTipClick: (tipId: string) => void;
}> = ({ accountType, modalState, onTipClick }) => (
  <>
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-cog text-blue-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Account Setup Tips</h4>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• Use descriptive names like "Emergency Savings" or "Daily Checking"</li>
            <li>• Colors help you quickly identify accounts</li>
            <li>• Institution names help with bank reconciliation</li>
            <li>• Descriptions provide context for account purpose</li>
          </ul>
        </div>
      </div>
    </div>

    {accountType && (
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <i className="fas fa-info-circle text-purple-600 mt-1"></i>
          <div>
            <h4 className="font-medium text-purple-900 mb-2">
              {accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account Guidelines
            </h4>
            <div className="text-purple-800 text-sm space-y-1">
              {getAccountTypeGuidelines(accountType)}
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-chart-line text-gray-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Account Summary</h4>
          <div className="text-gray-700 text-sm space-y-1">
            <div>Name: {modalState.accountData.account_name || 'Not set'}</div>
            <div>
              Balance: ₱{(modalState.accountData.initial_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
            <div>Type: {accountType ? accountType.charAt(0).toUpperCase() + accountType.slice(1) : 'Not selected'}</div>
            <div>Default: {modalState.accountData.is_default ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  </>
);

// Cash-In Setup Tips
const CashInSetupTips: React.FC<{
  modalState: ModalState;
  onTipClick: (tipId: string) => void;
}> = ({ modalState, onTipClick }) => (
  <>
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-plus-circle text-green-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-green-900 mb-2">Initial Funding</h4>
          <ul className="text-green-800 text-sm space-y-2">
            <li>• Add funds now or skip and fund later</li>
            <li>• Describe the source for better tracking</li>
            <li>• Set realistic budget allocations</li>
            <li>• All transactions are automatically recorded</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-calculator text-blue-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Budget Planning</h4>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• Plan how to use your money effectively</li>
            <li>• Common categories: Food, Transport, Entertainment</li>
            <li>• Allocations help track spending goals</li>
            <li>• You can adjust budgets anytime</li>
          </ul>
        </div>
      </div>
    </div>

    {modalState.cashInData.amount > 0 && (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <i className="fas fa-money-bill-wave text-yellow-600 mt-1"></i>
          <div>
            <h4 className="font-medium text-yellow-900 mb-2">Cash-In Summary</h4>
            <div className="text-yellow-800 text-sm space-y-1">
              <div>Amount: ₱{modalState.cashInData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              <div>Description: {modalState.cashInData.description || 'Not set'}</div>
              <div>Source: {modalState.cashInData.source || 'Not specified'}</div>
              {(modalState.cashInData.budget_allocation?.length || 0) > 0 && (
                <div>
                  Budget Categories: {modalState.cashInData.budget_allocation?.length} planned
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

// Review Confirmation Tips
const ReviewConfirmationTips: React.FC<{
  modalState: ModalState;
  onTipClick: (tipId: string) => void;
}> = ({ modalState, onTipClick }) => (
  <>
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-check-circle text-green-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-green-900 mb-2">Ready to Create</h4>
          <ul className="text-green-800 text-sm space-y-2">
            <li>• Review all details carefully</li>
            <li>• Account will be created immediately</li>
            <li>• All activities will be logged</li>
            <li>• You can edit account details later</li>
            <li>• Cash-in transaction will be recorded</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-history text-blue-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Audit Trail</h4>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• Account creation will be logged</li>
            <li>• Initial funding recorded as transaction</li>
            <li>• All changes tracked for security</li>
            <li>• View history in account settings</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-purple-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-rocket text-purple-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-purple-900 mb-2">What's Next?</h4>
          <ul className="text-purple-800 text-sm space-y-2">
            <li>• Start tracking transactions</li>
            <li>• Set up additional accounts if needed</li>
            <li>• Create budgets and financial goals</li>
            <li>• Monitor your financial progress</li>
          </ul>
        </div>
      </div>
    </div>
  </>
);

// Default Tips
const DefaultTips: React.FC<{ onTipClick: (tipId: string) => void }> = ({ onTipClick }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex items-start space-x-3">
      <i className="fas fa-info-circle text-gray-600 mt-1"></i>
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Account Setup</h4>
        <p className="text-gray-700 text-sm">
          Follow the steps to create your new account. Each step includes helpful tips and guidance.
        </p>
      </div>
    </div>
  </div>
);

// Helper function to get account type specific guidelines
const getAccountTypeGuidelines = (accountType: AccountType) => {
  switch (accountType) {
    case 'checking':
      return (
        <>
          <div>• Can have positive, negative, or zero balance</div>
          <div>• Best for daily transactions and bill payments</div>
          <div>• Consider maintaining a minimum balance</div>
        </>
      );
    case 'savings':
      return (
        <>
          <div>• Should typically have positive balance</div>
          <div>• Aim for 3-6 months of expenses as emergency fund</div>
          <div>• Look for accounts with good interest rates</div>
        </>
      );
    case 'credit':
      return (
        <>
          <div>• Balance should be zero or negative (debt)</div>
          <div>• Pay full balance monthly to avoid interest</div>
          <div>• Keep utilization below 30% of credit limit</div>
        </>
      );
    case 'investment':
      return (
        <>
          <div>• Balance can fluctuate with market conditions</div>
          <div>• Focus on long-term growth strategy</div>
          <div>• Diversify your investment portfolio</div>
        </>
      );
    case 'cash':
      return (
        <>
          <div>• Should have positive balance</div>
          <div>• Keep reasonable amount for emergencies</div>
          <div>• Track cash expenses carefully</div>
        </>
      );
    default:
      return (
        <>
          <div>• Define the specific purpose of this account</div>
          <div>• Set appropriate tracking and monitoring</div>
          <div>• Review account performance regularly</div>
        </>
      );
  }
};

// Workflow Choice Tips
const WorkflowChoiceTips: React.FC<{ onTipClick: (tipId: string) => void }> = ({ onTipClick }) => (
  <>
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-route text-green-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-green-900 mb-2">Choose Your Path</h4>
          <ul className="text-green-800 text-sm space-y-2">
            <li>• <strong>New Account:</strong> Create fresh accounts from scratch</li>
            <li>• <strong>Cash In:</strong> Add money to existing zero-balance accounts</li>
            <li>• Both options help you start tracking finances effectively</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-money-bill-wave text-blue-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-blue-900 mb-2">Why Cash In?</h4>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• Activate dormant accounts with zero balances</li>
            <li>• Start tracking real transactions immediately</li>
            <li>• Build financial habits with actual money flows</li>
            <li>• Get meaningful insights from day one</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-purple-50 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <i className="fas fa-lightbulb text-purple-600 mt-1"></i>
        <div>
          <h4 className="font-medium text-purple-900 mb-2">Pro Tip</h4>
          <p className="text-purple-800 text-sm">
            Starting with actual money in your accounts gives you realistic data for budgeting, 
            spending analysis, and financial planning. Empty accounts provide limited insights!
          </p>
        </div>
      </div>
    </div>
  </>
);

export default AccountSidebar;
