import { supabase, formatResponse } from './helpers';

export const trashAPI = {
    // Get all trashed messages
    getMessages: async () => {
        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        customers(id, name)
      `)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });
        return formatResponse(data, error);
    },

    // Get all trashed customers
    getCustomers: async () => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });
        return formatResponse(data, error);
    },

    // Restore a message
    restoreMessage: async (messageId) => {
        const { data, error } = await supabase
            .from('messages')
            .update({ deleted_at: null })
            .eq('id', messageId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    // Restore a customer
    restoreCustomer: async (customerId) => {
        const { data, error } = await supabase
            .from('customers')
            .update({ deleted_at: null })
            .eq('id', customerId)
            .select()
            .single();
        return formatResponse(data, error);
    },

    // Permanently delete message
    permanentlyDeleteMessage: async (messageId) => {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
        return formatResponse({ success: true }, error);
    },

    // Permanently delete customer
    permanentlyDeleteCustomer: async (customerId) => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);
        return formatResponse({ success: true }, error);
    },

    // Empty entire trash (permanently delete all)
    emptyTrash: async () => {
        // Delete all trashed messages
        const { error: msgError } = await supabase
            .from('messages')
            .delete()
            .not('deleted_at', 'is', null);

        if (msgError) return formatResponse(null, msgError);

        // Delete all trashed customers
        const { error: custError } = await supabase
            .from('customers')
            .delete()
            .not('deleted_at', 'is', null);

        return formatResponse({ success: true }, custError);
    },

    // Get counts for badge
    getCounts: async () => {
        const { count: messageCount, error: msgError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .not('deleted_at', 'is', null);

        if (msgError) return formatResponse(null, msgError);

        const { count: customerCount, error: custError } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .not('deleted_at', 'is', null);

        return formatResponse({
            messages: messageCount || 0,
            customers: customerCount || 0,
            total: (messageCount || 0) + (customerCount || 0)
        }, custError);
    },
};
