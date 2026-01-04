import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { logAuthDebugInfo } from '../../utils/authDebug';

// Google Icon as inline SVG component for Vite compatibility
const GoogleIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" {...props}>
    <path fill="#fff" d="M44.59 4.21a63.28 63.28 0 004.33 120.9 67.6 67.6 0 0032.36.35 57.13 57.13 0 0025.9-13.46 57.44 57.44 0 0016-26.26 74.33 74.33 0 001.61-33.58H65.27v24.69h34.47a29.72 29.72 0 01-12.66 19.52 36.16 36.16 0 01-13.93 5.5 41.29 41.29 0 01-15.1 0A37.16 37.16 0 0144 95.74a39.3 39.3 0 01-14.5-19.42 38.31 38.31 0 010-24.63 39.25 39.25 0 019.18-14.91A37.17 37.17 0 0176.13 27a34.28 34.28 0 0113.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.22 61.22 0 0087.2 4.59a64 64 0 00-42.61-.38z"/>
    <path fill="#e33629" d="M44.59 4.21a64 64 0 0142.61.37 61.22 61.22 0 0120.35 12.62c-2 2.14-4.11 4.14-6.15 6.22Q95.58 29.23 89.77 35a34.28 34.28 0 00-13.64-8 37.17 37.17 0 00-37.46 9.74 39.25 39.25 0 00-9.18 14.91L8.76 35.6A63.53 63.53 0 0144.59 4.21z"/>
    <path fill="#f8bd00" d="M3.26 51.5a62.93 62.93 0 015.5-15.9l20.73 16.09a38.31 38.31 0 000 24.63q-10.36 8-20.73 16.08a63.33 63.33 0 01-5.5-40.9z"/>
    <path fill="#587dbd" d="M65.27 52.15h59.52a74.33 74.33 0 01-1.61 33.58 57.44 57.44 0 01-16 26.26c-6.69-5.22-13.41-10.4-20.1-15.62a29.72 29.72 0 0012.66-19.54H65.27c-.01-8.22 0-16.45 0-24.68z"/>
    <path fill="#319f43" d="M8.75 92.4q10.37-8 20.73-16.08A39.3 39.3 0 0044 95.74a37.16 37.16 0 0014.08 6.08 41.29 41.29 0 0015.1 0 36.16 36.16 0 0013.93-5.5c6.69 5.22 13.41 10.4 20.1 15.62a57.13 57.13 0 01-25.9 13.47 67.6 67.6 0 01-32.36-.35 63 63 0 01-23-11.59A63.73 63.73 0 018.75 92.4z"/>
  </svg>
);

