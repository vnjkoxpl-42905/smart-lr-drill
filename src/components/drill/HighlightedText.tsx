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
  // Detect 2-speaker pattern (e.g., "Speaker1: text\n\nSpeaker2: text")
  const twoSpeakerPattern = /^([A-Z][a-z]+):\s+([\s\S]+?)\n\n([A-Z][a-z]+):\s+([\s\S]+)$/;
  const match = text.match(twoSpeakerPattern);
  
  if (match) {
    const [, speaker1, text1, speaker2, text2] = match;
    
    // For 2-speaker, render side-by-side with vertical separator
    return (
      <div className="grid grid-cols-2 gap-6 relative">
        {/* Speaker 1 */}
        <div>
          <div className="font-semibold mb-2">{speaker1}:</div>
          <div style={{ lineHeight: 1.6 }}>{text1}</div>
        </div>
        
        {/* Vertical Separator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border transform -translate-x-1/2" />
        
        {/* Speaker 2 */}
        <div>
          <div className="font-semibold mb-2">{speaker2}:</div>
          <div style={{ lineHeight: 1.6 }}>{text2}</div>
        </div>
      </div>
    );
  }
  
  // Split text into paragraphs while preserving structure
  const paragraphs = text.split('\n\n');
  
  if (highlights.length === 0) {
    return (
      <>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            {para}
          </p>
        ))}
      </>
    );
  }

  // Calculate paragraph boundaries
  let currentOffset = 0;
  const paragraphRanges = paragraphs.map(para => {
    const start = currentOffset;
    const end = currentOffset + para.length;
    currentOffset = end + 2; // Add 2 for '\n\n'
    return { start, end, text: para };
  });

  return (
    <>
      {paragraphRanges.map((paraRange, paraIndex) => {
        // Find highlights that overlap with this paragraph
        const paraHighlights = highlights.filter(h => 
          h.start < paraRange.end && h.end > paraRange.start
        ).map(h => ({
          ...h,
          // Adjust offsets to be relative to this paragraph
          start: Math.max(0, h.start - paraRange.start),
          end: Math.min(paraRange.text.length, h.end - paraRange.start)
        }));

        if (paraHighlights.length === 0) {
          return (
            <p key={paraIndex} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
              {paraRange.text}
            </p>
          );
        }

        // Sort highlights by start position
        const sorted = paraHighlights.sort((a, b) => a.start - b.start);
        
        // Build segments for this paragraph
        const segments: JSX.Element[] = [];
        let lastIndex = 0;
        
        sorted.forEach((highlight, i) => {
          // Add text before highlight
          if (highlight.start > lastIndex) {
            segments.push(
              <span key={`text-${i}`}>{paraRange.text.slice(lastIndex, highlight.start)}</span>
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
              {paraRange.text.slice(highlight.start, highlight.end)}
            </mark>
          );
          
          lastIndex = highlight.end;
        });
        
        // Add remaining text
        if (lastIndex < paraRange.text.length) {
          segments.push(
            <span key="text-end">{paraRange.text.slice(lastIndex)}</span>
          );
        }

        return (
          <p key={paraIndex} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            {segments}
          </p>
        );
      })}
    </>
  );
}
