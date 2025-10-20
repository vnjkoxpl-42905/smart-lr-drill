/**
 * QuestionTimer - Manages detailed per-question timing with pause/resume support
 * Tracks segments, answer changes, and revisits for accurate timing analytics
 */

export interface TimeSegment {
  startMs: number;
  endMs?: number;
  paused: boolean;
}

export interface QuestionTimingData {
  qid: string;
  segments: TimeSegment[];
  answerChanges: Array<{ answer: string; timestampMs: number }>;
  revisitCount: number;
  firstAnswerTimeMs?: number;
  finalAnswerTimeMs?: number;
}

export class QuestionTimer {
  private timings: Map<string, QuestionTimingData> = new Map();
  private currentQid: string | null = null;
  private currentSegmentStart: number | null = null;

  /**
   * Start timing for a question
   */
  start(qid: string) {
    if (this.currentQid && this.currentSegmentStart) {
      // End previous segment
      this.pause();
    }

    if (!this.timings.has(qid)) {
      this.timings.set(qid, {
        qid,
        segments: [],
        answerChanges: [],
        revisitCount: 0,
        firstAnswerTimeMs: undefined,
        finalAnswerTimeMs: undefined,
      });
    } else {
      // Increment revisit count
      const data = this.timings.get(qid)!;
      data.revisitCount++;
    }

    this.currentQid = qid;
    this.currentSegmentStart = performance.now();

    const data = this.timings.get(qid)!;
    data.segments.push({
      startMs: this.currentSegmentStart,
      paused: false,
    });
  }

  /**
   * Pause timing (e.g., when navigating away or opening modal)
   */
  pause() {
    if (!this.currentQid || !this.currentSegmentStart) return;

    const data = this.timings.get(this.currentQid);
    if (!data) return;

    const currentSegment = data.segments[data.segments.length - 1];
    if (currentSegment && !currentSegment.endMs) {
      currentSegment.endMs = performance.now();
      currentSegment.paused = true;
    }

    this.currentSegmentStart = null;
  }

  /**
   * Resume timing for current question
   */
  resume() {
    if (!this.currentQid) return;

    this.currentSegmentStart = performance.now();

    const data = this.timings.get(this.currentQid);
    if (data) {
      data.segments.push({
        startMs: this.currentSegmentStart,
        paused: false,
      });
    }
  }

  /**
   * Record answer change
   */
  recordAnswer(qid: string, answer: string) {
    const data = this.timings.get(qid);
    if (!data) return;

    const timestampMs = performance.now();
    data.answerChanges.push({ answer, timestampMs });

    // Set first answer time if not set
    if (!data.firstAnswerTimeMs && answer) {
      const totalTime = this.getTotalTime(qid);
      data.firstAnswerTimeMs = totalTime;
    }

    // Always update final answer time
    if (answer) {
      data.finalAnswerTimeMs = this.getTotalTime(qid);
    }
  }

  /**
   * Get total time spent on a question (sum of all segments)
   */
  getTotalTime(qid: string): number {
    const data = this.timings.get(qid);
    if (!data) return 0;

    let total = 0;
    const now = performance.now();

    for (const segment of data.segments) {
      const end = segment.endMs || (this.currentQid === qid ? now : segment.startMs);
      total += end - segment.startMs;
    }

    return Math.floor(total);
  }

  /**
   * Get timing data for a specific question
   */
  getData(qid: string): QuestionTimingData | undefined {
    return this.timings.get(qid);
  }

  /**
   * Get all timing data
   */
  getAllData(): Map<string, QuestionTimingData> {
    return new Map(this.timings);
  }

  /**
   * Clear timing data for a question
   */
  clear(qid: string) {
    this.timings.delete(qid);
    if (this.currentQid === qid) {
      this.currentQid = null;
      this.currentSegmentStart = null;
    }
  }

  /**
   * Clear all timing data
   */
  clearAll() {
    this.timings.clear();
    this.currentQid = null;
    this.currentSegmentStart = null;
  }

  /**
   * Get metrics summary for a question
   */
  getMetrics(qid: string) {
    const data = this.timings.get(qid);
    if (!data) {
      return {
        totalTimeMs: 0,
        revisitCount: 0,
        answerSwitchCount: 0,
        timeToFirstAnswer: 0,
        timeToFinalAnswer: 0,
      };
    }

    return {
      totalTimeMs: this.getTotalTime(qid),
      revisitCount: data.revisitCount,
      answerSwitchCount: data.answerChanges.length,
      timeToFirstAnswer: data.firstAnswerTimeMs || 0,
      timeToFinalAnswer: data.finalAnswerTimeMs || 0,
    };
  }
}
