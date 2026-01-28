import { supabase, formatResponse } from './helpers';

export const jobsAPI = {
    getAll: async (params = {}) => {
        let query = supabase
            .from('jobs')
            .select(`
        *,
        customer:customers(id, name, email, phone),
        boat:boats(id, make, model, year, registration_number),
        lead:leads(id, name)
      `);

        // Filter by status
        if (params.status) query = query.eq('status', params.status);

        // Filter by customer
        if (params.customer_id) query = query.eq('customer_id', params.customer_id);

        // Sort
        if (params.sort) {
            const [field, direction] = params.sort.split(' ');
            query = query.order(field, { ascending: direction !== 'desc' });
        } else {
            // Default: scheduled jobs first, then by scheduled date, then by created date
            query = query.order('scheduled_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        const transformedData = data?.map(j => ({
            ...j,
            job_id: j.id
        }));

        return formatResponse(transformedData, error);
    },

    getById: async (jobId) => {
        const { data, error } = await supabase
            .from('jobs')
            .select(`
        *,
        customer:customers(id, name, email, phone, address, city, postal_code),
        boat:boats(id, make, model, year, registration_number, engine_make, engine_model),
        lead:leads(id, name, email),
        items:job_items(*)
      `)
            .eq('id', jobId)
            .single();

        if (data) {
            data.job_id = data.id;
            // Ensure items array exists
            data.items = data.items || [];
        }
        return formatResponse(data, error);
    },

    create: async (jobData) => {
        const { data, error } = await supabase
            .from('jobs')
            .insert([jobData])
            .select()
            .single();
        if (data) data.job_id = data.id;
        return formatResponse(data, error);
    },

    update: async (jobId, jobData) => {
        const updateData = { ...jobData, updated_at: new Date().toISOString() };
        const { data, error } = await supabase
            .from('jobs')
            .update(updateData)
            .eq('id', jobId)
            .select()
            .single();
        if (data) data.job_id = data.id;
        return formatResponse(data, error);
    },

    delete: async (jobId) => {
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);
        return formatResponse({ success: true }, error);
    },
};
