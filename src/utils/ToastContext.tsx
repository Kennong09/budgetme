import React, { createContext, useContext, ReactNode } from 'react';
import { toast, ToastContainer, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ToastContextType {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  showInfoToast: (message: string) => void;
  showWarningToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Default toast options
  const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  };

  const showSuccessToast = (message: string) => {
    toast.success(message, defaultOptions);
  };

  const showErrorToast = (message: string) => {
    toast.error(message, defaultOptions);
  };

  const showInfoToast = (message: string) => {
    toast.info(message, defaultOptions);
  };

  const showWarningToast = (message: string) => {
    toast.warning(message, defaultOptions);
  };

  const value = {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}; 