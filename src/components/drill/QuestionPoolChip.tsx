import { Badge } from '@/components/ui/badge';

interface QuestionPoolChipProps {
  status: string;
  totalQuestions: number;
  availableQuestions: number;
}

export function QuestionPoolChip({ status, totalQuestions, availableQuestions }: QuestionPoolChipProps) {
  const isExhausted = availableQuestions === 0;
  const variant = isExhausted ? 'destructive' : 'secondary';

  return (
    <Badge variant={variant} className="text-xs font-normal">
      {status}
      {!isExhausted && availableQuestions < totalQuestions && (
        <span className="ml-1 opacity-70">
          ({availableQuestions}/{totalQuestions})
        </span>
      )}
    </Badge>
  );
}
