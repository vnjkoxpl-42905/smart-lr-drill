import * as React from "react";
import { questionBank, QuestionManifest } from '@/lib/questionLoader';

interface QuestionBankContextType {
  manifest: QuestionManifest | null;
  isLoading: boolean;
  error: string | null;
}

const QuestionBankContext = React.createContext<QuestionBankContextType | undefined>(undefined);

export function QuestionBankProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = React.useState<QuestionManifest | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
  const context = React.useContext(QuestionBankContext);
  if (context === undefined) {
    throw new Error('useQuestionBank must be used within QuestionBankProvider');
  }
  return context;
}
