import DOMPurify from 'dompurify';

/**
 * Nettoie le contenu HTML pour éviter les attaques XSS
 * Garde seulement les balises sûres
 */
export function sanitizeMessage(content: string): string {
  // Configuration DOMPurify : autorise seulement certaines balises
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  return cleanContent;
}

/**
 * Nettoie et convertit les retours à la ligne en <br>
 */
export function sanitizeAndFormatMessage(content: string): string {
  const clean = sanitizeMessage(content);
  return clean.replace(/\n/g, '<br>');
}

/**
 * Sanitize plain text user content (descriptions, bios, reviews)
 * Strips all HTML — no tags allowed
 */
export function sanitizePlainText(content: string): string {
  if (!content) return content;
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
}