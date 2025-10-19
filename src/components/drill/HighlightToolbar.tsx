import { Button } from "@/components/ui/button";
import { Highlighter, Underline, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

type HighlightMode = 'none' | 'highlight' | 'underline' | 'erase';

interface HighlightToolbarProps {
  mode: HighlightMode;
  onModeChange: (mode: HighlightMode) => void;
}

export function HighlightToolbar({ mode, onModeChange }: HighlightToolbarProps) {
  const toggleHighlight = () => {
    onModeChange(mode === 'highlight' ? 'none' : 'highlight');
  };

  const toggleUnderline = () => {
    onModeChange(mode === 'underline' ? 'none' : 'underline');
  };

  const toggleEraser = () => {
    onModeChange(mode === 'erase' ? 'none' : 'erase');
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={mode === 'highlight' ? 'default' : 'outline'}
        size="sm"
        onClick={toggleHighlight}
        className={cn(
          "transition-all",
          mode === 'highlight' && 
          "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:shadow-lg hover:from-yellow-500 hover:to-yellow-600"
        )}
      >
        <Highlighter className="w-4 h-4 mr-2" />
        Highlight
      </Button>

      <Button
        variant={mode === 'underline' ? 'default' : 'outline'}
        size="sm"
        onClick={toggleUnderline}
        className={cn(
          "transition-all",
          mode === 'underline' && 
          "bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:from-blue-600 hover:to-blue-700"
        )}
      >
        <Underline className="w-4 h-4 mr-2" />
        Underline
      </Button>

      <Button
        variant={mode === 'erase' ? 'default' : 'outline'}
        size="sm"
        onClick={toggleEraser}
        className={cn(
          "transition-all",
          mode === 'erase' && 
          "bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:from-pink-600 hover:to-rose-600"
        )}
      >
        <Eraser className="w-4 h-4 mr-2" />
        Erase
      </Button>
    </div>
  );
}
