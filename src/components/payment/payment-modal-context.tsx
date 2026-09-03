'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { PaymentModal } from './payment-modal';

export interface OpenPaymentModalOptions {
  courseSlug?: string;
  courseTitle?: string;
  defaultTariffId?: string;
}

interface PaymentModalContextType {
  openPaymentModal: (options?: OpenPaymentModalOptions) => void;
  closePaymentModal: () => void;
  isOpen: boolean;
}

const PaymentModalContext = createContext<PaymentModalContextType | null>(null);

export function PaymentModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<OpenPaymentModalOptions>({});

  const openPaymentModal = useCallback((options?: OpenPaymentModalOptions) => {
    setModalOptions(options || {});
    setIsOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <PaymentModalContext.Provider
      value={{
        openPaymentModal,
        closePaymentModal,
        isOpen,
      }}
    >
      {children}
      <PaymentModal
        isOpen={isOpen}
        onClose={closePaymentModal}
        courseSlug={modalOptions.courseSlug}
        courseTitle={modalOptions.courseTitle}
        defaultTariffId={modalOptions.defaultTariffId}
      />
    </PaymentModalContext.Provider>
  );
}

export function usePaymentModal() {
  const context = useContext(PaymentModalContext);
  if (!context) {
    throw new Error('usePaymentModal must be used within a PaymentModalProvider');
  }
  return context;
}
