/**
 * Input Sanitizer
 * Sanitizes user input to prevent XSS and injection attacks
 */

export interface SanitizationOptions {
  removeHTML?: boolean;
  escapeHTML?: boolean;
  normalizeWhitespace?: boolean;
  maxLength?: number;
}

export class InputSanitizer {
  /**
   * Sanitize string input
   */
  sanitize(input: string, options: SanitizationOptions = {}): string {
    let result = input;

    // Remove HTML tags
    if (options.removeHTML !== false) {
      result = this.removeHTMLTags(result);
    }

    // Escape HTML entities
    if (options.escapeHTML !== false) {
      result = this.escapeHTML(result);
    }

    // Normalize whitespace
    if (options.normalizeWhitespace !== false) {
      result = this.normalizeWhitespace(result);
    }

    // Truncate to max length
    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength);
    }

    return result;
  }

  /**
   * Remove HTML tags
   */
  private removeHTMLTags(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Escape HTML entities
   */
  private escapeHTML(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'/]/g, char => htmlEntities[char]);
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize object
   */
  sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
    if (typeof obj === 'string') {
      return this.sanitize(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeObject(obj[key], options);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize SQL-like input
   */
  sanitizeSQL(input: string): string {
    // Remove dangerous SQL keywords
    const dangerousKeywords = [
      'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE',
      'EXEC', 'EXECUTE', 'SCRIPT', 'JAVASCRIPT'
    ];

    let result = input.toUpperCase();
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(keyword, 'gi');
      result = result.replace(regex, '');
    }

    return result;
  }

  /**
   * Sanitize file path
   */
  sanitizePath(input: string): string {
    // Remove directory traversal attempts
    return input.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  }

  /**
   * Sanitize URL
   */
  sanitizeURL(input: string): string {
    // Remove javascript: and data: protocols
    return input.replace(/^(javascript|data|vbscript):/i, '');
  }
}
