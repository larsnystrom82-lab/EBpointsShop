'use client';

import React from 'react';
import { FeedbackProvider } from './FeedbackContext';
import { FeedbackFloatingButton } from './FeedbackFloatingButton';

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <FeedbackProvider>
      {children}
      <FeedbackFloatingButton />
    </FeedbackProvider>
  );
};
