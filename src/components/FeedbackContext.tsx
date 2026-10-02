'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackOptions {
  category?: 'suggestion' | 'store_missing' | 'bug' | 'general' | 'store_change';
  initialText?: string;
  storeName?: string;
}

interface FeedbackContextType {
  isOpen: boolean;
  openFeedback: (options?: FeedbackOptions) => void;
  closeFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<FeedbackOptions | undefined>();

  const openFeedback = useCallback((opts?: FeedbackOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
    setOptions(undefined);
  }, []);

  return (
    <FeedbackContext.Provider value={{ isOpen, openFeedback, closeFeedback }}>
      {children}
      <FeedbackModal
        isOpen={isOpen}
        onClose={closeFeedback}
        initialCategory={options?.category}
        initialText={options?.initialText}
        initialStoreName={options?.storeName}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
