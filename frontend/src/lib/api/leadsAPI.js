import { supabase, formatResponse } from './helpers';

export const leadsAPI = {
    getAll: async (params = {}) => {
        let query = supabase.from('leads').select('*');

        if (params.status) query = query.eq('status', params.status);
        if (params.intent) query = query.eq('ai_category', params.intent.toUpperCase()); // Map intent to ai_category

        // Sort
        if (params.sort) {
            const [field, direction] = params.sort.split(' ');
            // Map legacy 'urgency' to new fields if needed, or keep standard
            query = query.order(field === 'urgency' ? 'ai_priority' : field, { ascending: direction !== 'desc' });
        } else {
            query = query.order('updated_at', { ascending: false });
        }

        const { data, error } = await query;

        const transformedData = data?.map(l => ({
            ...l,
            lead_id: l.id,
            intent: l.ai_category, // Map back for frontend
            urgency: l.ai_priority,
            summary: l.ai_summary || l.name
        }));

        return formatResponse(transformedData, error);
    },

    create: async (leadData) => {
        const { data, error } = await supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single();
        if (data) data.lead_id = data.id;
        return formatResponse(data, error);
    },

    update: async (leadId, leadData) => {
        const { data, error } = await supabase
            .from('leads')
            .update(leadData)
            .eq('id', leadId)
            .select()
            .single();
        if (data) data.lead_id = data.id;
        return formatResponse(data, error);
    },

    delete: async (leadId) => {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);
        return formatResponse({ success: true }, error);
    },
};
