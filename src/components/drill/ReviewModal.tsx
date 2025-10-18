import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ReviewModalProps {
  open: boolean;
  onSave: (review: { whyWrong: string; whyEliminated: string; plan: string }) => void;
}

export function ReviewModal({ open, onSave }: ReviewModalProps) {
  const [whyWrong, setWhyWrong] = React.useState('');
  const [whyEliminated, setWhyEliminated] = React.useState('');
  const [plan, setPlan] = React.useState('');
  const { toast } = useToast();

  const handleSave = () => {
    if (!whyWrong.trim() || !whyEliminated.trim() || !plan.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill out all three reflection questions before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    onSave({ whyWrong, whyEliminated, plan });
    setWhyWrong('');
    setWhyEliminated('');
    setPlan('');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Quick review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="why-wrong">Why I chose the wrong answer</Label>
            <Textarea
              id="why-wrong"
              value={whyWrong}
              onChange={(e) => setWhyWrong(e.target.value)}
              placeholder="What made this choice seem correct?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="why-eliminated">Why I eliminated the right answer</Label>
            <Textarea
              id="why-eliminated"
              value={whyEliminated}
              onChange={(e) => setWhyEliminated(e.target.value)}
              placeholder="What made me rule out the correct answer?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan to avoid this next time</Label>
            <Textarea
              id="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="What will I do differently?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
