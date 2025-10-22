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
  // Detect multi-speaker dialogue pattern (e.g., "P: text\nQ: text")
  const speakerPattern = /^([A-Z]):\s+/;
  
  // Split text by speaker turns (e.g., "P: text\nQ: text")
  const turnSplitPattern = /(?=^[A-Z]:\s)/gm;
  const rawSegments = text.split(turnSplitPattern).filter(s => s.trim());
  
  // Parse each segment to extract speaker and text
  const dialogueTurns = rawSegments
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
  
  const isDialogue = dialogueTurns.length >= 2 && 
                     dialogueTurns.length === rawSegments.length &&
                     dialogueTurns.every(t => t !== null);
  
  if (isDialogue) {
    // Calculate text offsets for each turn
    let currentOffset = 0;
    const turnRanges = dialogueTurns.map((turn, idx) => {
      const speakerPrefix = `${turn!.speaker}: `;
      const turnText = turn!.text;
      
      // Find where this turn starts in original text
      const turnStart = text.indexOf(speakerPrefix, currentOffset);
      const start = turnStart + speakerPrefix.length;
      const end = start + turnText.length;
      
      currentOffset = end;
      
      return { turn: turn!, start, end };
    });
    
    // Render as clean vertical stack
    return (
      <div className="space-y-4">
        {turnRanges.map((turnRange, idx) => {
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
                  <span key={`text-${i}`}>
                    {turnRange.turn.text.slice(lastIndex, highlight.start)}
                  </span>
                );
              }
              
              const getHighlightStyles = (color: string) => {
                const baseStyles = {
                  display: 'inline' as const,
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  lineHeight: 'inherit',
                  letterSpacing: 'inherit',
                  wordSpacing: 'inherit',
                  verticalAlign: 'baseline',
                  whiteSpace: 'pre-wrap' as const,
                  background: 'none',
                  mixBlendMode: 'normal' as const,
                  borderRadius: 0,
                  WebkitBoxDecorationBreak: 'clone' as const,
                  boxDecorationBreak: 'clone' as const,
                };

                if (color === 'underline') {
                  return {
                    ...baseStyles,
                    textDecoration: 'underline',
                    textDecorationColor: 'currentColor',
                    textDecorationThickness: '2px',
                    textUnderlineOffset: '2px',
                  };
                }

                const shadowColors = {
                  yellow: 'rgba(250, 204, 21, 0.65)',
                  pink: 'rgba(244, 114, 182, 0.65)',
                  orange: 'rgba(251, 146, 60, 0.65)',
                };

                return {
                  ...baseStyles,
                  boxShadow: `inset 0 -0.7em 0 ${shadowColors[color as keyof typeof shadowColors] || shadowColors.yellow}`,
                };
              };

              segments.push(
                <mark
                  key={`highlight-${highlight.id}`}
                  data-highlight-id={highlight.id}
                  className={cn(
                    "hl",
                    "transition-all",
                    eraserMode && "cursor-pointer hover:opacity-60"
                  )}
                  style={getHighlightStyles(highlight.color)}
                  onClick={() => eraserMode && onHighlightClick?.(highlight.id)}
                >
                  {turnRange.turn.text.slice(highlight.start, highlight.end)}
                </mark>
              );
              
              lastIndex = highlight.end;
            });
            
            if (lastIndex < turnRange.turn.text.length) {
              segments.push(
                <span key="text-end">
                  {turnRange.turn.text.slice(lastIndex)}
                </span>
              );
            }
            
            content = <>{segments}</>;
          }
          
          return (
            <div 
              key={idx}
              className="leading-relaxed"
              style={{ lineHeight: 1.7 }}
            >
              <span className="font-bold">{turnRange.turn.speaker}:</span>{' '}
              <span className="inline">{content}</span>
            </div>
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
          const getHighlightStyles = (color: string) => {
            const baseStyles = {
              display: 'inline' as const,
              padding: 0,
              margin: 0,
              border: 'none',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              wordSpacing: 'inherit',
              verticalAlign: 'baseline',
              whiteSpace: 'pre-wrap' as const,
              background: 'none',
              mixBlendMode: 'normal' as const,
              borderRadius: 0,
              WebkitBoxDecorationBreak: 'clone' as const,
              boxDecorationBreak: 'clone' as const,
            };

            if (color === 'underline') {
              return {
                ...baseStyles,
                textDecoration: 'underline',
                textDecorationColor: 'currentColor',
                textDecorationThickness: '2px',
                textUnderlineOffset: '2px',
              };
            }

            const shadowColors = {
              yellow: 'rgba(250, 204, 21, 0.65)',
              pink: 'rgba(244, 114, 182, 0.65)',
              orange: 'rgba(251, 146, 60, 0.65)',
            };

            return {
              ...baseStyles,
              boxShadow: `inset 0 -0.7em 0 ${shadowColors[color as keyof typeof shadowColors] || shadowColors.yellow}`,
            };
          };

          segments.push(
            <mark
              key={`highlight-${highlight.id}`}
              data-highlight-id={highlight.id}
              className={cn(
                "hl",
                "transition-all",
                eraserMode && "cursor-pointer hover:opacity-60"
              )}
              style={getHighlightStyles(highlight.color)}
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
