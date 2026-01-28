/**
 * Job-related constants used across multiple components
 */

export const STATUS_LABELS = {
    pending: 'Väntande',
    scheduled: 'Inbokad',
    in_progress: 'Pågående',
    waiting_parts: 'Väntar reservdelar',
    completed: 'Klar',
    invoiced: 'Fakturerad',
    cancelled: 'Avbruten'
};

export const STATUS_COLORS = {
    pending: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    invoiced: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
};

export const JOB_TYPE_LABELS = {
    service: 'Service',
    repair: 'Reparation',
    installation: 'Installation',
    inspection: 'Besiktning',
    winterization: 'Förvintring',
    launch: 'Sjösättning'
};

export const LOCATION_LABELS = {
    workshop: 'Verkstad',
    marina: 'Marina',
    customer_location: 'Kundens plats',
    sea_trial: 'Provtur'
};

export const ITEM_TYPE_LABELS = {
    labor: 'Arbete',
    part: 'Reservdel',
    material: 'Material',
    other: 'Övrigt'
};

/**
 * Get next logical status actions based on current status
 */
export const getQuickActions = (currentStatus) => {
    const actions = [];
    switch (currentStatus) {
        case 'pending':
            actions.push({ status: 'scheduled', label: 'Boka in', variant: 'outline' });
            actions.push({ status: 'in_progress', label: 'Starta', variant: 'default' });
            break;
        case 'scheduled':
            actions.push({ status: 'in_progress', label: 'Starta', variant: 'default' });
            break;
        case 'in_progress':
            actions.push({ status: 'waiting_parts', label: 'Väntar delar', variant: 'outline' });
            actions.push({ status: 'completed', label: 'Markera klar', variant: 'default' });
            break;
        case 'waiting_parts':
            actions.push({ status: 'in_progress', label: 'Fortsätt', variant: 'default' });
            break;
        case 'completed':
            actions.push({ status: 'invoiced', label: 'Fakturera', variant: 'default' });
            break;
        default:
            break;
    }
    return actions;
};
