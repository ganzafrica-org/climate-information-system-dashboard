const MESSAGE_FORMAT_TOKENS = new Set([
    'minimal',
    'detailed',
    'full',
    'short',
    'standard',
    'verbose',
    'simple',
    'compact',
]);

function asMessageText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        return asMessageText(obj.content ?? obj.text ?? obj.body ?? obj.sms ?? obj.message);
    }
    return '';
}

function isFormatToken(text: string) {
    return MESSAGE_FORMAT_TOKENS.has(text.toLowerCase());
}

function isUnusableMessage(text: string) {
    if (isFormatToken(text)) return true;
    if (/^(success|ok|error)$/i.test(text)) return true;
    if (text.length < 80 && /(retrieved|successfully|fetched|updated|deleted)\b/i.test(text)) return true;
    return false;
}

function collectMessageCandidates(source: unknown, depth = 0): string[] {
    if (!source || depth > 3) return [];
    if (typeof source === 'string') {
        const text = source.trim();
        return text ? [text] : [];
    }
    if (Array.isArray(source)) {
        return source.flatMap((item) => collectMessageCandidates(item, depth + 1));
    }
    if (typeof source !== 'object') return [];

    const record = source as Record<string, unknown>;
    const keys = [
        'sms',
        'smsMessage',
        'smsText',
        'smsContent',
        'sms_text',
        'sms_content',
        'message_text',
        'alert_message',
        'generated_message',
        'kinyarwandaMessage',
        'farmerMessage',
        'content',
        'body',
        'text',
        'messageText',
        'alertMessage',
        'generatedMessage',
        'messageContent',
        'fullMessage',
        'weatherMessage',
        'weatherOverview',
        'overview',
        'description',
        'title',
        'message',
    ];

    const out: string[] = [];
    for (const key of keys) {
        const value = asMessageText(record[key]);
        if (value) out.push(value);
    }

    for (const nestedKey of ['alert', 'weather', 'daily', 'weatherData', 'data']) {
        if (record[nestedKey] && record[nestedKey] !== source) {
            out.push(...collectMessageCandidates(record[nestedKey], depth + 1));
        }
    }

    return out;
}

export function isPlaceholderSms(text?: string | null): boolean {
    if (!text) return true;
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (isFormatToken(trimmed)) return true;
    if (/^(daily|weekly|monthly|weather|alert|general)$/i.test(trimmed)) return true;
    if (/^teganyamuhinzi\s+(daily|weekly|monthly)/i.test(trimmed)) return true;
    return isUnusableMessage(trimmed);
}

export function extractFirstLogMessage(payload: unknown, alertId?: number): string {
    if (!payload) return '';

    const pickFromRow = (row: unknown): string => {
        if (!row || typeof row !== 'object') return asMessageText(row);
        const record = row as Record<string, unknown>;
        return asMessageText(
            record.message ??
            record.sms ??
            record.smsText ??
            record.content ??
            record.body ??
            record.text
        );
    };

    const belongsToAlert = (row: unknown): boolean => {
        if (alertId == null) return true;
        if (!row || typeof row !== 'object') return false;
        const record = row as Record<string, unknown>;
        const rowAlertId = Number(record.alertId ?? record.alert_id);
        return !Number.isFinite(rowAlertId) || rowAlertId === alertId;
    };

    const asRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

    if (Array.isArray(payload)) {
        const fromArray = pickFromRow(payload.find(belongsToAlert));
        return isPlaceholderSms(fromArray) ? '' : fromArray;
    }

    if (typeof payload === 'object') {
        const root = payload as Record<string, unknown>;
        const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
        const rows = [
            ...asRows(data.results),
            ...asRows(data.messages),
            ...asRows(data.logs),
            ...asRows(data.data),
            ...asRows(root.results),
            ...asRows(root.messages),
        ];
        const firstReal = rows
            .filter(belongsToAlert)
            .map(pickFromRow)
            .find((text) => text && !isPlaceholderSms(text));
        if (firstReal) return firstReal;
        const nested = belongsToAlert(data) ? pickFromRow(data) : '';
        if (nested && !isPlaceholderSms(nested)) return nested;
    }

    return '';
}

export function truncateSms(text: string, max = 80): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function resolveAlertMessage(alert: unknown): string {
    const candidates = collectMessageCandidates(alert);
    const realMessages = candidates.filter((text) => !isPlaceholderSms(text));
    if (realMessages.length) {
        return realMessages.sort((a, b) => b.length - a.length)[0];
    }

    const walkLongStrings = (source: unknown, depth = 0): string[] => {
        if (!source || depth > 2) return [];
        if (typeof source === 'string') {
            const text = source.trim();
            return text.length > 20 && !isUnusableMessage(text) ? [text] : [];
        }
        if (Array.isArray(source)) {
            return source.flatMap((item) => walkLongStrings(item, depth + 1));
        }
        if (typeof source !== 'object') return [];

        const skip = new Set([
            'location',
            'createdAt',
            'updatedAt',
            'sentAt',
            'status',
            'type',
            'category',
            'priority',
            'messageFormat',
            'messageType',
        ]);
        return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) => {
            if (skip.has(key)) return [];
            return walkLongStrings(value, depth + 1);
        });
    };

    const extras = walkLongStrings(alert);
    if (extras.length) {
        return extras.sort((a, b) => b.length - a.length)[0];
    }

    return asMessageText((alert as { message?: unknown } | null)?.message);
}
