export class DateUtil {
  static getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  static addDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  static getNextMonday(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    today.setDate(today.getDate() + diff);
    return today.toISOString().split('T')[0];
  }

  static getNextSunday(): string {
    const monday = new Date(this.getNextMonday());
    monday.setDate(monday.getDate() + 6);
    return monday.toISOString().split('T')[0];
  }
}