const AuthCallback: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Handle the OAuth/Auth callback
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...', window.location.href);
        
        // Check for authentication fragments in URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for redirect destination
        const nextUrl = urlParams.get('next');
        const isPasswordReset = nextUrl === '/reset-password';
        
        const hasAuthParams = (
          urlParams.has('code') || 
          urlParams.has('access_token') ||
          urlParams.has('refresh_token') ||
          hashParams.has('access_token') ||
          hashParams.has('refresh_token') ||
          urlParams.has('token')
        );
        
        if (!hasAuthParams) {
          console.log('No authentication parameters found in URL');
          if (mounted) {
            navigate('/', { replace: true });
          }
          return;
        }
        
        // Handle PKCE code exchange
        const code = urlParams.get('code');
        if (code) {
          console.log('Processing PKCE code exchange for:', isPasswordReset ? 'password reset' : 'OAuth login');
          
          let exchangeData;
          try {
            // Exchange the OAuth code for a session
            console.log('Exchanging code for session...');
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            exchangeData = data;
            
            console.log('Exchange result:', {
              hasData: !!data,
              hasSession: !!data?.session,
              hasUser: !!data?.session?.user,
              hasError: !!exchangeError,
              error: exchangeError
            });
            
            if (exchangeError) {
              console.error('Error exchanging code for session:', exchangeError);
              
              // Handle specific PKCE errors
              if (exchangeError.message?.includes('code verifier') || exchangeError.message?.includes('invalid request')) {
                console.log('PKCE flow issue detected, attempting session recovery');
                await logAuthDebugInfo();
                
                // Try to get session directly as fallback (maybe it was established already)
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.user) {
                  console.log('Session recovery successful');
                  if (mounted) {
                    if (isPasswordReset) {
                      navigate('/reset-password', { replace: true });
                    } else {
                      // Check if user is admin and redirect accordingly
                      try {
                        const { isUserAdmin } = await import('../../utils/adminHelpers');
                        const isAdmin = await isUserAdmin();
                        if (isAdmin) {
                          navigate('/admin/dashboard', { replace: true });
                        } else {
                          navigate('/dashboard', { replace: true });
                        }
                      } catch (adminCheckError) {
                        console.error('Error checking admin status:', adminCheckError);
                        navigate('/dashboard', { replace: true });
                      }
                    }
                  }
                  return;
                }
              }
              
              if (mounted) {
                if (isPasswordReset) {
                  navigate('/reset-password?error=' + encodeURIComponent('Invalid or expired reset link. Please request a new password reset link from your email.'), { replace: true });
                } else {
                  navigate('/?error=' + encodeURIComponent('Authentication failed. Please try again.'), { replace: true });
                }
              }
              return;
            }
          } catch (exchangeError: any) {
            console.error('Exception during code exchange:', exchangeError);
            if (mounted) {
              if (isPasswordReset) {
                navigate('/reset-password?error=' + encodeURIComponent('Authentication failed. Please request a new reset link.'), { replace: true });
              } else {
                navigate('/?error=' + encodeURIComponent('Authentication failed. Please try again.'), { replace: true });
              }
            }
            return;
          }
          
          if (exchangeData?.session?.user) {
            console.log('PKCE authentication successful for:', exchangeData.session.user.email);
            
            // Verify the session is properly stored
            const { data: verifySession } = await supabase.auth.getSession();
            console.log('Session verification after exchange:', {
              hasSession: !!verifySession?.session,
              hasUser: !!verifySession?.session?.user,
              userId: verifySession?.session?.user?.id
            });
            
            // Give the auth context a moment to process the session
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if (mounted) {
              if (isPasswordReset) {
                console.log('Redirecting to password reset form');
                navigate('/reset-password', { replace: true });
              } else {
                console.log('Redirecting to dashboard');
                // Check if user is admin and redirect accordingly
                try {
                  const { isUserAdmin } = await import('../../utils/adminHelpers');
                  const isAdmin = await isUserAdmin();
                  if (isAdmin) {
                    navigate('/admin/dashboard', { replace: true });
                  } else {
                    navigate('/dashboard', { replace: true });
                  }
                } catch (adminCheckError) {
                  console.error('Error checking admin status:', adminCheckError);
                  navigate('/dashboard', { replace: true });
                }
              }
            }
            return;
          } else {
            console.warn('No session or user in exchange data:', exchangeData);
          }
        }
        
        // Legacy token handling
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Setting session from tokens');
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionData?.session?.user && mounted) {
            if (isPasswordReset) {
              navigate('/reset-password', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }
        
        // Wait a moment for Supabase to process the authentication
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the current session as fallback
        const { data: fallbackData, error: fallbackError } = await supabase.auth.getSession();
        
        if (fallbackError) {
          console.error('Error getting session after auth callback:', fallbackError.message);
          if (mounted) {
            if (isPasswordReset) {
              navigate('/reset-password?error=' + encodeURIComponent(fallbackError.message), { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }
          return;
        }
        
        if (fallbackData?.session?.user && mounted) {
          const user = fallbackData.session.user;
          
          console.log('Auth callback successful:', {
            userId: user.id,
            email: user.email,
            provider: user.app_metadata?.provider,
            emailVerified: !!user.email_confirmed_at,
            isPasswordReset
          });
          
          if (isPasswordReset) {
            console.log('Redirecting to password reset form');
            navigate('/reset-password', { replace: true });
          } else {
            console.log('Redirecting to dashboard');
            // Check if user is admin and redirect accordingly
            try {
              const { isUserAdmin } = await import('../../utils/adminHelpers');
              const isAdmin = await isUserAdmin();
              if (isAdmin) {
                navigate('/admin/dashboard', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            } catch (adminCheckError) {
              console.error('Error checking admin status:', adminCheckError);
              navigate('/dashboard', { replace: true });
            }
          }
        } else {
          console.log('No valid session found after auth callback');
          if (mounted) {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error('Error handling auth callback:', err);
        if (mounted) {
          navigate('/', { replace: true });
        }
      }
    };
    
    handleAuthCallback();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="auth-callback-container">
      <div className="loading-spinner">
        <div className="loading-spinner-icon-wrapper">
          <div className="loading-spinner-ring"></div>
          <div className="loading-spinner-ring"></div>
          <GoogleIcon className="loading-spinner-icon" />
        </div>
        <p>Completing authentication...</p>
        <p className="loading-spinner-subtitle">Please wait</p>
      </div>
    </div>
  );
};

export default AuthCallback; 