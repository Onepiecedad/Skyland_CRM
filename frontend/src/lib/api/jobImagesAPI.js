import { supabase, formatResponse } from './helpers';

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
