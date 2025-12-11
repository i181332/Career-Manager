
import { LLMService } from './services/LLMService';
import { EventService } from './services/eventService';
import { ESEntryService } from './services/esEntryService';
import { SyncService } from './services/syncService';
import { getDatabase, initDatabase } from '../database/init';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    console.log('Starting AI Batch Processing Debug...');

    // Initialize DB
    initDatabase();
    const db = getDatabase();

    // Mock services if needed, or use real ones
    const eventService = new EventService();
    const esEntryService = new ESEntryService();
    const syncService = new SyncService();

    // Mock syncService.syncEventToGoogleCalendar to avoid actual API calls if we just want to test logic
    // But user wants to verify sync, so let's keep it real if possible.
    // However, for safety, maybe we should just log it first.
    // const originalSync = syncService.syncEventToGoogleCalendar;
    // syncService.syncEventToGoogleCalendar = async (eventId: number) => {
    //     console.log(`[Mock] Syncing event ${eventId} to Google Calendar`);
    //     return true;
    // };

    const llmService = LLMService.getInstance();

    // Listen to logs
    llmService.on('log', (log) => {
        console.log(`[LLMService] ${log.type}: ${log.message}`, log.data ? JSON.stringify(log.data) : '');
    });

    const userId = 1; // Assuming user ID 1
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
        console.log('User ID 1 not found. Creating dummy user.');
        db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(userId, 'Test User', 'test@example.com', 'hash');
        db.prepare('INSERT INTO email_accounts (id, user_id, email_address, provider) VALUES (?, ?, ?, ?)').run(1, userId, 'test@example.com', 'gmail');
    }

    // Check for unprocessed emails
    const emails = db.prepare('SELECT count(*) as count FROM email_messages WHERE ai_processed = 0').get() as { count: number };
    console.log(`Found ${emails.count} unprocessed emails.`);

    if (emails.count === 0) {
        console.log('No emails to process. Inserting dummy email.');
        // Insert dummy user if not exists (we checked user 1 exists, but if new DB, it won't)
        const userCheck = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!userCheck) {
            db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(userId, 'Test User', 'test@example.com', 'hash');
            // Insert email account
            db.prepare('INSERT INTO email_accounts (id, user_id, email_address, provider) VALUES (?, ?, ?, ?)').run(1, userId, 'test@example.com', 'gmail');
        }

        // Insert dummy email
        db.prepare(`
            INSERT INTO email_messages (
                email_account_id, message_id, from_address, from_name, subject, body_text, received_at, ai_processed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            1,
            `msg_${Date.now()}`,
            'recruiter@example.com',
            'Recruiter Name',
            '面接のご案内',
            '株式会社Exampleの採用担当です。\n\n以下の日程で面接を行います。\n\n日時：2025年12月10日 14:00〜15:00\n場所：オンライン\n\nよろしくお願いいたします。',
            new Date().toISOString(),
            0
        );
        console.log('Dummy email inserted.');
    }

    // Command template
    // We'll use the CLI tool if configured, or a default one.
    // The user prefers gemini_CLI.
    // Let's assume the user has set it up.
    // If not, we can try a direct python call or echo for testing.

    // For this test, let's try to read the command template from settings or env?
    // The app usually gets it from settings.
    // Let's fetch settings from users table
    const userRow = db.prepare('SELECT settings, ai_config FROM users WHERE id = ?').get(userId) as any;
    let commandTemplate = '';

    if (userRow && userRow.ai_config) {
        try {
            const aiConfig = JSON.parse(userRow.ai_config);
            commandTemplate = aiConfig.commandTemplate;
        } catch (e) {
            console.error('Failed to parse ai_config', e);
        }
    }

    if (!commandTemplate) {
        console.log('No command template found in settings. Using default for testing.');
        // Default to a simple echo for testing if we don't have the real CLI
        // But user wants to verify gemini_CLI.
        // We can assume it's in the path or use a placeholder.
        // Let's use a dummy command that returns a valid JSON to verify the parsing logic.
        // Or if we want to test the REAL AI, we need the real command.
        // I'll try to use 'echo' with a mocked response for safety, OR rely on user env.
        // But the user said "The user strongly prefers using a gemini_CLI tool".
        // I will assume 'gemini' is in the path.
        commandTemplate = 'gemini "{{prompt_file}}"';
    }

    console.log('Using command template:', commandTemplate);

    try {
        const result = await llmService.processBatch(
            userId,
            commandTemplate,
            eventService,
            esEntryService,
            syncService
        );

        console.log('Batch processing complete:', result);
    } catch (error) {
        console.error('Batch processing failed:', error);
    }
}

main().catch(console.error);
