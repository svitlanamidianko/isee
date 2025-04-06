import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS } from '../config';

interface CommentInputProps {
  cardId: string;
  onSubmitSuccess?: () => void;
  isSubmitting?: boolean;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({ 
  cardId, 
  onSubmitSuccess, 
  isSubmitting = false,
  onSubmittingChange 
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear comment when cardId changes
  useEffect(() => {
    setComment('');
  }, [cardId]);

  const submitComment = async () => {
    if (!comment.trim()) return;

    try {
      const response = await fetch(API_ENDPOINTS.createEntry, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_text: comment.trim(),
          media_id: cardId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    }
  };

  // Auto-submit when isSubmitting becomes true
  useEffect(() => {
    if (isSubmitting) {
      submitComment();
    }
  }, [isSubmitting]);

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (onSubmittingChange) {
                onSubmittingChange(true);
              }
            }
          }}
          placeholder="what do you see?"
          className="w-full lowercase bg-transparent border-b border-white/20 
                   text-white placeholder-white focus:outline-none focus:border-white/40
                   font-[Papyrus] text-[30px] text-center placeholder:text-center
                   tracking-wider placeholder:tracking-wider
                   transition-all duration-300 ease-in-out
                   hover:border-white/40 focus:border-white/60
                   placeholder:opacity-90
                   pb-0 -mb-1"
          style={{
            fontFamily: 'Papyrus, fantasy',
            textShadow: '0 0 10px rgba(255,255,255,0.3)'
          }}
          disabled={isSubmitting}
        />
      </div>
    </motion.div>
  );
};

export default CommentInput; 