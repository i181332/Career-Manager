// バリデーションユーティリティ

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validator {
  // 文字列のバリデーション
  static validateString(
    value: string,
    fieldName: string,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      patternMessage?: string;
    }
  ): ValidationResult {
    const errors: string[] = [];

    if (options?.required && (!value || value.trim().length === 0)) {
      errors.push(`${fieldName}は必須です`);
      return { isValid: false, errors };
    }

    if (value && value.trim().length > 0) {
      if (options?.minLength && value.length < options.minLength) {
        errors.push(`${fieldName}は${options.minLength}文字以上である必要があります`);
      }

      if (options?.maxLength && value.length > options.maxLength) {
        errors.push(`${fieldName}は${options.maxLength}文字以下である必要があります`);
      }

      if (options?.pattern && !options.pattern.test(value)) {
        errors.push(
          options.patternMessage || `${fieldName}の形式が正しくありません`
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // メールアドレスのバリデーション
  static validateEmail(email: string, required: boolean = true): ValidationResult {
    const errors: string[] = [];

    if (required && (!email || email.trim().length === 0)) {
      errors.push('メールアドレスは必須です');
      return { isValid: false, errors };
    }

    if (email && email.trim().length > 0) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        errors.push('メールアドレスの形式が正しくありません');
      }

      if (email.length > 254) {
        errors.push('メールアドレスが長すぎます');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // パスワードのバリデーション（複雑性要件付き）
  static validatePassword(password: string, options?: {
    requireComplexity?: boolean;
    minLength?: number;
  }): ValidationResult {
    const errors: string[] = [];
    const minLength = options?.minLength || 8;

    if (!password || password.length === 0) {
      errors.push('パスワードは必須です');
      return { isValid: false, errors };
    }

    if (password.length < minLength) {
      errors.push(`パスワードは${minLength}文字以上である必要があります`);
    }

    if (options?.requireComplexity) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

      const complexityCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

      if (complexityCount < 3) {
        errors.push(
          'パスワードは大文字、小文字、数字、記号のうち3種類以上を含む必要があります'
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // URLのバリデーション
  static validateURL(url: string, required: boolean = false): ValidationResult {
    const errors: string[] = [];

    if (required && (!url || url.trim().length === 0)) {
      errors.push('URLは必須です');
      return { isValid: false, errors };
    }

    if (url && url.trim().length > 0) {
      try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          errors.push('URLはhttp://またはhttps://で始まる必要があります');
        }
      } catch {
        errors.push('URLの形式が正しくありません');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // 日付のバリデーション
  static validateDate(
    dateString: string,
    fieldName: string,
    options?: {
      required?: boolean;
      minDate?: Date;
      maxDate?: Date;
      allowPast?: boolean;
      allowFuture?: boolean;
    }
  ): ValidationResult {
    const errors: string[] = [];

    if (options?.required && (!dateString || dateString.trim().length === 0)) {
      errors.push(`${fieldName}は必須です`);
      return { isValid: false, errors };
    }

    if (dateString && dateString.trim().length > 0) {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        errors.push(`${fieldName}の形式が正しくありません`);
        return { isValid: false, errors };
      }

      const now = new Date();

      if (options?.allowPast === false && date < now) {
        errors.push(`${fieldName}は未来の日時である必要があります`);
      }

      if (options?.allowFuture === false && date > now) {
        errors.push(`${fieldName}は過去の日時である必要があります`);
      }

      if (options?.minDate && date < options.minDate) {
        errors.push(`${fieldName}は${options.minDate.toLocaleDateString()}以降である必要があります`);
      }

      if (options?.maxDate && date > options.maxDate) {
        errors.push(`${fieldName}は${options.maxDate.toLocaleDateString()}以前である必要があります`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // 日付範囲のバリデーション（開始日 < 終了日）
  static validateDateRange(
    startDate: string,
    endDate: string,
    options?: {
      required?: boolean;
      allowEqual?: boolean;
    }
  ): ValidationResult {
    const errors: string[] = [];

    if (options?.required) {
      if (!startDate || startDate.trim().length === 0) {
        errors.push('開始日時は必須です');
      }
      if (!endDate || endDate.trim().length === 0) {
        errors.push('終了日時は必須です');
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push('開始日時の形式が正しくありません');
      }

      if (isNaN(end.getTime())) {
        errors.push('終了日時の形式が正しくありません');
      }

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (options?.allowEqual) {
          if (end < start) {
            errors.push('終了日時は開始日時以降である必要があります');
          }
        } else {
          if (end <= start) {
            errors.push('終了日時は開始日時より後である必要があります');
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // 数値のバリデーション
  static validateNumber(
    value: number | string,
    fieldName: string,
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    }
  ): ValidationResult {
    const errors: string[] = [];

    if (options?.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName}は必須です`);
      return { isValid: false, errors };
    }

    if (value !== null && value !== undefined && value !== '') {
      const num = typeof value === 'string' ? parseFloat(value) : value;

      if (isNaN(num)) {
        errors.push(`${fieldName}は数値である必要があります`);
        return { isValid: false, errors };
      }

      if (options?.integer && !Number.isInteger(num)) {
        errors.push(`${fieldName}は整数である必要があります`);
      }

      if (options?.min !== undefined && num < options.min) {
        errors.push(`${fieldName}は${options.min}以上である必要があります`);
      }

      if (options?.max !== undefined && num > options.max) {
        errors.push(`${fieldName}は${options.max}以下である必要があります`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Slack Webhook URLのバリデーション
  static validateSlackWebhook(url: string, required: boolean = false): ValidationResult {
    const errors: string[] = [];

    if (required && (!url || url.trim().length === 0)) {
      errors.push('Slack Webhook URLは必須です');
      return { isValid: false, errors };
    }

    if (url && url.trim().length > 0) {
      if (!url.startsWith('https://hooks.slack.com/')) {
        errors.push('有効なSlack Webhook URLを入力してください（https://hooks.slack.com/で始まる必要があります）');
      }

      const urlValidation = this.validateURL(url, false);
      if (!urlValidation.isValid) {
        errors.push(...urlValidation.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // 複数のバリデーション結果を結合
  static combineResults(...results: ValidationResult[]): ValidationResult {
    const allErrors: string[] = [];

    results.forEach((result) => {
      allErrors.push(...result.errors);
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  // 入力値のサニタイゼーション（XSS対策）
  static sanitizeHtml(input: string): string {
    if (!input) return '';

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // SQLインジェクション対策のための文字列検証
  static validateSafeString(input: string, fieldName: string): ValidationResult {
    const errors: string[] = [];

    // 危険な文字列パターンの検出
    const dangerousPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /--/,
      /;[\s]*$/,
      /\/\*/,
      /\*\//,
      /\bOR\b.*=.*=/i,
      /\bAND\b.*=.*=/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        errors.push(`${fieldName}に不正な文字列が含まれています`);
        break;
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// フォーム用のバリデーションヘルパー
export class FormValidator {
  private errors: Record<string, string[]> = {};

  addError(fieldName: string, error: string): void {
    if (!this.errors[fieldName]) {
      this.errors[fieldName] = [];
    }
    this.errors[fieldName].push(error);
  }

  addValidationResult(fieldName: string, result: ValidationResult): void {
    if (!result.isValid) {
      this.errors[fieldName] = [...(this.errors[fieldName] || []), ...result.errors];
    }
  }

  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  getErrors(): Record<string, string[]> {
    return this.errors;
  }

  getFirstError(fieldName: string): string | undefined {
    return this.errors[fieldName]?.[0];
  }

  getAllErrors(): string[] {
    return Object.values(this.errors).flat();
  }

  clear(): void {
    this.errors = {};
  }
}
