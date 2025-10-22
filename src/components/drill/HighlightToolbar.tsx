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
            title="Undo"
            className="h-7 w-7 shrink-0 opacity-50 hover:opacity-100"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-border/30 mx-0.5" />
        </>
      )}

      {/* Color Dot Buttons - Smaller and quieter */}
      <button
        onClick={() => onModeChange(mode === 'yellow' ? 'none' : 'yellow')}
        title="Bright Yellow"
        className={cn(
          "h-6 w-6 rounded-full transition-all shrink-0",
          mode === 'yellow' 
            ? "bg-yellow-400 ring-2 ring-yellow-400/50 scale-105" 
            : "bg-yellow-400/60 hover:bg-yellow-400 opacity-60 hover:opacity-100"
        )}
        aria-label="Bright yellow highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'pink' ? 'none' : 'pink')}
        title="Pink"
        className={cn(
          "h-6 w-6 rounded-full transition-all shrink-0",
          mode === 'pink' 
            ? "bg-pink-400 ring-2 ring-pink-400/50 scale-105" 
            : "bg-pink-400/60 hover:bg-pink-400 opacity-60 hover:opacity-100"
        )}
        aria-label="Pink highlight"
      />

      <button
        onClick={() => onModeChange(mode === 'orange' ? 'none' : 'orange')}
        title="Orange"
        className={cn(
          "h-6 w-6 rounded-full transition-all shrink-0",
          mode === 'orange' 
            ? "bg-orange-400 ring-2 ring-orange-400/50 scale-105" 
            : "bg-orange-400/60 hover:bg-orange-400 opacity-60 hover:opacity-100"
        )}
        aria-label="Orange highlight"
      />

      <div className="w-px h-4 bg-border/30 mx-0.5" />

      {/* Utility Icon Buttons - Smaller and quieter */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onModeChange(mode === 'underline' ? 'none' : 'underline')}
        className={cn(
          "h-7 w-7 shrink-0 transition-all",
          mode === 'underline' 
            ? "bg-foreground/90 hover:bg-foreground" 
            : "opacity-50 hover:opacity-100"
        )}
        title="Underline"
      >
        <Underline className={cn("w-3.5 h-3.5", mode === 'underline' && "text-background")} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onModeChange(mode === 'erase' ? 'none' : 'erase')}
        className={cn(
          "h-7 w-7 shrink-0 transition-all",
          mode === 'erase' 
            ? "bg-destructive hover:bg-destructive/90" 
            : "opacity-50 hover:opacity-100"
        )}
        title="Erase"
      >
        <Eraser className={cn("w-3.5 h-3.5", mode === 'erase' && "text-background")} />
      </Button>

      {/* Flag Button - 44x44px hit area */}
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
              "h-11 w-11 shrink-0 transition-all",
              isFlagged 
                ? "text-foreground hover:text-foreground/80" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isFlagged ? "Unflag question" : "Flag question"}
          >
            <Flag className={cn("w-5 h-5 transition-all", isFlagged && "fill-current")} />
          </Button>
        </>
      )}
    </div>
  );
}
