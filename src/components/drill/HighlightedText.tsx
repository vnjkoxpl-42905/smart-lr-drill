import React from "react";
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
  // Detect multi-speaker dialogue pattern (e.g., "Speaker: text\n\nSpeaker: text")
  const speakerPattern = /^([A-Z][a-z]+):\s+/;
  const segments = text.split('\n\n');
  
  // Check if this is a dialogue (at least 2 segments starting with speaker names)
  const dialogueTurns = segments
    .map(seg => {
      const match = seg.match(speakerPattern);
      if (match) {
        return {
          speaker: match[1],
          text: seg.slice(match[0].length).trim()
        };
      }
      return null;
    })
    .filter(Boolean);
  
  const isDialogue = dialogueTurns.length >= 2 && dialogueTurns.length === segments.length;
  
  if (isDialogue) {
    // Calculate text offsets for each turn
    let currentOffset = 0;
    const turnRanges = dialogueTurns.map(turn => {
      // Find the turn's position in original text including "Speaker: " prefix
      const speakerPrefix = `${turn!.speaker}: `;
      const turnText = turn!.text;
      const start = currentOffset + speakerPrefix.length;
      const end = start + turnText.length;
      currentOffset = text.indexOf('\n\n', currentOffset);
      if (currentOffset === -1) currentOffset = text.length;
      else currentOffset += 2; // Skip '\n\n'
      
      return { turn: turn!, start, end };
    });
    
    // Render as dialogue layout
    return (
      <div className="space-y-3 mb-5">
        {turnRanges.map((turnRange, idx) => {
          const turnLabel = idx === 0 ? 'says' : 'replies';
          
          // Find highlights that overlap with this turn
          const turnHighlights = highlights.filter(h => 
            h.start < turnRange.end && h.end > turnRange.start
          ).map(h => ({
            ...h,
            start: Math.max(0, h.start - turnRange.start),
            end: Math.min(turnRange.turn.text.length, h.end - turnRange.start)
          }));
          
          let content: React.ReactNode;
          
          if (turnHighlights.length === 0) {
            content = turnRange.turn.text;
          } else {
            // Build segments with highlights
            const sorted = turnHighlights.sort((a, b) => a.start - b.start);
            const segments: JSX.Element[] = [];
            let lastIndex = 0;
            
            sorted.forEach((highlight, i) => {
              if (highlight.start > lastIndex) {
                segments.push(
                  <span key={`text-${i}`}>{turnRange.turn.text.slice(lastIndex, highlight.start)}</span>
                );
              }
              
              segments.push(
                <mark
                  key={`highlight-${highlight.id}`}
                  className={cn(
                    "bg-yellow-300/60 rounded-sm px-0.5 transition-all",
                    eraserMode && "cursor-pointer hover:bg-red-300/60 hover:line-through"
                  )}
                  onClick={() => eraserMode && onHighlightClick?.(highlight.id)}
                >
                  {turnRange.turn.text.slice(highlight.start, highlight.end)}
                </mark>
              );
              
              lastIndex = highlight.end;
            });
            
            if (lastIndex < turnRange.turn.text.length) {
              segments.push(
                <span key="text-end">{turnRange.turn.text.slice(lastIndex)}</span>
              );
            }
            
            content = <>{segments}</>;
          }
          
          return (
            <section 
              key={idx}
              aria-label={`${turnRange.turn.speaker} ${turnLabel}`}
              className="flex gap-3"
            >
              <div 
                className="w-[72px] flex-shrink-0 text-right font-semibold text-sm"
                style={{ 
                  color: '#111827',
                  fontVariant: 'small-caps',
                  paddingTop: '2px'
                }}
              >
                {turnRange.turn.speaker}:
              </div>
              <div 
                className="flex-1 pl-3"
                style={{ 
                  borderLeft: '1px solid #E5E7EB',
                  lineHeight: 1.6 
                }}
              >
                {content}
              </div>
            </section>
          );
        })}
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
