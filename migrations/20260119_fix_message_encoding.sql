-- Migration: Fix encoding for existing messages
-- This script fixes quoted-printable and mojibake encoding in existing messages

-- Create a function to decode quoted-printable
CREATE OR REPLACE FUNCTION decode_quoted_printable(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    IF text_input IS NULL THEN
        RETURN NULL;
    END IF;

    result := text_input;

    -- Replace common quoted-printable patterns
    result := regexp_replace(result, '=C3=A5', 'å', 'g');
    result := regexp_replace(result, '=C3=A4', 'ä', 'g');
    result := regexp_replace(result, '=C3=B6', 'ö', 'g');
    result := regexp_replace(result, '=C3=85', 'Å', 'g');
    result := regexp_replace(result, '=C3=84', 'Ä', 'g');
    result := regexp_replace(result, '=C3=96', 'Ö', 'g');
    result := regexp_replace(result, '=C3=A9', 'é', 'g');
    result := regexp_replace(result, '=C3=A8', 'è', 'g');

    -- Remove soft line breaks
    result := regexp_replace(result, '=\r?\n', '', 'g');

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to fix mojibake
CREATE OR REPLACE FUNCTION fix_mojibake(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    IF text_input IS NULL THEN
        RETURN NULL;
    END IF;

    result := text_input;

    -- Fix UTF-8 mojibake patterns
    result := replace(result, 'Ã¥', 'å');
    result := replace(result, 'Ã¤', 'ä');
    result := replace(result, 'Ã¶', 'ö');
    result := replace(result, 'Ã…', 'Å');
    result := replace(result, 'Ã„', 'Ä');
    result := replace(result, 'Ã–', 'Ö');
    result := replace(result, 'Ã©', 'é');
    result := replace(result, 'Ã¨', 'è');

    -- Remove block characters
    result := replace(result, '▓', '');
    result := replace(result, '▒', '');
    result := replace(result, '░', '');
    result := replace(result, '█', '');
    result := replace(result, '☰', '');

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all existing messages
UPDATE messages
SET
    subject = fix_mojibake(decode_quoted_printable(subject)),
    body_full = fix_mojibake(decode_quoted_printable(body_full)),
    body_preview = fix_mojibake(decode_quoted_printable(body_preview)),
    from_name = fix_mojibake(decode_quoted_printable(from_name))
WHERE
    -- Only update if there are encoding issues
    (subject LIKE '%=%' OR subject ~ '[▓▒░█☰]' OR subject ~ 'Ã[¥¤¶…„–]')
    OR (body_full LIKE '%=%' OR body_full ~ '[▓▒░█☰]' OR body_full ~ 'Ã[¥¤¶…„–]')
    OR (body_preview LIKE '%=%' OR body_preview ~ '[▓▒░█☰]' OR body_preview ~ 'Ã[¥¤¶…„–]')
    OR (from_name LIKE '%=%' OR from_name ~ '[▓▒░█☰]' OR from_name ~ 'Ã[¥¤¶…„–]');

-- Show statistics
SELECT
    COUNT(*) as total_messages,
    COUNT(CASE WHEN subject ~ '[▓▒░█☰]' OR subject ~ 'Ã[¥¤¶…„–]' THEN 1 END) as messages_with_encoding_issues
FROM messages;

-- Optional: Drop the helper functions after migration
-- DROP FUNCTION IF EXISTS decode_quoted_printable(TEXT);
-- DROP FUNCTION IF EXISTS fix_mojibake(TEXT);
