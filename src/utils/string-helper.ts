import * as crypto from 'crypto';

export function generateRandomString(length = 10): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function generateRandomEmail(domain = 'testmail.com'): string {
  return `test_${generateRandomString(8)}@${domain}`;
}

export function generateRandomPhone(format: 'US' | 'UK' = 'US'): string {
  const digits = () => Math.floor(Math.random() * 9000 + 1000);
  if (format === 'US') return `+1${Math.floor(Math.random() * 900 + 200)}${digits()}${Math.floor(Math.random() * 9000 + 1000)}`;
  return `+44${digits()}${digits()}`;
}

export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return format
    .replace('YYYY', String(y))
    .replace('MM', m)
    .replace('DD', d)
    .replace('HH', h)
    .replace('mm', min)
    .replace('ss', s);
}

export function maskSensitiveData(str: string): string {
  if (str.length <= 4) return '****';
  return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
}
