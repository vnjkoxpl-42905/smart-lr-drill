import { Button } from "@/components/ui/button";
import { Highlighter, Underline, Eraser, Flag, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type HighlightMode = 'none' | 'yellow' | 'orange' | 'green' | 'underline' | 'erase';

interface HighlightToolbarProps {
  mode: HighlightMode;
  onModeChange: (mode: HighlightMode) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export function HighlightToolbar({ 
  mode, 
  onModeChange, 
  isFlagged = false, 
  onToggleFlag, 
  onUndo, 
  canUndo = false 
}: HighlightToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Undo Button */}
      {onUndo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last highlight (Ctrl+Z)"
          className="shrink-0"
        >
          <Undo2 className="w-4 h-4 mr-2" />
          Undo
        </Button>
      )}

      {/* Divider */}
      {onUndo && <div className="w-px h-6 bg-border" />}

      {/* Color Highlight Buttons */}
      <Button
        variant={mode === 'yellow' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange(mode === 'yellow' ? 'none' : 'yellow')}
        className={cn(
          "transition-all shrink-0",
          mode === 'yellow' && 
          "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:shadow-lg hover:from-yellow-500 hover:to-yellow-600"
        )}
        title="Yellow Highlight"
      >
        <Highlighter className="w-4 h-4 mr-2" />
        Yellow
      </Button>

      <Button
        variant={mode === 'orange' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange(mode === 'orange' ? 'none' : 'orange')}
        className={cn(
          "transition-all shrink-0",
          mode === 'orange' && 
          "bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:shadow-lg hover:from-orange-500 hover:to-orange-600"
        )}
        title="Orange Highlight"
      >
        <Highlighter className="w-4 h-4 mr-2" />
        Orange
      </Button>

      <Button
        variant={mode === 'green' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange(mode === 'green' ? 'none' : 'green')}
        className={cn(
          "transition-all shrink-0",
          mode === 'green' && 
          "bg-gradient-to-r from-green-400 to-green-500 text-white hover:shadow-lg hover:from-green-500 hover:to-green-600"
        )}
        title="Green Highlight"
      >
        <Highlighter className="w-4 h-4 mr-2" />
        Green
      </Button>

      {/* Underline Button */}
      <Button
        variant={mode === 'underline' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange(mode === 'underline' ? 'none' : 'underline')}
        className={cn(
          "transition-all shrink-0",
          mode === 'underline' && 
          "bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:from-blue-600 hover:to-blue-700"
        )}
        title="Underline"
      >
        <Underline className="w-4 h-4 mr-2" />
        Underline
      </Button>

      {/* Erase Button */}
      <Button
        variant={mode === 'erase' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange(mode === 'erase' ? 'none' : 'erase')}
        className={cn(
          "transition-all shrink-0",
          mode === 'erase' && 
          "bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:from-pink-600 hover:to-rose-600"
        )}
        title="Erase Highlights"
      >
        <Eraser className="w-4 h-4 mr-2" />
        Erase
      </Button>

      {/* Divider */}
      {onToggleFlag && <div className="w-px h-6 bg-border" />}

      {/* Flag Button */}
      {onToggleFlag && (
        <Button
          variant={isFlagged ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFlag}
          className={cn(
            "transition-all shrink-0",
            isFlagged && 
            "bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:from-blue-600 hover:to-blue-700"
          )}
          title={isFlagged ? "Unflag Question" : "Flag for Review"}
        >
          <Flag className="w-4 h-4 mr-2" />
          {isFlagged ? 'Flagged' : 'Flag'}
        </Button>
      )}
    </div>
  );
}
