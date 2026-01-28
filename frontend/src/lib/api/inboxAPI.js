import { supabase, formatResponse } from './helpers';

export const inboxAPI = {
    getAll: async (params = {}) => {
        let query = supabase.from('inbox').select('*');

        if (params.customer_id) query = query.eq('customer_id', params.customer_id);
        if (params.status) query = query.eq('status', params.status);

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        const transformedData = data?.map(i => ({
            ...i,
            inbox_id: i.id,
            message_raw: i.message // Map back
        }));

        return formatResponse(transformedData, error);
    },

    getById: async (inboxId) => {
        const { data, error } = await supabase
            .from('inbox')
            .select('*')
            .eq('id', inboxId)
            .single();
        if (data) {
            data.inbox_id = data.id;
            data.message_raw = data.message;
        }
        return formatResponse(data, error);
    },

    update: async (inboxId, inboxData) => {
        const { data, error } = await supabase
            .from('inbox')
            .update(inboxData)
            .eq('id', inboxId)
            .select()
            .single();
        if (data) {
            data.inbox_id = data.id;
            data.message_raw = data.message;
        }
        return formatResponse(data, error);
    },

    delete: async (inboxId) => {
        const { error } = await supabase
            .from('inbox')
            .delete()
            .eq('id', inboxId);
        return formatResponse({ success: true }, error);
    },
};
