-- =====================================================
-- Clean HTML/CSS from existing messages
-- Run this ONCE to fix legacy data with CSS artifacts
-- =====================================================
-- Step 1: Remove <style>...</style> blocks and their content
UPDATE messages
SET body_preview = regexp_replace(
        body_preview,
        '<style[^>]*>.*?</style>',
        '',
        'gis'
    ),
    body_full = regexp_replace(body_full, '<style[^>]*>.*?</style>', '', 'gis')
WHERE body_preview ~ '<style'
    OR body_full ~ '<style';
-- Step 2: Remove <script>...</script> blocks and their content
UPDATE messages
SET body_preview = regexp_replace(
        body_preview,
        '<script[^>]*>.*?</script>',
        '',
        'gis'
    ),
    body_full = regexp_replace(
        body_full,
        '<script[^>]*>.*?</script>',
        '',
        'gis'
    )
WHERE body_preview ~ '<script'
    OR body_full ~ '<script';
-- Step 3: Remove <head>...</head> blocks and their content
UPDATE messages
SET body_preview = regexp_replace(body_preview, '<head[^>]*>.*?</head>', '', 'gis'),
    body_full = regexp_replace(body_full, '<head[^>]*>.*?</head>', '', 'gis')
WHERE body_preview ~ '<head'
    OR body_full ~ '<head';
-- Step 4: Remove HTML comments
UPDATE messages
SET body_preview = regexp_replace(body_preview, '<!--.*?-->', '', 'gs'),
    body_full = regexp_replace(body_full, '<!--.*?-->', '', 'gs')
WHERE body_preview ~ '<!--'
    OR body_full ~ '<!--';
-- Step 5: Replace closing block elements with newlines
UPDATE messages
SET body_preview = regexp_replace(
        body_preview,
        '</(p|div|h[1-6]|li|tr|br)>',
        E'\n',
        'gi'
    ),
    body_full = regexp_replace(
        body_full,
        '</(p|div|h[1-6]|li|tr|br)>',
        E'\n',
        'gi'
    )
WHERE body_preview ~ '</'
    OR body_full ~ '</';
-- Step 6: Replace <br> with newlines
UPDATE messages
SET body_preview = regexp_replace(body_preview, '<br\s*/?>', E'\n', 'gi'),
    body_full = regexp_replace(body_full, '<br\s*/?>', E'\n', 'gi')
WHERE body_preview ~ '<br'
    OR body_full ~ '<br';
-- Step 7: Remove all remaining HTML tags
UPDATE messages
SET body_preview = regexp_replace(body_preview, '<[^>]+>', '', 'g'),
    body_full = regexp_replace(body_full, '<[^>]+>', '', 'g')
WHERE body_preview ~ '<'
    OR body_full ~ '<';
-- Step 8: Decode common HTML entities
UPDATE messages
SET body_preview = replace(
        replace(
            replace(
                replace(
                    replace(body_preview, '&nbsp;', ' '),
                    '&amp;',
                    '&'
                ),
                '&lt;',
                '<'
            ),
            '&gt;',
            '>'
        ),
        '&quot;',
        '"'
    ),
    body_full = replace(
        replace(
            replace(
                replace(
                    replace(body_full, '&nbsp;', ' '),
                    '&amp;',
                    '&'
                ),
                '&lt;',
                '<'
            ),
            '&gt;',
            '>'
        ),
        '&quot;',
        '"'
    )
WHERE body_preview ~ '&[a-z]+;'
    OR body_full ~ '&[a-z]+;';
-- Step 9: Remove CSS patterns like ".class { ... }" or "element { ... }"
UPDATE messages
SET body_preview = regexp_replace(
        body_preview,
        '[.#@]?[a-zA-Z0-9_-]+\s*\{[^}]*\}',
        '',
        'g'
    ),
    body_full = regexp_replace(
        body_full,
        '[.#@]?[a-zA-Z0-9_-]+\s*\{[^}]*\}',
        '',
        'g'
    )
WHERE body_preview ~ '\{[^}]*\}'
    OR body_full ~ '\{[^}]*\}';
-- Step 10: Remove inline CSS patterns like "property: value;"
UPDATE messages
SET body_preview = regexp_replace(
        body_preview,
        '[a-zA-Z-]+\s*:\s*[^;{}\n]{1,50};',
        '',
        'g'
    ),
    body_full = regexp_replace(
        body_full,
        '[a-zA-Z-]+\s*:\s*[^;{}\n]{1,50};',
        '',
        'g'
    )
WHERE body_preview ~ ':\s*[^;]+;'
    OR body_full ~ ':\s*[^;]+;';
-- Step 11: Clean up multiple consecutive newlines
UPDATE messages
SET body_preview = regexp_replace(body_preview, E'\n\\s*\n\\s*\n', E'\n\n', 'g'),
    body_full = regexp_replace(body_full, E'\n\\s*\n\\s*\n', E'\n\n', 'g');
-- Step 12: Clean up multiple consecutive spaces
UPDATE messages
SET body_preview = regexp_replace(body_preview, '  +', ' ', 'g'),
    body_full = regexp_replace(body_full, '  +', ' ', 'g');
-- Step 13: Trim whitespace
UPDATE messages
SET body_preview = trim(body_preview),
    body_full = trim(body_full);
-- Verify the cleanup
SELECT id,
    subject,
    LEFT(body_preview, 200) as cleaned_preview
FROM messages
ORDER BY received_at DESC
LIMIT 10;