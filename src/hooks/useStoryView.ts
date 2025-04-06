import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config';
import { useCardDeck } from './useCardDeck';
import { useEntries } from './useEntries';

interface Card {
  card_id: string;
  card_name: string;
  card_url: string;
  entries: Array<{ entry_text: string }>;
  linkie: string;
  order: string;
  text: string;
  is_horizontal: boolean;
}

export const useStoryView = () => {
  const [hasAccess, setHasAccess] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Use our card deck hook
  const {
    springs,
    gone,
    isAnimating,
    allCardsSwiped,
    swipeCard,
    goBack,
    reset,
    getRelativePosition,
    api,
    currentCard
  } = useCardDeck(cards);

  // Use entries hook with current card
  const entryStates = useEntries(currentCard);

  // Fetch story data
  const fetchStoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.storyView);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('API Response:', data);
      // Sort cards in descending order (highest to lowest)
      const sortedCards = data.cards.sort((a: Card, b: Card) => parseInt(b.order) - parseInt(a.order));
      console.log('Setting sorted cards:', sortedCards);
      setCards(sortedCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch story data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStoryData();
  }, [fetchStoryData]);

  const handleCommentSubmit = useCallback(() => {
    console.log('Comment submitted successfully');
    // Only swipe the card after successful submission
    if (currentCard) {
      const currentIndex = cards.indexOf(currentCard);
      if (currentIndex !== -1) {
        swipeCard(currentIndex, 1);
      }
    }
  }, [currentCard, cards, swipeCard]);

  const handleSubmittingChange = useCallback((submitting: boolean) => {
    setIsSubmittingEntry(submitting);
  }, []);

  const retryFetch = useCallback(() => {
    fetchStoryData();
  }, [fetchStoryData]);

  return {
    hasAccess,
    setHasAccess,
    cards,
    isLoading,
    error,
    springs,
    gone,
    isAnimating,
    allCardsSwiped,
    swipeCard,
    goBack,
    reset,
    getRelativePosition,
    api,
    currentCard,
    entryStates,
    handleCommentSubmit,
    handleSubmittingChange,
    retryFetch,
    isSubmittingEntry
  };
}; 