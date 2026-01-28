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

// Messages API
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

// Trash API for papperskorg
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

// Job Images API
export const jobImagesAPI = {
  // Get all images for a job
  getByJobId: async (jobId) => {
    const { data, error } = await supabase
      .from('job_images')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    return formatResponse(data, error);
  },

  // Upload image to storage and create record
  upload: async (jobId, file, category = 'documentation', caption = null) => {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name?.split('.').pop() || 'jpg';
    const fileName = `${timestamp}_${category}.${fileExt}`;
    const storagePath = `${jobId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return formatResponse(null, uploadError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    // Create database record
    const { data, error } = await supabase
      .from('job_images')
      .insert({
        job_id: jobId,
        storage_path: storagePath,
        url: publicUrl,
        category,
        caption,
      })
      .select()
      .single();

    return formatResponse(data, error);
  },

  // Update image (category or caption)
  update: async (imageId, updateData) => {
    const { data, error } = await supabase
      .from('job_images')
      .update(updateData)
      .eq('id', imageId)
      .select()
      .single();
    return formatResponse(data, error);
  },

  // Delete image (removes from storage too)
  delete: async (imageId) => {
    // First get the image to get storage path
    const { data: image, error: fetchError } = await supabase
      .from('job_images')
      .select('storage_path')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      return formatResponse(null, fetchError);
    }

    // Delete from storage
    if (image?.storage_path) {
      await supabase.storage
        .from('job-images')
        .remove([image.storage_path]);
    }

    // Delete database record
    const { error } = await supabase
      .from('job_images')
      .delete()
      .eq('id', imageId);

    return formatResponse({ success: true }, error);
  },

  // Update sort order
  updateOrder: async (imageId, sortOrder) => {
    const { data, error } = await supabase
      .from('job_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId)
      .select()
      .single();
    return formatResponse(data, error);
  },
};

// Boats API
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

// Invoices API
export const invoicesAPI = {
  // Get all invoices with optional filtering
  getAll: async (params = {}) => {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        job:jobs(id, title, status)
      `);

    // Filter by customer
    if (params.customer_id) {
      query = query.eq('customer_id', params.customer_id);
    }

    // Filter by job
    if (params.job_id) {
      query = query.eq('job_id', params.job_id);
    }

    // Filter by payment status
    if (params.payment_status) {
      query = query.eq('payment_status', params.payment_status);
    }

    // Search by invoice number
    if (params.invoice_number) {
      query = query.ilike('invoice_number', `%${params.invoice_number}%`);
    }

    // Date range
    if (params.from_date) {
      query = query.gte('invoice_date', params.from_date);
    }
    if (params.to_date) {
      query = query.lte('invoice_date', params.to_date);
    }

    // Sort
    const sortField = params.sort_by || 'invoice_date';
    const sortOrder = params.sort_order === 'asc';
    query = query.order(sortField, { ascending: sortOrder });

    const { data, error } = await query;
    return formatResponse(data, error);
  },

  // Get invoice by ID
  getById: async (invoiceId) => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        job:jobs(*),
        items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    return formatResponse(data, error);
  },

  // Get invoice by invoice number
  getByNumber: async (invoiceNumber) => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        job:jobs(*),
        items:invoice_items(*)
      `)
      .eq('invoice_number', invoiceNumber)
      .single();

    return formatResponse(data, error);
  },

  // Create new invoice from job
  create: async (invoiceData) => {
    // Generate invoice number using DB function
    const { data: invoiceNumber, error: numberError } = await supabase
      .rpc('generate_invoice_number');

    if (numberError) {
      return formatResponse(null, numberError);
    }

    // Calculate due date (default: 30 days from invoice date)
    const invoiceDate = invoiceData.invoice_date || new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.due_date || new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice with generated number
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
      })
      .select(`
        *,
        customer:customers(*),
        job:jobs(*)
      `)
      .single();

    return formatResponse(data, error);
  },

  // Update invoice
  update: async (invoiceId, invoiceData) => {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', invoiceId)
      .select(`
        *,
        customer:customers(*),
        job:jobs(*)
      `)
      .single();

    return formatResponse(data, error);
  },

  // Mark invoice as paid
  markAsPaid: async (invoiceId, paymentData = {}) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        payment_status: 'paid',
        paid_amount: paymentData.amount || 0,
        paid_at: paymentData.paid_at || new Date().toISOString(),
        payment_method: paymentData.payment_method || null,
        payment_reference: paymentData.payment_reference || null,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    return formatResponse(data, error);
  },

  // Mark invoice as unpaid
  markAsUnpaid: async (invoiceId) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        payment_status: 'unpaid',
        paid_amount: 0,
        paid_at: null,
        payment_method: null,
        payment_reference: null,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    return formatResponse(data, error);
  },

  // Update PDF URL after generation
  updatePdfUrl: async (invoiceId, pdfUrl, storagePath) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        pdf_url: pdfUrl,
        pdf_storage_path: storagePath,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    return formatResponse(data, error);
  },

  // Delete invoice
  delete: async (invoiceId) => {
    // First get the invoice to get PDF path
    const { data: invoice } = await supabase
      .from('invoices')
      .select('pdf_storage_path')
      .eq('id', invoiceId)
      .single();

    // Delete PDF from storage if exists
    if (invoice?.pdf_storage_path) {
      await supabase.storage
        .from('invoices')
        .remove([invoice.pdf_storage_path]);
    }

    // Delete invoice (cascades to invoice_items)
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    return formatResponse({ success: true }, error);
  },
};

// Invoice Items API
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

// Settings API (for invoice configuration)
export const settingsAPI = {
  // Get a setting by key
  get: async (key) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();

    if (data) {
      // Parse JSON value
      return formatResponse({ ...data, value: data.value }, error);
    }
    return formatResponse(null, error);
  },

  // Get multiple settings by keys
  getMany: async (keys) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .in('key', keys);

    if (data) {
      // Convert to key-value object
      const settings = {};
      data.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      return formatResponse(settings, error);
    }
    return formatResponse({}, error);
  },

  // Get all business settings for invoice generation
  getBusinessInfo: async () => {
    const keys = [
      'business_name',
      'business_phone',
      'business_email',
      'business_address',
      'business_org_number',
      'business_vat_number',
      'business_bank_account',
      'business_swish',
      'default_hourly_rate',
      'invoice_payment_terms',
      'invoice_footer_text',
    ];

    return settingsAPI.getMany(keys);
  },

  // Update a setting
  update: async (key, value, description = null) => {
    const updateData = { value };
    if (description) updateData.description = description;

    const { data, error } = await supabase
      .from('settings')
      .update(updateData)
      .eq('key', key)
      .select()
      .single();

    return formatResponse(data, error);
  },
};

// Notes API
export const notesAPI = {
  // Get all notes with optional filtering
  getAll: async (params = {}) => {
    let query = supabase
      .from('notes')
      .select(`
        *,
        customer:customers(id, name),
        job:jobs(id, title),
        boat:boats(id, make, model),
        lead:leads(id, name),
        images:note_images(id, storage_path, caption, sort_order)
      `)
      .eq('is_archived', false);

    // Filter by entity
    if (params.customer_id) query = query.eq('customer_id', params.customer_id);
    if (params.job_id) query = query.eq('job_id', params.job_id);
    if (params.boat_id) query = query.eq('boat_id', params.boat_id);
    if (params.lead_id) query = query.eq('lead_id', params.lead_id);

    // Filter by priority
    if (params.priority) query = query.eq('priority', params.priority);

    // Filter by reminder date (upcoming reminders)
    if (params.has_reminder) {
      query = query.not('reminder_date', 'is', null);
    }
    if (params.reminder_before) {
      query = query.lte('reminder_date', params.reminder_before);
    }

    // Filter pinned
    if (params.pinned_only) {
      query = query.eq('is_pinned', true);
    }

    // Sort: pinned first, then by created date
    query = query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Limit
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    // Add public URLs for images
    const dataWithUrls = data?.map(note => ({
      ...note,
      images: note.images?.map(img => ({
        ...img,
        url: supabase.storage.from('note-images').getPublicUrl(img.storage_path).data?.publicUrl
      }))
    }));

    return formatResponse(dataWithUrls, error);
  },

  // Get single note by ID
  getById: async (noteId) => {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        job:jobs(id, title, status),
        boat:boats(id, make, model, year),
        lead:leads(id, name, email),
        images:note_images(id, storage_path, caption, sort_order)
      `)
      .eq('id', noteId)
      .single();

    if (data?.images) {
      data.images = data.images.map(img => ({
        ...img,
        url: supabase.storage.from('note-images').getPublicUrl(img.storage_path).data?.publicUrl
      }));
    }

    return formatResponse(data, error);
  },

  // Create note
  create: async (noteData) => {
    const { data, error } = await supabase
      .from('notes')
      .insert([noteData])
      .select()
      .single();
    return formatResponse(data, error);
  },

  // Update note
  update: async (noteId, noteData) => {
    const { data, error } = await supabase
      .from('notes')
      .update(noteData)
      .eq('id', noteId)
      .select()
      .single();
    return formatResponse(data, error);
  },

  // Delete note (also deletes images via CASCADE)
  delete: async (noteId) => {
    // First get all images to delete from storage
    const { data: images } = await supabase
      .from('note_images')
      .select('storage_path')
      .eq('note_id', noteId);

    // Delete images from storage
    if (images?.length > 0) {
      const paths = images.map(img => img.storage_path);
      await supabase.storage.from('note-images').remove(paths);
    }

    // Delete note (cascades to note_images table)
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    return formatResponse({ success: true }, error);
  },

  // Archive note (soft delete)
  archive: async (noteId) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ is_archived: true })
      .eq('id', noteId)
      .select()
      .single();
    return formatResponse(data, error);
  },

  // Toggle pin
  togglePin: async (noteId, isPinned) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ is_pinned: isPinned })
      .eq('id', noteId)
      .select()
      .single();
    return formatResponse(data, error);
  },

  // Upload image to note
  uploadImage: async (noteId, file, caption = null) => {
    const timestamp = Date.now();
    const fileExt = file.name?.split('.').pop() || 'jpg';
    const fileName = `${timestamp}.${fileExt}`;
    const storagePath = `${noteId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('note-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return formatResponse(null, uploadError);
    }

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('note_images')
      .select('sort_order')
      .eq('note_id', noteId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    // Create database record
    const { data, error } = await supabase
      .from('note_images')
      .insert({
        note_id: noteId,
        storage_path: storagePath,
        caption,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (data) {
      data.url = supabase.storage.from('note-images').getPublicUrl(storagePath).data?.publicUrl;
    }

    return formatResponse(data, error);
  },

  // Delete image from note
  deleteImage: async (imageId) => {
    // Get storage path first
    const { data: image, error: fetchError } = await supabase
      .from('note_images')
      .select('storage_path')
      .eq('id', imageId)
      .single();

    if (fetchError) return formatResponse(null, fetchError);

    // Delete from storage
    if (image?.storage_path) {
      await supabase.storage.from('note-images').remove([image.storage_path]);
    }

    // Delete record
    const { error } = await supabase
      .from('note_images')
      .delete()
      .eq('id', imageId);

    return formatResponse({ success: true }, error);
  },

  // Full-text search
  search: async (searchTerm) => {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        customer:customers(id, name),
        job:jobs(id, title),
        images:note_images(id, storage_path)
      `)
      .textSearch('content', searchTerm, { type: 'websearch', config: 'swedish' })
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50);

    return formatResponse(data, error);
  },

  // Get notes with upcoming reminders (for dashboard)
  getUpcomingReminders: async (daysAhead = 7) => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        customer:customers(id, name),
        job:jobs(id, title)
      `)
      .gte('reminder_date', today)
      .lte('reminder_date', futureDate)
      .eq('is_archived', false)
      .order('reminder_date', { ascending: true });

    return formatResponse(data, error);
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