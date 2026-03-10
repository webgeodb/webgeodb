/**
 * XSS Cleaner
 * Protects against XSS attacks
 */

export class XSSCleaner {
  private dangerousTags = ['script', 'iframe', 'object', 'embed', 'link', 'style'];
  private dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover'];

  /**
   * Clean user input
   */
  clean(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let cleaned = input;

    // Remove dangerous tags
    cleaned = this.removeDangerousTags(cleaned);

    // Remove dangerous attributes
    cleaned = this.removeDangerousAttributes(cleaned);

    // Escape HTML entities
    cleaned = this.escapeHTML(cleaned);

    return cleaned;
  }

  /**
   * Clean HTML content
   */
  cleanHTML(html: string): string {
    return this.clean(html);
  }

  /**
   * Remove dangerous tags
   */
  private removeDangerousTags(input: string): string {
    let cleaned = input;

    for (const tag of this.dangerousTags) {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      cleaned = cleaned.replace(regex, '');
    }

    return cleaned;
  }

  /**
   * Remove dangerous attributes
   */
  private removeDangerousAttributes(input: string): string {
    let cleaned = input;

    for (const attr of this.dangerousAttributes) {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gis');
      cleaned = cleaned.replace(regex, '');
    }

    return cleaned;
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
   * Check if string contains XSS attempts
   */
  containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror/i,
      /onclick/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }
}
