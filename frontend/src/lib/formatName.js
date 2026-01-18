/**
 * Utility function to format customer names consistently
 * Handles various input formats and converts to proper "Förnamn Efternamn" format
 */

export const formatCustomerName = (name, email = '') => {
    if (!name && !email) return 'Okänd';

    let displayName = name || '';

    // If name is empty or looks like it's just an email prefix, try to extract from email
    const looksLikeEmailPrefix = !displayName ||
        displayName.includes('@') ||
        (displayName.includes('.') && !displayName.includes(' ') && displayName.length < 30);

    if (looksLikeEmailPrefix && email) {
        // Extract from email (use part before @)
        displayName = email.split('@')[0];
    }

    // Remove common prefixes/suffixes
    displayName = displayName
        .replace(/^(info|kontakt|order|support|noreply|no-reply|mail)$/i, '')
        .trim();

    if (!displayName) {
        // If still empty, use email domain or return unknown
        if (email) {
            const domain = email.split('@')[1];
            if (domain) {
                return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
            }
        }
        return 'Okänd';
    }

    // If it contains a dot but no space (like "john.smith"), convert dots to spaces
    if (displayName.includes('.') && !displayName.includes(' ')) {
        displayName = displayName.replace(/\./g, ' ');
    }

    // If it contains underscore but no space (like "john_smith"), convert underscores to spaces
    if (displayName.includes('_') && !displayName.includes(' ')) {
        displayName = displayName.replace(/_/g, ' ');
    }

    // Remove numbers at the end (like "john.smith50")
    displayName = displayName.replace(/\d+$/, '');

    // Capitalize each word properly (Förnamn Efternamn)
    displayName = displayName
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => {
            // Handle Swedish names with special patterns
            if (word.startsWith('af ') || word.startsWith('von ') || word.startsWith('de ')) {
                return word; // Keep lowercase for nobility particles
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');

    // Handle double-barreled names (like cc → C C, which we don't want)
    // If result is just single letters with spaces, it's probably wrong
    if (/^[A-Z]( [A-Z])+$/.test(displayName)) {
        // Return original cleaned name instead
        displayName = (name || email.split('@')[0] || 'Okänd');
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
    }

    return displayName.trim() || 'Okänd';
};

/**
 * Get initials from a name (for avatars, etc.)
 */
export const getInitials = (name) => {
    if (!name || name === 'Okänd') return '?';

    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
