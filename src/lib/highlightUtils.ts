export interface Highlight {
  id: string;
  start: number;
  end: number;
  text: string;
  color: string;
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

export function mergeOverlappingHighlights(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // If overlapping or adjacent, merge
    if (next.start <= current.end) {
      current = {
        ...current,
        end: Math.max(current.end, next.end),
        text: current.text // Keep first highlight's text
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}
