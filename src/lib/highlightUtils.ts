export interface Highlight {
  id: string;
  start: number;
  end: number;
  text: string;
  color: string;
  section: 'stimulus' | 'stem';
}

export function getTextOffset(node: Node, offset: number, root: Node): number {
  let currentOffset = 0;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode === node) {
      return currentOffset + offset;
    }
    currentOffset += (currentNode.textContent || '').length;
    currentNode = walker.nextNode();
  }

  return currentOffset;
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

  const start = getTextOffset(range.startContainer, range.startOffset, container);
  const end = getTextOffset(range.endContainer, range.endOffset, container);

  return {
    start,
    end,
    text: selection.toString()
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
