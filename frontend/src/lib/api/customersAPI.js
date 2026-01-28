import { supabase, formatResponse } from './helpers';

export const customersAPI = {
    getOverview: async (params = {}) => {
        let query = supabase
            .from('customers_overview') // Use the view!
            .select('*');

        // Basic search filtering
        if (params.q) {
            query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%,phone.ilike.%${params.q}%`);
        }

        // Sort
        if (params.sort) {
            // Handle sort string "field desc" -> field, { ascending: false }
            let [field, direction] = params.sort.split(' ');
            query = query.order(field, { ascending: direction !== 'desc' });
        } else {
            query = query.order('latest_activity_at', { ascending: false });
        }

        // Pagination
        const page = params.page ? parseInt(params.page) : 1;
        const limit = params.limit ? parseInt(params.limit) : 50;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        query = query.range(start, end);

        const { data, error } = await query;

        // Transform data to match CustomerOverview model if needed
        const transformedData = data?.map(c => ({
            ...c,
            // View already has customer_id as alias, so no need to map 'id'
            unread_messages: c.unread_messages || 0,
            open_leads: c.open_leads || 0,
            latest_activity_at: c.latest_activity_at || c.updated_at
        }));

        return formatResponse(transformedData, error);
    },

    getById: async (customerId) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

        if (data) data.customer_id = data.id; // Map id
        return formatResponse(data, error);
    },

    getThread: async (customerId, params = {}) => {
        // Fetch messages for this customer
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true });

        return formatResponse(data, error);
    },

    create: async (customerData) => {
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();
        if (data) data.customer_id = data.id;
        return formatResponse(data, error);
    },

    update: async (customerId, customerData) => {
        const { data, error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', customerId)
            .select()
            .single();
        if (data) data.customer_id = data.id;
        return formatResponse(data, error);
    },

    delete: async (customerId) => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);
        return formatResponse({ success: true }, error);
    },
};
