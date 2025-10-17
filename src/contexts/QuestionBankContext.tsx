import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { questionBank, QuestionManifest } from '@/lib/questionLoader';

interface QuestionBankContextType {
  manifest: QuestionManifest | null;
  isLoading: boolean;
  error: string | null;
}

const QuestionBankContext = createContext<QuestionBankContextType | undefined>(undefined);

export function QuestionBankProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<QuestionManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBank = async () => {
      try {
        await questionBank.load();
        setManifest(questionBank.getManifest());
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load question bank:', err);
        setError('Failed to load questions');
        setIsLoading(false);
      }
    };

    loadBank();
  }, []);

  return (
    <QuestionBankContext.Provider value={{ manifest, isLoading, error }}>
      {children}
    </QuestionBankContext.Provider>
  );
}

export function useQuestionBank() {
  const context = useContext(QuestionBankContext);
  if (context === undefined) {
    throw new Error('useQuestionBank must be used within QuestionBankProvider');
  }
  return context;
}
