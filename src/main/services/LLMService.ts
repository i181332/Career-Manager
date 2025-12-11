import { exec } from 'child_process';
import { Event, ESEntry, EmailMessage, Company } from '../../database/types';

import { getDatabase } from '../../database/init';
import { EventService } from './eventService';
import { ESEntryService } from './esEntryService';
import { SyncService } from './syncService';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface AIProcessedEmailResult {
    id: number; // Email ID
    company_name: string | null;
    events: Partial<Event>[];
    deadlines: Partial<ESEntry>[];
}

export interface BatchResult {
    processed: number;
    eventsCreated: number;
    esEntriesCreated: number;
    errors: number;
}

export class LLMService extends EventEmitter {
    private static instance: LLMService;

    private constructor() {
        super();
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    private log(type: 'info' | 'error' | 'prompt' | 'response', message: string, data?: any) {
        this.emit('log', {
            timestamp: new Date().toISOString(),
            type,
            message,
            data
        });
    }

    private executePrompt(prompt: string, commandTemplate: string): Promise<string> {
        this.log('prompt', 'Preparing AI Prompt', { promptLength: prompt.length });

        let command = commandTemplate;
        let tempFilePath: string | null = null;
        let useStdin = false;

        try {
            if (commandTemplate.includes('{{prompt_file}}')) {
                // Create a temporary file
                const tempDir = os.tmpdir();
                tempFilePath = path.join(tempDir, `ai_prompt_${Date.now()}.txt`);
                fs.writeFileSync(tempFilePath, prompt, 'utf-8');

                command = commandTemplate.replace('{{prompt_file}}', tempFilePath);
                this.log('info', 'Using file-based prompt', { tempFilePath });
            } else if (commandTemplate.includes('{{prompt}}')) {
                // Fallback to command line argument (legacy)
                // Escaping double quotes for shell
                const safePrompt = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
                command = commandTemplate.replace('{{prompt}}', safePrompt);

                if (prompt.length > 2000) {
                    this.log('info', 'Warning: Prompt is very long for command line argument. Consider using {{prompt_file}} or stdin.', { length: prompt.length });
                }
            } else {
                // No placeholder found, assume stdin
                useStdin = true;
                this.log('info', 'No placeholder found, using stdin for prompt', { length: prompt.length });
            }

            this.log('info', 'Executing command', { command: command.substring(0, 200) + '...' });

            const apiKey = process.env.GEMINI_API_KEY;
            this.log('info', 'Checking API Key', {
                exists: !!apiKey,
                length: apiKey?.length,
                prefix: apiKey ? apiKey.substring(0, 4) + '****' : 'N/A'
            });

            return new Promise((resolve, reject) => {
                const child = exec(command, {
                    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                    timeout: 300000, // 5 minutes timeout
                    env: process.env
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('LLM execution failed:', error);
                        this.log('error', 'LLM execution failed', {
                            message: error.message,
                            code: error.code,
                            killed: error.killed,
                            signal: error.signal
                        });
                        reject(error);
                        return;
                    }

                    if (stderr) {
                        console.warn('LLM stderr:', stderr);
                        this.log('info', 'LLM stderr output', { stderr });
                    }

                    this.log('response', 'AI Response received', { length: stdout.length, preview: stdout.substring(0, 100) + '...' });
                    resolve(stdout.trim());
                });

                if (useStdin && child.stdin) {
                    try {
                        child.stdin.write(prompt);
                        child.stdin.end();
                    } catch (e) {
                        console.error('Failed to write to stdin:', e);
                        this.log('error', 'Failed to write to stdin', { error: e });
                    }
                }
            });
        } catch (error: any) {
            console.error('LLM setup failed:', error);
            throw error;
        } finally {
            // Cleanup temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (e) {
                    console.error('Failed to delete temp file:', e);
                }
            }
        }
    }

    async extractInfo(emailBody: string, commandTemplate: string): Promise<{ events: Partial<Event>[], deadlines: Partial<ESEntry>[] }> {
        const currentDate = new Date().toISOString().split('T')[0];
        const prompt = `
あなたは就職活動のスケジュール管理アシスタントです。
以下のメール本文を処理し、「イベント」と「締切」を抽出してください。

# 入力データ
${emailBody.substring(0, 2000)}

# 処理ルール
1. **イベント (events)**:
   - ユーザーが特定の時間に**参加**する必要があるもの（面接、説明会、座談会など）。
   - 開始日時 (start_at) は必須です。

2. **締切 (deadlines)**:
   - ユーザーが特定の期日までに**完了**または**提出**する必要があるもの（ES提出、Webテスト受検など）。
   - 期限日時 (deadline) は必須です。

# 注意事項
- 日時は ISO 8601 形式 (YYYY-MM-DDTHH:mm:ss) に変換してください。
- 年が明記されていない場合は、現在日時 (${currentDate}) を基準に、最も近い未来の日付を推測してください。
- 出力は必ず以下のJSONフォーマットのみとしてください。Markdownや説明は不要です。

# 出力フォーマット (JSON)
{
  "events": [
    {
      "title": "イベント名",
      "start_at": "ISO 8601",
      "end_at": "ISO 8601 (optional)",
      "location": "場所 (optional)",
      "description": "詳細 (optional)"
    }
  ],
  "deadlines": [
    {
      "title": "締切名",
      "deadline": "ISO 8601",
      "content": "詳細 (optional)"
    }
  ]
}
`.trim();

        try {
            const resultStr = await this.executePrompt(prompt, commandTemplate);
            const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resultStr;
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse AI extract response:', e);
            this.log('error', 'Failed to parse AI extract response', { error: e });
            return { events: [], deadlines: [] };
        }
    }

    async processBatch(
        userId: number,
        commandTemplate: string,
        eventService: EventService,
        esEntryService: ESEntryService,
        syncService: SyncService
    ): Promise<BatchResult> {
        const db = getDatabase();

        const result: BatchResult = {
            processed: 0,
            eventsCreated: 0,
            esEntriesCreated: 0,
            errors: 0
        };

        // Fetch ALL unprocessed emails
        const emails = db.prepare(`
            SELECT * FROM email_messages 
            WHERE ai_processed = 0 
            AND email_account_id IN (SELECT id FROM email_accounts WHERE user_id = ?)
            ORDER BY received_at DESC
        `).all(userId) as EmailMessage[];

        if (emails.length === 0) {
            this.log('info', 'No unprocessed emails found.');
            return result;
        }

        this.log('info', `Starting bulk processing for ${emails.length} emails...`);

        const currentDate = new Date().toISOString().split('T')[0];

        // Construct bulk prompt
        const emailsJson = JSON.stringify(emails.map(e => ({
            id: e.id,
            from: e.from_address,
            from_name: e.from_name,
            subject: e.subject,
            body: (e.body_text || '').substring(0, 1000) // Limit body length
        })));

        const prompt = `
あなたは就職活動のスケジュール管理アシスタントです。
以下のメールリスト（JSON）を処理し、各メールについて「企業名」「イベント」「締切」を抽出してください。

# 入力データ
${emailsJson}

# 処理ルール
1. **企業名 (company_name)**:
   - 送信者名、メールアドレス、件名、本文から企業名を特定してください。
   - 就活サイト（マイナビ、リクナビなど）からのメールの場合は、本文中の対象企業名を抽出してください。
   - 優先順位: 送信者名 > 署名 > 件名 > 本文
   - 「Partner」や「Campaign」などの宣伝メールで、特定の選考プロセスに関係しないものは無視してください（nullとしてください）。
   - 特定できない場合は null としてください。

2. **イベント (events)**:
   - ユーザーが特定の時間に**参加**する必要があるもの（面接、説明会、座談会など）。
   - 開始日時 (start_at) は必須です。

3. **締切 (deadlines)**:
   - ユーザーが特定の期日までに**完了**または**提出**する必要があるもの（ES提出、Webテスト受検など）。
   - 期限日時 (deadline) は必須です。

# 注意事項
- 日時は ISO 8601 形式 (YYYY-MM-DDTHH:mm:ss) に変換してください。
- 年が明記されていない場合は、現在日時 (${currentDate}) を基準に、最も近い未来の日付を推測してください。
- 出力は必ず以下のJSONフォーマットのみとしてください。Markdownや説明は不要です。

# 出力フォーマット (JSON配列)
[
  {
    "id": 入力メールのID (数値),
    "company_name": "企業名",
    "events": [
      {
        "title": "イベント名",
        "start_at": "ISO 8601",
        "end_at": "ISO 8601 (optional)",
        "location": "場所 (optional)",
        "description": "詳細 (optional)"
      }
    ],
    "deadlines": [
      {
        "title": "締切名",
        "deadline": "ISO 8601",
        "content": "詳細 (optional)"
      }
    ]
  }
]
        `.trim();

        let aiResults: AIProcessedEmailResult[] = [];
        try {
            // Use {{prompt_file}} implicitly if the command template supports it, or just pass the prompt
            // The executePrompt method handles the file creation logic if {{prompt_file}} is present in the template.
            // If the user is using the 'gemini' CLI tool which supports stdin, executePrompt also handles that.
            // However, for very large payloads, file-based is safer if the CLI supports it.
            // Since we are forcing bulk processing, we should ensure the command template is appropriate or rely on stdin.

            const resultStr = await this.executePrompt(prompt, commandTemplate);
            const jsonMatch = resultStr.match(/\[[\s\S]*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resultStr;
            aiResults = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse AI batch response:', e);
            this.log('error', 'Failed to parse AI batch response', { error: e });
            // We don't mark as error in DB here, because it might be a transient AI failure.
            // The user can retry.
            result.errors += emails.length;
            return result;
        }

        const isValidDate = (dateStr: string) => !isNaN(Date.parse(dateStr));
        const inferEventType = (title: string): string => {
            if (title.includes('説明会') || title.includes('セミナー') || title.includes('座談会')) return 'briefing';
            if (title.includes('面接') || title.includes('選考')) return 'interview';
            if (title.includes('テスト') || title.includes('試験')) return 'test';
            return 'other';
        };

        // Process each result
        for (const aiRes of aiResults) {
            const email = emails.find(e => e.id === aiRes.id);
            if (!email) continue;

            try {
                let companyId = email.company_id;

                // 1. Resolve Company
                if (!companyId && aiRes.company_name) {
                    // Search for existing company
                    const existingCompany = db.prepare('SELECT id FROM companies WHERE user_id = ? AND name LIKE ?').get(userId, `%${aiRes.company_name}%`) as Company | undefined;

                    if (existingCompany) {
                        companyId = existingCompany.id;
                        // Update email allocation
                        db.prepare('UPDATE email_messages SET company_id = ?, allocation_method = ? WHERE id = ?').run(companyId, 'ai', email.id);
                        this.log('info', `Allocated email ${email.id} to company ${existingCompany.name}`);
                    } else {
                        // Unknown company -> Ignore as promotion mail
                        this.log('info', `Ignoring email ${email.id} from unknown company: ${aiRes.company_name}`);
                        // Mark as processed (ignored)
                        db.prepare("UPDATE email_messages SET ai_processed = 1, ai_processed_at = datetime('now') WHERE id = ?").run(email.id);
                        result.processed++;
                        continue; // Skip event/deadline creation
                    }
                } else if (!companyId) {
                    // No company identified -> Ignore
                    this.log('info', `Could not identify company for email ${email.id}. Ignoring.`);
                    db.prepare("UPDATE email_messages SET ai_processed = 1, ai_processed_at = datetime('now') WHERE id = ?").run(email.id);
                    result.processed++;
                    continue;
                }

                // 2. Create Events
                if (aiRes.events && aiRes.events.length > 0) {
                    for (const evt of aiRes.events) {
                        if (evt.title && evt.start_at && isValidDate(evt.start_at)) {
                            const eventData = {
                                user_id: userId,
                                company_id: companyId,
                                title: evt.title,
                                description: evt.description || '',
                                start_at: evt.start_at,
                                end_at: evt.end_at && isValidDate(evt.end_at) ? evt.end_at : new Date(new Date(evt.start_at).getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour
                                all_day: false,
                                location: evt.location || '',
                                type: inferEventType(evt.title),
                                remind_before_minutes: 30, // Default
                                slack_notify: true
                            };
                            const newEvent = eventService.create(eventData);
                            // Sync to Google Calendar (Single Event)
                            if (newEvent.success && newEvent.event) {
                                await syncService.syncEventToGoogleCalendar(newEvent.event.id);
                                result.eventsCreated++;
                                this.log('info', `Created event: ${newEvent.event.title}`);
                            }
                        }
                    }
                }

                // 3. Create Deadlines (ES Entries)
                if (aiRes.deadlines && aiRes.deadlines.length > 0) {
                    for (const dl of aiRes.deadlines) {
                        if (dl.title && dl.deadline && isValidDate(dl.deadline)) {
                            const esData = {
                                user_id: userId,
                                company_id: companyId,
                                title: dl.title,
                                content: dl.content || '',
                                status: 'not_started',
                                deadline: dl.deadline
                            };
                            const newESEntry = esEntryService.create(esData);
                            if (newESEntry.success && newESEntry.esEntry) {
                                result.esEntriesCreated++;
                                this.log('info', `Created deadline: ${newESEntry.esEntry.title}`);
                            }
                        }
                    }
                }

                // Mark as successfully processed
                db.prepare("UPDATE email_messages SET ai_processed = 1, ai_processed_at = datetime('now') WHERE id = ?").run(email.id);
                result.processed++;

            } catch (err: any) {
                console.error(`Failed to process result for email ${email.id}:`, err);
                this.log('error', `Failed to process result for email ${email.id}`, { error: err });
                // Mark as failed
                db.prepare("UPDATE email_messages SET ai_processed = 2, ai_processed_at = datetime('now') WHERE id = ?").run(email.id);
                result.errors++;
            }
        }

        return result;
    }
}
