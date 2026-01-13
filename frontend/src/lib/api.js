import { supabase } from './supabase';

// Helper to simulate Axios response structure
const formatResponse = (data, error) => {
  if (error) {
    console.error('Supabase Error:', error);
    throw error;
  }
  return { data };
};

// API functions mapped to Supabase
export const customersAPI = {
  getOverview: async (params = {}) => {
    console.log('🔧 customersAPI.getOverview (Supabase) called with params:', params);

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

// Default api export for compatibility, though explicit exports are preferred
const api = {
  get: async (url) => { console.warn("Direct api.get used - not fully supported", url); },
  post: async (url, data) => { console.warn("Direct api.post used - not fully supported"); },
  put: async (url, data) => { console.warn("Direct api.put used - not fully supported"); },
  delete: async (url) => { console.warn("Direct api.delete used - not fully supported"); }
};

export default api;