import { supabase, formatResponse } from './helpers';

export const jobItemsAPI = {
    create: async (itemData) => {
        const { data, error } = await supabase
            .from('job_items')
            .insert([itemData])
            .select()
            .single();
        return formatResponse(data, error);
    },

    update: async (itemId, itemData) => {
        const { data, error } = await supabase
            .from('job_items')
            .update(itemData)
            .eq('id', itemId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    delete: async (itemId) => {
        const { error } = await supabase
            .from('job_items')
            .delete()
            .eq('id', itemId);
        return formatResponse({ success: true }, error);
    },
};
