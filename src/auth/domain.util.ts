/**
 * Extracts the root domain from a URL
 * Examples:
 * - https://api.example.com -> example.com
 * - https://app.example.com -> example.com
 * - http://localhost:3000 -> undefined (localhost doesn't have a root domain)
 * - https://example.com -> example.com
 *
 * @param url - The URL to extract the domain from
 * @returns The root domain (e.g., "example.com") or undefined if it's localhost/IP
 */
export function extractRootDomain(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // localhost and IP addresses don't have a root domain
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
      return undefined;
    }

    // Split hostname into parts
    const parts = hostname.split('.');

    // If we have less than 2 parts, it's not a valid domain
    if (parts.length < 2) {
      return undefined;
    }

    // For domains like "example.com" or "example.co.uk"
    // We need to handle public suffixes (TLD + 1 level)
    // Simple approach: take last 2 parts for most cases
    // For known multi-part TLDs, we'd need a library, but for now we'll use the simple approach

    // If we have exactly 2 parts (e.g., example.com), return as is
    if (parts.length === 2) {
      return hostname;
    }

    // For 3+ parts, take the last 2 parts (e.g., app.example.com -> example.com)
    // This works for most cases, but might not handle all edge cases like .co.uk
    // For production, consider using a library like psl (Public Suffix List)
    return parts.slice(-2).join('.');
  } catch {
    // Invalid URL, return undefined
    return undefined;
  }
}
