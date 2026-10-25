export function formatTime(value: string | Date, language: string) {
  return new Date(value).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function roundNumber(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}
