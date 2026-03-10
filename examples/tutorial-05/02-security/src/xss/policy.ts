/**
 * Content Security Policy
 * Manages CSP headers and policies
 */

export interface CSPConfig {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
}

export class ContentSecurityPolicy {
  private config: CSPConfig;

  constructor(config: CSPConfig = {}) {
    this.config = {
      'default-src': config['default-src'] || ["'self'"],
      'script-src': config['script-src'] || ["'self'", "'unsafe-inline'"],
      'style-src': config['style-src'] || ["'self'", "'unsafe-inline'"],
      'img-src': config['img-src'] || ["'self'", 'data:', 'https:'],
      'connect-src': config['connect-src'] || ["'self'"],
      'font-src': config['font-src'] || ["'self'"],
      'object-src': config['object-src'] || ["'none'"],
      'base-uri': config['base-uri'] || ["'self'"],
      'form-action': config['form-action'] || ["'self'"]
    };
  }

  /**
   * Generate CSP header value
   */
  generateHeader(): string {
    const directives: string[] = [];

    for (const [directive, sources] of Object.entries(this.config)) {
      if (sources && sources.length > 0) {
        directives.push(`${directive} ${sources.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Get meta tag for HTML
   */
  getMetaTag(): string {
    return `<meta http-equiv="Content-Security-Policy" content="${this.generateHeader()}">`;
  }
}
