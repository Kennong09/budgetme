import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, AlertTriangle } from 'lucide-react';

interface RateLimitInfoProps {
  type: 'signup' | 'email' | 'timeout' | 'general';
  waitTime?: number;
  className?: string;
}

export const RateLimitInfo: React.FC<RateLimitInfoProps> = ({ 
  type, 
  waitTime, 
  className = '' 
}) => {
  const getInfoContent = () => {
    switch (type) {
      case 'signup':
        return {
          title: 'Signup Rate Limit',
          description: waitTime 
            ? `Please wait ${waitTime} seconds before trying to sign up again.`
            : 'Too many signup attempts. Please wait a few minutes before trying again.',
          tips: [
            'Check your spam folder for the verification email',
            'Make sure you\'re using a valid email address',
            'Try using a different email provider if issues persist'
          ],
          icon: <AlertTriangle className="h-4 w-4" />
        };
      
      case 'email':
        return {
          title: 'Email Rate Limit',
          description: waitTime 
            ? `Please wait ${waitTime} seconds before requesting another email.`
            : 'Too many email requests. Please wait before trying again.',
          tips: [
            'Check your spam/junk folder',
            'Verification emails can take up to 5 minutes to arrive',
            'Contact support if you still don\'t receive the email after waiting'
          ],
          icon: <Mail className="h-4 w-4" />
        };
      
      case 'timeout':
        return {
          title: 'Server Timeout',
          description: 'The server took too long to respond. Your account may have been created successfully.',
          tips: [
            'Check your email for a verification link',
            'Try signing in with your credentials if the account was created',
            'Wait a moment before trying to sign up again',
            'Contact support if this issue persists'
          ],
          icon: <Clock className="h-4 w-4" />
        };
      
      default:
        return {
          title: 'Rate Limit Reached',
          description: 'Too many requests. Please wait before trying again.',
          tips: [
            'This helps protect our service from abuse',
            'Try again in a few minutes',
            'Contact support if this issue persists'
          ],
          icon: <Clock className="h-4 w-4" />
        };
    }
  };

  const { title, description, tips, icon } = getInfoContent();

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-orange-600 mt-0.5">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-orange-800 mb-1">
            {title}
          </h4>
          <AlertDescription className="text-orange-700 text-sm mb-3">
            {description}
          </AlertDescription>
          
          <div className="text-xs text-orange-600">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          {type === 'signup' && (
            <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
              <strong>Note:</strong> We use Gmail for sending emails, which has strict rate limits. 
              This helps ensure reliable email delivery for all users.
            </div>
          )}

          {type === 'timeout' && (
            <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
              <strong>What happened?</strong> Our email server is experiencing delays. 
              Your signup request may have succeeded despite the timeout.
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default RateLimitInfo;