import api from '@/lib/api';
import { extractFirstLogMessage, isPlaceholderSms } from '@/lib/alertMessage';

export async function fetchFarmerSmsForAlert(alertId: number): Promise<string> {
    if (!alertId) return '';
    const payload = await api.get('/api/weather/admin/logs/messages', {
        params: {
            alertId,
            limit: 1,
            sortField: 'createdAt',
            sortOrder: 'DESC',
        },
        skipRetry: true,
    });
    const message = extractFirstLogMessage(payload, alertId);
    return isPlaceholderSms(message) ? '' : message;
}

export async function fetchFarmerSmsMap(alertIds: number[]): Promise<Record<number, string>> {
    const unique = [...new Set(alertIds.filter((id) => Number.isFinite(id) && id > 0))];
    const entries = await Promise.all(
        unique.map(async (id) => {
            try {
                const message = await fetchFarmerSmsForAlert(id);
                return message ? ([id, message] as const) : null;
            } catch {
                return null;
            }
        })
    );

    return Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => Boolean(entry)));
}
