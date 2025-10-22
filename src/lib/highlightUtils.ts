export type HighlightColor = 'yellow' | 'pink' | 'orange' | 'underline';

export interface Highlight {
  id: string;
  start: number;
  end: number;
  text: string;
  color: HighlightColor;
  section: 'stimulus' | 'stem';
}

export function captureTextSelection(container: HTMLElement): { start: number; end: number; text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  
  // Check if selection is within the container
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  // Get the full text content of the container
  const fullText = container.textContent || '';
  const selectedText = selection.toString();
  
  // Create a range for the entire container
  const containerRange = document.createRange();
  containerRange.selectNodeContents(container);
  
  // Get text before the selection
  const beforeRange = containerRange.cloneRange();
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = beforeRange.toString();
  
  const start = textBefore.length;
  const end = start + selectedText.length;

  console.log('Captured selection:', { start, end, text: selectedText, fullTextLength: fullText.length });

  return {
    start,
    end,
    text: selectedText
  };
}

export function replaceOverlappingHighlights(
  existing: Highlight[], 
  newHighlight: Highlight
): Highlight[] {
  const result: Highlight[] = [];
  
  for (const h of existing) {
    // No overlap - keep as is
    if (h.end <= newHighlight.start || h.start >= newHighlight.end) {
      result.push(h);
      continue;
    }
    
    // Has overlap - split and keep non-overlapping portions
    // Keep the part before the new highlight
    if (h.start < newHighlight.start) {
      const beforeText = h.text.slice(0, newHighlight.start - h.start);
      result.push({
        ...h,
        id: `${h.id}-before`,
        end: newHighlight.start,
        text: beforeText
      });
    }
    
    // Keep the part after the new highlight
    if (h.end > newHighlight.end) {
      const offset = newHighlight.end - h.start;
      const afterText = h.text.slice(offset);
      result.push({
        ...h,
        id: `${h.id}-after`,
        start: newHighlight.end,
        text: afterText
      });
    }
  }
  
  // Add the new highlight
  result.push(newHighlight);
  
  // Merge adjacent highlights of the same color
  return mergeAdjacentSameColor(result);
}

function mergeAdjacentSameColor(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;
  
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // If adjacent and same color, merge
    if (next.start === current.end && next.color === current.color && next.section === current.section) {
      current = {
        ...current,
        end: next.end,
        text: current.text + next.text,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  
  return merged;
}

export function mergeOverlappingHighlights(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // If overlapping or adjacent, merge and prefer the latest color
    if (next.start <= current.end) {
      current = {
        ...next, // Use next highlight's properties (newer)
        start: Math.min(current.start, next.start),
        end: Math.max(current.end, next.end),
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}
