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
    <div className="flex flex-wrap items-center gap-1">
      {/* Undo Button */}
      {onUndo && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last highlight"
            className="h-8 w-8 shrink-0 hover:bg-muted disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border/30 mx-0.5" />
        </>
      )}

      {/* Color Dot Buttons */}
      <button
        onClick={() => onModeChange(mode === 'yellow' ? 'none' : 'yellow')}
        title="Bright Yellow Highlighter"
        className={cn(
          "h-7 w-7 rounded-full transition-all shrink-0 border-2",
          mode === 'yellow' 
            ? "bg-yellow-400 border-yellow-500 ring-2 ring-yellow-400/30 scale-110 shadow-sm" 
            : "bg-yellow-400 border-yellow-400/50 hover:border-yellow-500 hover:scale-105"
        )}
        aria-label="Bright yellow highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'pink' ? 'none' : 'pink')}
        title="Pink Highlighter"
        className={cn(
          "h-7 w-7 rounded-full transition-all shrink-0 border-2",
          mode === 'pink' 
            ? "bg-pink-400 border-pink-500 ring-2 ring-pink-400/30 scale-110 shadow-sm" 
            : "bg-pink-400 border-pink-400/50 hover:border-pink-500 hover:scale-105"
        )}
        aria-label="Pink highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'orange' ? 'none' : 'orange')}
        title="Orange Highlighter"
        className={cn(
          "h-7 w-7 rounded-full transition-all shrink-0 border-2",
          mode === 'orange' 
            ? "bg-orange-400 border-orange-500 ring-2 ring-orange-400/30 scale-110 shadow-sm" 
            : "bg-orange-400 border-orange-400/50 hover:border-orange-500 hover:scale-105"
        )}
        aria-label="Orange highlight"
      />

      <div className="w-px h-4 bg-border/30 mx-0.5" />

      {/* Utility Icon Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onModeChange(mode === 'underline' ? 'none' : 'underline')}
        className={cn(
          "h-8 w-8 shrink-0 transition-all",
          mode === 'underline' 
            ? "bg-foreground text-background hover:bg-foreground/90" 
            : "hover:bg-muted"
        )}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onModeChange(mode === 'erase' ? 'none' : 'erase')}
        className={cn(
          "h-8 w-8 shrink-0 transition-all",
          mode === 'erase' 
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
            : "hover:bg-muted"
        )}
        title="Eraser - Click and drag to remove highlights"
      >
        <Eraser className="w-4 h-4" />
      </Button>

      {/* Flag Button */}
      {onToggleFlag && (
        <>
          <div className="w-px h-4 bg-border/30 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFlag}
            role="button"
            aria-pressed={isFlagged}
            aria-label="Flag question"
            className={cn(
              "h-9 w-9 shrink-0 transition-all",
              isFlagged 
                ? "text-orange-600 hover:text-orange-700" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isFlagged ? "Unflag question" : "Flag for review"}
          >
            <Flag className={cn("w-5 h-5 transition-all", isFlagged && "fill-current")} />
          </Button>
        </>
      )}
    </div>
  );
}
