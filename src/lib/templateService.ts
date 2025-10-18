import { supabase } from '@/integrations/supabase/client';

export interface DrillTemplate {
  id: string;
  class_id: string;
  template_name: string;
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  set_size: number;
  created_at: string;
}

export const templateService = {
  async getTemplates(classId: string): Promise<DrillTemplate[]> {
    const { data, error } = await supabase
      .from('drill_templates')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async saveTemplate(template: Omit<DrillTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<DrillTemplate> {
    const { data, error } = await supabase
      .from('drill_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('drill_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
