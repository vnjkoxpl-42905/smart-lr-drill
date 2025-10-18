import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/highlightUtils";

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
  onHighlightClick?: (id: string) => void;
  eraserMode?: boolean;
}

export function HighlightedText({ 
  text, 
  highlights, 
  onHighlightClick, 
  eraserMode 
}: HighlightedTextProps) {
  if (highlights.length === 0) {
    return <>{text}</>;
  }

  // Sort highlights by start position
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  
  // Build segments: [text, highlight, text, highlight, ...]
  const segments: JSX.Element[] = [];
  let lastIndex = 0;
  
  sorted.forEach((highlight, i) => {
    // Add text before highlight
    if (highlight.start > lastIndex) {
      segments.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, highlight.start)}</span>
      );
    }
    
    // Add highlighted text
    segments.push(
      <mark
        key={`highlight-${highlight.id}`}
        className={cn(
          "bg-yellow-300/60 rounded-sm px-0.5 transition-all",
          eraserMode && "cursor-pointer hover:bg-red-300/60 hover:line-through"
        )}
        onClick={() => eraserMode && onHighlightClick?.(highlight.id)}
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>
    );
    
    lastIndex = highlight.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-end">{text.slice(lastIndex)}</span>
    );
  }
  
  return <>{segments}</>;
}
