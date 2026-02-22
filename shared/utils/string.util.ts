export class StringUtil {
  static generateRandomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, length + 2);
  }

  static generateRandomEmail(): string {
    return `test_${this.generateRandomString(8)}@example.com`;
  }

  static replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\${(\w+)}/g, (match, key) => {
      return variables[key] || process.env[key] || match;
    });
  }
}