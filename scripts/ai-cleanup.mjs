#!/usr/bin/env node

/**
 * AI Email Cleanup Script
 * 
 * Analyzes all existing leads with AI and:
 * - Updates leads with AI summary, category, extracted data
 * - Deletes leads that are SPAM or IRRELEVANT (job applications, newsletters, etc)
 */

const SUPABASE_URL = 'https://aclcpanlrhnyszivvmdy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbGNwYW5scmhueXN6aXZ2bWR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxMzE1NSwiZXhwIjoyMDgzODg5MTU1fQ.mB5vTRmwLp9hOSwnxHni1MBkAuWor7gOEP96xYdsf0I';
const AI_ENDPOINT = `${SUPABASE_URL}/functions/v1/analyze-email`;

// Stats
let processed = 0;
let updated = 0;
let deleted = 0;
let errors = 0;

async function analyzeEmail(lead) {
    try {
        const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: lead.subject || '',
                from_email: lead.email || '',
                from_name: lead.name || '',
                body: lead.message || lead.subject || ''
            })
        });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`  ❌ AI analysis failed for ${lead.email}: ${error.message}`);
        return null;
    }
}

async function getLeads() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.status}`);
    }

    return await response.json();
}

async function updateLead(id, data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
    });

    return response.ok;
}

async function deleteLead(id) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    return response.ok;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🧹 AI Email Cleanup Script');
    console.log('==========================\n');

    // Get all leads
    console.log('📥 Fetching leads...');
    const leads = await getLeads();
    console.log(`   Found ${leads.length} leads to analyze\n`);

    if (leads.length === 0) {
        console.log('✅ No leads to process!');
        return;
    }

    // Process each lead
    for (const lead of leads) {
        processed++;
        const shortEmail = lead.email ? lead.email.substring(0, 30) : 'unknown';
        const shortSubject = (lead.subject || '').substring(0, 40);

        console.log(`\n[${processed}/${leads.length}] Analyzing: ${shortEmail}`);
        console.log(`   Subject: ${shortSubject}...`);

        // Skip if already has AI data
        if (lead.ai_processed_at && lead.ai_category) {
            console.log(`   ⏭️  Already processed, skipping`);
            continue;
        }

        // Analyze with AI
        const analysis = await analyzeEmail(lead);

        if (!analysis) {
            errors++;
            continue;
        }

        console.log(`   📊 Category: ${analysis.category} | Relevant: ${analysis.is_business_relevant}`);

        // Handle based on category
        if (!analysis.is_business_relevant || ['SPAM', 'IRRELEVANT'].includes(analysis.category)) {
            console.log(`   🗑️  Deleting (${analysis.rejection_reason || analysis.category})`);
            const success = await deleteLead(lead.id);
            if (success) {
                deleted++;
                console.log(`   ✅ Deleted`);
            } else {
                errors++;
                console.log(`   ❌ Failed to delete`);
            }
        } else {
            // Update lead with AI data
            const updateData = {
                ai_category: analysis.category,
                ai_priority: analysis.priority,
                ai_summary: analysis.summary,
                ai_confidence: analysis.confidence,
                extracted_data: analysis.extracted_data || {},
                is_business_relevant: true,
                ai_processed_at: new Date().toISOString()
            };

            console.log(`   📝 Updating with: ${analysis.summary?.substring(0, 50)}...`);
            const success = await updateLead(lead.id, updateData);
            if (success) {
                updated++;
                console.log(`   ✅ Updated`);
            } else {
                errors++;
                console.log(`   ❌ Failed to update`);
            }
        }

        // Rate limiting - wait 500ms between requests to avoid overwhelming the API
        await sleep(500);
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('==========');
    console.log(`   Total processed: ${processed}`);
    console.log(`   Updated with AI data: ${updated}`);
    console.log(`   Deleted (spam/irrelevant): ${deleted}`);
    console.log(`   Errors: ${errors}`);
    console.log('\n✅ Cleanup complete!');
}

main().catch(console.error);
