import { supabase, formatResponse } from './helpers';

export const boatsAPI = {
    getAll: async (params = {}) => {
        let query = supabase.from('boats').select('*');

        if (params.customer_id) {
            query = query.eq('customer_id', params.customer_id);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        return formatResponse(data, error);
    },

    getById: async (boatId) => {
        const { data, error } = await supabase
            .from('boats')
            .select('*')
            .eq('id', boatId)
            .single();
        return formatResponse(data, error);
    },

    create: async (boatData) => {
        const { data, error } = await supabase
            .from('boats')
            .insert([boatData])
            .select()
            .single();
        return formatResponse(data, error);
    },

    update: async (boatId, boatData) => {
        const { data, error } = await supabase
            .from('boats')
            .update(boatData)
            .eq('id', boatId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    delete: async (boatId) => {
        const { error } = await supabase
            .from('boats')
            .delete()
            .eq('id', boatId);
        return formatResponse({ success: true }, error);
    },
};
