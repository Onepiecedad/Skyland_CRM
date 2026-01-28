import { supabase, formatResponse } from './helpers';

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
