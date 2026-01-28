import { supabase, formatResponse } from './helpers';

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
