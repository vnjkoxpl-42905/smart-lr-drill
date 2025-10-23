import { supabase } from '@/integrations/supabase/client';

export interface WAJHistoryItem {
  attempt_at_iso: string;
  result: 0 | 1; // 0=wrong, 1=right
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
  review?: {
    q1: string; // why I chose the wrong answer
    q2: string; // why I eliminated the right answer
    q3: string; // plan to avoid it next time
  };
}

export interface WAJEntry {
  id: string;
  user_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  first_wrong_at_iso: string;
  last_status: 'wrong' | 'right';
  revisit_count: number;
  history_json: WAJHistoryItem[];
  created_at: string;
  updated_at: string;
}

export async function logWrongAnswer(params: {
  user_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
  review?: {
    q1: string;
    q2: string;
    q3: string;
  };
}) {
  const historyItem: WAJHistoryItem = {
    attempt_at_iso: new Date().toISOString(),
    result: 0,
    chosen_answer: params.chosen_answer,
    correct_answer: params.correct_answer,
    time_ms: params.time_ms,
    confidence_1_5: params.confidence_1_5,
    review: params.review,
  };

  // Check if entry exists
  const { data: existing } = await (supabase as any)
    .from('wrong_answer_journal')
    .select('*')
    .eq('user_id', params.user_id)
    .eq('qid', params.qid)
    .maybeSingle();

  if (existing) {
    // Append to history
    const currentHistory = (existing.history_json as unknown as WAJHistoryItem[]) || [];
    const newHistory = [...currentHistory, historyItem];
    const { error } = await (supabase as any)
      .from('wrong_answer_journal')
      .update({
        history_json: newHistory as unknown as any,
        last_status: 'wrong',
        revisit_count: newHistory.length - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', params.user_id)
      .eq('qid', params.qid);

    if (error) throw error;
  } else {
    // Create new entry
    const { error } = await (supabase as any)
      .from('wrong_answer_journal')
      .insert({
        user_id: params.user_id,
        qid: params.qid,
        pt: params.pt,
        section: params.section,
        qnum: params.qnum,
        qtype: params.qtype,
        level: params.level,
        first_wrong_at_iso: new Date().toISOString(),
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [historyItem] as unknown as any,
      });

    if (error) throw error;
  }
}

export async function logCorrectAnswer(params: {
  user_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
}) {
  // Only update if there's an existing WAJ entry (meaning they got it wrong before)
  const { data: existing } = await (supabase as any)
    .from('wrong_answer_journal')
    .select('*')
    .eq('user_id', params.user_id)
    .eq('qid', params.qid)
    .maybeSingle();

  if (existing) {
    const historyItem: WAJHistoryItem = {
      attempt_at_iso: new Date().toISOString(),
      result: 1,
      chosen_answer: params.chosen_answer,
      correct_answer: params.correct_answer,
      time_ms: params.time_ms,
      confidence_1_5: params.confidence_1_5,
    };

    const currentHistory = (existing.history_json as unknown as WAJHistoryItem[]) || [];
    const newHistory = [...currentHistory, historyItem];
    const { error } = await (supabase as any)
      .from('wrong_answer_journal')
      .update({
        history_json: newHistory as unknown as any,
        last_status: 'right',
        revisit_count: newHistory.length - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', params.user_id)
      .eq('qid', params.qid);

    if (error) throw error;
  }
}

export async function getWAJEntries(user_id: string, filters?: {
  qtype?: string;
  level?: number;
  pt?: number;
  last_status?: 'wrong' | 'right';
}) {
  let query = (supabase as any)
    .from('wrong_answer_journal')
    .select('*')
    .eq('user_id', user_id)
    .order('first_wrong_at_iso', { ascending: false });

  if (filters?.qtype) {
    query = query.eq('qtype', filters.qtype);
  }
  if (filters?.level) {
    query = query.eq('level', filters.level);
  }
  if (filters?.pt) {
    query = query.eq('pt', filters.pt);
  }
  if (filters?.last_status) {
    query = query.eq('last_status', filters.last_status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as WAJEntry[];
}
