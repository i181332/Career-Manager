import { ESEntry, Event } from '../../database/types';

export class EmailParser {
    // 日時抽出用正規表現
    private static datePatterns = [
        /(\d{1,2})月(\d{1,2})日\s*[(（]?[月火水木金土日][)）]?\s*(\d{1,2})[:：](\d{2})/g, // 12月1日(月) 10:00
        /(\d{4})[\/年](\d{1,2})[\/月](\d{1,2})日?\s*[(（]?[月火水木金土日][)）]?\s*(\d{1,2})[:：](\d{2})/g, // 2023/12/01 10:00
    ];

    // キーワード
    private static eventKeywords = ['面接', '面談', '説明会', '選考', '座談会', 'セミナー'];
    private static esKeywords = ['エントリーシート', 'ES', '提出', '締切', '期限'];

    // イベント候補抽出
    static extractEventCandidates(subject: string, body: string): Partial<Event>[] {
        const candidates: Partial<Event>[] = [];
        const text = `${subject}\n${body}`;

        for (const pattern of this.datePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // マッチした周辺のテキストを取得（前後50文字）
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + 50);
                const context = text.substring(start, end);

                // キーワードが含まれているか確認
                const hasKeyword = this.eventKeywords.some((keyword) => context.includes(keyword));

                if (hasKeyword) {
                    const year = match.length === 6 ? parseInt(match[1]) : new Date().getFullYear();
                    const month = match.length === 6 ? parseInt(match[2]) : parseInt(match[1]);
                    const day = match.length === 6 ? parseInt(match[3]) : parseInt(match[2]);
                    const hour = match.length === 6 ? parseInt(match[4]) : parseInt(match[3]);
                    const minute = match.length === 6 ? parseInt(match[5]) : parseInt(match[4]);

                    const date = new Date(year, month - 1, day, hour, minute);

                    // 過去の日付でないか（1年以上前なら来年とみなす簡易ロジックなどは省略）
                    // 重複排除などは呼び出し元で行う

                    candidates.push({
                        title: this.guessTitle(context) || '予定',
                        start_at: date.toISOString(),
                        description: `メールより自動抽出: ${match[0]}`,
                    });
                }
            }
        }

        return candidates;
    }

    // ES締切候補抽出
    static extractESDeadlineCandidates(subject: string, body: string): Partial<ESEntry>[] {
        const candidates: Partial<ESEntry>[] = [];
        const text = `${subject}\n${body}`;

        for (const pattern of this.datePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + 50);
                const context = text.substring(start, end);

                const hasKeyword = this.esKeywords.some((keyword) => context.includes(keyword));

                if (hasKeyword) {
                    const year = match.length === 6 ? parseInt(match[1]) : new Date().getFullYear();
                    const month = match.length === 6 ? parseInt(match[2]) : parseInt(match[1]);
                    const day = match.length === 6 ? parseInt(match[3]) : parseInt(match[2]);
                    const hour = match.length === 6 ? parseInt(match[4]) : parseInt(match[3]);
                    const minute = match.length === 6 ? parseInt(match[5]) : parseInt(match[4]);

                    const date = new Date(year, month - 1, day, hour, minute);

                    candidates.push({
                        title: 'ES提出締切',
                        deadline: date.toISOString(), // ES型定義にdeadlineがある前提
                        status: 'draft',
                    } as any);
                }
            }
        }

        return candidates;
    }

    private static guessTitle(context: string): string | undefined {
        for (const keyword of this.eventKeywords) {
            if (context.includes(keyword)) {
                return keyword;
            }
        }
        return undefined;
    }
}
