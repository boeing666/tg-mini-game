import crypto from 'crypto';

export interface UserData {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
    is_premium: boolean;
    allows_write_to_pm: boolean;
    photo_url: string;
}

export interface UserInitData {
    auth_date: number;
    chat_instance: number;
    chat_type: string;
    signature: string;
    user: UserData;
}

export function parseTelegramInitData(initData : string): UserInitData | null {
    const urlParams = new URLSearchParams(initData);

    const requiredParams = ['user', 'auth_date', 'chat_instance', 'chat_type', 'signature'];
    const missingParam = requiredParams.find(param => !urlParams.get(param));
    if (missingParam) {
        return null;
    }

    const user: UserData = JSON.parse(decodeURIComponent(urlParams.get('user')!));

    const tgInitData: UserInitData = {
        auth_date: Number(urlParams.get('auth_date')),
        chat_instance: Number(urlParams.get('chat_instance')),
        chat_type: urlParams.get('chat_type')!,
        signature: urlParams.get('signature')!,
        user: user
    };

    return tgInitData;
}

function sortTelegramData(initData: string): string {
    return initData
        .split('&')
        .filter(s => !s.startsWith('hash='))
        .map(s => s.split('='))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
        .join('\n');
}

export function validateTelegramData(
    hashStr: string, initData: string,
    token: string, cStr = 'WebAppData'
) : boolean {
    const sortedData = sortTelegramData(initData);
    const secretKey = crypto.createHmac('sha256', cStr).update(token).digest();
    const dataCheck = crypto.createHmac('sha256', secretKey).update(sortedData).digest('hex');
    return dataCheck === hashStr;
}
