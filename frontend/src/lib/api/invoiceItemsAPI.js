import { supabase, formatResponse } from './helpers';

export const invoiceItemsAPI = {
    // Get all items for an invoice
    getByInvoice: async (invoiceId) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId)
            .order('sort_order', { ascending: true });

        return formatResponse(data, error);
    },

    // Create invoice item
    create: async (itemData) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .insert(itemData)
            .select()
            .single();

        return formatResponse(data, error);
    },

    // Bulk create invoice items (from job_items)
    bulkCreate: async (items) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .insert(items)
            .select();

        return formatResponse(data, error);
    },

    // Update invoice item
    update: async (itemId, itemData) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .update(itemData)
            .eq('id', itemId)
            .select()
            .single();

        return formatResponse(data, error);
    },

    // Delete invoice item
    delete: async (itemId) => {
        const { error } = await supabase
            .from('invoice_items')
            .delete()
            .eq('id', itemId);

        return formatResponse({ success: true }, error);
    },
};
