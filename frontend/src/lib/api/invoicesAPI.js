import { supabase, formatResponse } from './helpers';

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
