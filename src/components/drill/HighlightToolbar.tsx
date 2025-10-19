import { Button } from "@/components/ui/button";
import { Underline, Eraser, Flag, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type HighlightMode = 'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase';

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
    <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 rounded-lg">
      {/* Undo Button */}
      {onUndo && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last highlight (Ctrl+Z)"
            className="h-8 w-8 shrink-0"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border/50 mx-1" />
        </>
      )}

      {/* Color Dot Buttons */}
      <button
        onClick={() => onModeChange(mode === 'yellow' ? 'none' : 'yellow')}
        title="Yellow Highlight"
        className={cn(
          "h-8 w-8 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-all shrink-0",
          mode === 'yellow' && "ring-2 ring-offset-2 ring-yellow-500 scale-110"
        )}
        aria-label="Yellow highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'pink' ? 'none' : 'pink')}
        title="Pink Highlight"
        className={cn(
          "h-8 w-8 rounded-full bg-pink-400 hover:bg-pink-500 transition-all shrink-0",
          mode === 'pink' && "ring-2 ring-offset-2 ring-pink-500 scale-110"
        )}
        aria-label="Pink highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'orange' ? 'none' : 'orange')}
        title="Orange Highlight"
        className={cn(
          "h-8 w-8 rounded-full bg-orange-400 hover:bg-orange-500 transition-all shrink-0",
          mode === 'orange' && "ring-2 ring-offset-2 ring-orange-500 scale-110"
        )}
        aria-label="Orange highlight"
      />

      <div className="w-px h-5 bg-border/50 mx-1" />

      {/* Utility Icon Buttons */}
      <Button
        variant={mode === 'underline' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onModeChange(mode === 'underline' ? 'none' : 'underline')}
        className={cn(
          "h-8 w-8 shrink-0 transition-all",
          mode === 'underline' && "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        )}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Button
        variant={mode === 'erase' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onModeChange(mode === 'erase' ? 'none' : 'erase')}
        className={cn(
          "h-8 w-8 shrink-0 transition-all",
          mode === 'erase' && "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
        )}
        title="Erase Highlights"
      >
        <Eraser className="w-4 h-4" />
      </Button>

      {/* Flag Button */}
      {onToggleFlag && (
        <>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <Button
            variant={isFlagged ? 'default' : 'ghost'}
            size="icon"
            onClick={onToggleFlag}
            className={cn(
              "h-8 w-8 shrink-0 transition-all",
              isFlagged && "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            )}
            title={isFlagged ? "Unflag Question" : "Flag for Review"}
          >
            <Flag className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}
