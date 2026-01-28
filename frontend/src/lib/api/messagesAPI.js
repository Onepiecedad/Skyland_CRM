import { supabase, formatResponse } from './helpers';

export const messagesAPI = {
    // Get unread count
    getUnreadCount: async () => {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('seen', false)
            .eq('direction', 'inbound');
        return formatResponse({ count: count || 0 }, error);
    },

    // Mark message as seen
    markAsSeen: async (messageId) => {
        const { data, error } = await supabase
            .from('messages')
            .update({ seen: true })
            .eq('id', messageId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    // Mark all messages as seen for a customer
    markCustomerMessagesSeen: async (customerId) => {
        const { data, error } = await supabase
            .from('messages')
            .update({ seen: true })
            .eq('customer_id', customerId)
            .eq('seen', false)
            .select();
        return formatResponse(data, error);
    },

    // Mark all messages as seen
    markAllAsSeen: async () => {
        const { data, error } = await supabase
            .from('messages')
            .update({ seen: true })
            .eq('seen', false)
            .eq('direction', 'inbound')
            .select();
        return formatResponse(data, error);
    },

    // Soft delete (move to trash)
    softDelete: async (messageId) => {
        const { data, error } = await supabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    // Restore from trash
    restore: async (messageId) => {
        const { data, error } = await supabase
            .from('messages')
            .update({ deleted_at: null })
            .eq('id', messageId)
            .select()
            .single();
        return formatResponse(data, error);
    },
};
