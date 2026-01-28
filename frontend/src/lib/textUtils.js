/**
 * Text Utilities for Skyland CRM
 * 
 * Centralized text processing utilities for handling email content,
 * Swedish character encoding, and HTML entity decoding.
 * 
 * These utilities ensure consistent text handling across the application,
 * especially for email content that may have encoding issues.
 */

/**
 * Decode HTML entities to their character equivalents
 * @param {string} html - String potentially containing HTML entities
 * @returns {string} Decoded string
 */
export const decodeHTML = (html) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
};

/**
 * Decode quoted-printable encoded text
 * Common in email content where characters are encoded as =XX hex codes
 * @param {string} text - Quoted-printable encoded string
 * @returns {string} Decoded string
 */
export const decodeQuotedPrintable = (text) => {
    if (!text) return '';

    try {
        // Replace =XX hex codes with actual characters
        let decoded = text.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        // Remove soft line breaks (=\r\n or =\n)
        decoded = decoded.replace(/=\r?\n/g, '');

        return decoded;
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('Error decoding quoted-printable:', e);
        }
        return text;
    }
};

/**
 * Fix mojibake (incorrectly decoded UTF-8 Swedish characters)
 * Handles common encoding issues with Swedish å, ä, ö and other special characters
 * @param {string} text - Text with potential encoding issues
 * @returns {string} Fixed text with correct Swedish characters
 */
export const fixSwedishEncoding = (text) => {
    if (!text) return '';

    // Common UTF-8 mojibake patterns for Swedish characters
    const replacements = {
        'Ã¥': 'å', 'Ã¤': 'ä', 'Ã¶': 'ö',
        'Ã…': 'Å', 'Ã„': 'Ä', 'Ã–': 'Ö',
        'Ã©': 'é', 'Ã¨': 'è', 'Ã': 'à',
        'â€™': "'", 'â€œ': '"', 'â€': '"',
        'â€"': '–',         // En dash
        'Â': '',           // Non-breaking space artifacts
        'å€¦': 'å', 'å€¡': 'ä', 'å€': 'ö',
        'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
        '\uFFFD': '',      // Unicode replacement character
        '\u2630': '',      // Trigram for heaven (☰)
        '\u2593': '',      // Dark shade (▓)
        '\u2592': '',      // Medium shade (▒)
        '\u2591': '',      // Light shade (░)
        '\u2588': '',      // Full block (█)
    };

    let fixed = text;
    for (const [wrong, correct] of Object.entries(replacements)) {
        fixed = fixed.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }

    return fixed;
};

/**
 * Clean email body text - removes quoted replies and formatting artifacts
 * Aggressively removes quoted email chains to show only the primary message content
 * @param {string} text - Raw email body text
 * @returns {string} Cleaned text without quoted content
 */
export const cleanEmailBody = (text) => {
    if (!text) return '';

    let cleaned = text;

    // STEP 1: Find and cut at common reply header patterns
    // These indicate the start of a quoted email chain
    const cutoffPatterns = [
        // "Den mån 12 jan. 2026 18:13Lars Johansson skrev:"
        /Den\s+(mån|tis|ons|tors|fre|lör|sön)?\s*\d{1,2}/i,
        // "12 januari 2026, 14:23 centraleuropeisk"
        /\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4},?\s+\d{1,2}:\d{2}/i,
        // Just "centraleuropeisk" timezone indicator
        /centraleuropeisk/i,
        // "On Mon, Jan 6, 2024"
        /On\s+\w{3,},?\s+\w{3,}\s+\d{1,2}/i,
        // Lines starting with "> " followed by these patterns
        /\n>\s*Den\s+/i,
        /\n>\s*\d{1,2}\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i,
        // "skrev" attributions
        /,?\s*skrev\s+[A-Za-zÀ-ÿ\s]+[<@]/i,
    ];

    // Find the earliest cutoff point
    let earliestCutoff = cleaned.length;
    for (const pattern of cutoffPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index !== undefined && match.index < earliestCutoff && match.index > 20) {
            earliestCutoff = match.index;
        }
    }

    // Cut at the earliest pattern match
    if (earliestCutoff < cleaned.length) {
        cleaned = cleaned.substring(0, earliestCutoff);
    }

    // STEP 2: Remove lines starting with ">" (quoted text)
    const lines = cleaned.split('\n');
    const cleanedLines = [];
    let foundContent = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines at the start
        if (!foundContent && trimmed === '') continue;

        // Skip lines starting with ">" (quoted)
        if (trimmed.startsWith('>')) continue;

        // Skip lines that are just ">" markers with spaces
        if (/^[\s>]+$/.test(line)) continue;

        // Check for inline reply headers and stop
        if (/^Den\s+(mån|tis|ons|tors|fre|lör|sön)?\s*\d/i.test(trimmed)) break;
        if (/^\d{1,2}\s+(jan|feb|mar)/i.test(trimmed) && /skrev|kl\./i.test(trimmed)) break;
        if (/^On\s+\w+,?\s+\w+\s+\d/i.test(trimmed)) break;

        // Skip "Skickat från min iPhone" etc
        if (/^Skickat från/i.test(trimmed)) continue;
        if (/^Sent from/i.test(trimmed)) continue;

        // Skip lines that are email headers
        if (/^<[^>]+>:?\s*$/.test(trimmed)) continue;

        foundContent = true;
        cleanedLines.push(line);
    }

    cleaned = cleanedLines.join('\n');

    // STEP 3: Clean up any remaining ">" artifacts
    cleaned = cleaned.replace(/^>\s*/gm, '');
    cleaned = cleaned.replace(/\s*>\s*>/g, ' ');

    // Remove multiple consecutive empty lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Trim
    cleaned = cleaned.trim();

    // STEP 4: If result is too short, get first paragraph
    if (cleaned.length < 20) {
        const firstLines = text.split('\n')
            .filter(l => !l.trim().startsWith('>') && l.trim().length > 0)
            .slice(0, 5)
            .join('\n');
        return firstLines.substring(0, 300).trim() || text.substring(0, 200);
    }

    return cleaned;
};

/**
 * Extract quoted content separately for optional display
 * Useful for showing previous messages in a collapsed section
 * @param {string} text - Full email body
 * @returns {string|null} Quoted content or null if none found
 */
export const extractQuotedContent = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const quotedLines = [];
    let inQuotedBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Check if this is a quote header
        if (/^Den\s+(mån|tis|ons|tors|fre|lör|sön)?\s*\d/i.test(trimmed)) {
            inQuotedBlock = true;
        }
        if (/^On\s+\w+,?\s+\w+\s+\d/i.test(trimmed)) {
            inQuotedBlock = true;
        }

        // Lines starting with ">" are quoted
        if (trimmed.startsWith('>') || inQuotedBlock) {
            quotedLines.push(line.replace(/^>\s*/, ''));
            inQuotedBlock = true;
        }
    }

    const quoted = quotedLines.join('\n').trim();
    return quoted.length > 20 ? quoted : null;
};

/**
 * Full decoding pipeline for email content
 * Applies all necessary transformations in the correct order
 * @param {string} text - Raw email text
 * @returns {string} Fully decoded and cleaned text
 */
export const decodeEmailContent = (text) => {
    if (!text) return '';
    return fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(text)));
};

/**
 * Full processing pipeline for email body
 * Decodes and cleans the content, removing quoted replies
 * @param {string} text - Raw email body
 * @returns {string} Processed email body ready for display
 */
export const processEmailBody = (text) => {
    if (!text) return '';
    return cleanEmailBody(decodeEmailContent(text));
};
