'use client';

import React from 'react';
import { useFeedback } from './FeedbackContext';
import { FeedbackCategory } from './FeedbackModal';

interface FeedbackTriggerButtonProps {
  category?: FeedbackCategory;
  storeName?: string;
  initialText?: string;
  className?: string;
  children: React.ReactNode;
}

export const FeedbackTriggerButton: React.FC<FeedbackTriggerButtonProps> = ({
  category = 'suggestion',
  storeName,
  initialText,
  className,
  children,
}) => {
  const { openFeedback } = useFeedback();

  return (
    <button
      type="button"
      onClick={() => openFeedback({ category, storeName, initialText })}
      className={className}
    >
      {children}
    </button>
  );
};
