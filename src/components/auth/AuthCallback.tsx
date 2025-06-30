import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

const AuthCallback: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    const handleOAuthCallback = async () => {
      try {
        // Get the URL hash
        const hash = window.location.hash;
        
        // If there's no hash, check if there's an access token or refresh token in the URL query params
        if (!hash && !(
          window.location.search.includes('access_token') || 
          window.location.search.includes('refresh_token')
        )) {
          // No tokens in URL, redirect to home
          console.log('No authentication tokens found in URL, redirecting to home');
          navigate('/');
          return;
        }
        
        // Get the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          navigate('/');
          return;
        }
        
        if (data && data.session) {
          const user = data.session.user;
          
          // Log OAuth provider details
          if (user && user.app_metadata && user.app_metadata.provider) {
            console.log(`Successfully authenticated with ${user.app_metadata.provider}`);
            
            // With OAuth providers like Google, the email is already verified
            const isEmailVerified = user.email_confirmed_at || 
                                   (user.app_metadata.provider && 
                                    user.app_metadata.provider !== 'email');
                                    
            console.log(`User email verified: ${isEmailVerified ? 'Yes' : 'No'}`);
          }
          
          // Redirect to dashboard on successful authentication
          console.log('Authentication successful, redirecting to dashboard');
          
          // Use window.location.href for a full page reload to ensure the auth context is updated
          window.location.href = '/dashboard';
        } else {
          // If no session, redirect to home
          console.log('No session found, redirecting to home');
          navigate('/');
        }
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        navigate('/');
      }
    };
    
    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="auth-callback-container">
      <div className="loading-spinner">
        <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '3rem' }}></i>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 