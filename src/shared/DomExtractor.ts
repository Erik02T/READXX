import DOMPurify from 'dompurify'

/**
 * ✓ SAFE: strip all HTML, keep plain text only
 * Never render extracted DOM content with innerHTML or dangerouslySetInnerHTML
 */
export const sanitizeExtracted = (raw: string): string => {
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [],       // zero tags — text nodes only
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * ✓ SAFE: strip tracking/auth params from URLs before storing
 * Prevents credential leakage in history
 */
const SENSITIVE_PARAMS = [
  'access_token',
  'token',
  'api_key',
  'session',
  'auth',
  'refresh_token',
  'apikey',
  'X-CSRF-Token',
]

export const sanitizeUrl = (url: string): string => {
  try {
    const u = new URL(url)
    // Remove all sensitive query parameters
    SENSITIVE_PARAMS.forEach(param => u.searchParams.delete(param))
    // Return only origin + pathname (drop all query params for history storage)
    return u.origin + u.pathname
  } catch {
    return ''
  }
}

/**
 * ✓ SAFE: extract text from DOM with XSS protection
 * Uses only text content, never innerHTML
 */
export const extractTextSafe = (element: Element): string => {
  if (!element) return ''

  // Get text content only (no HTML)
  const text = element.innerText || element.textContent || ''

  // Sanitize the extracted text
  return sanitizeExtracted(text)
}

/**
 * ✓ SAFE: postMessage origin verification
 * Always verify sender before processing message data
 */
export const verifyMessageOrigin = (
  event: MessageEvent,
  allowedOrigin: string
): boolean => {
  if (event.origin !== allowedOrigin) {
    console.warn('Message from untrusted origin:', event.origin)
    return false
  }
  return true
}

/**
 * ✓ SAFE: validate chrome extension origin
 * Use only with chrome-extension:// protocol
 */
export const isExtensionOrigin = (origin: string): boolean => {
  return origin.startsWith('chrome-extension://')
}

/**
 * Maximum recursion depth for shadow root traversal
 */
const MAX_SHADOW_ROOT_DEPTH = 10

/**
 * ✓ SAFE: traverse shadow DOM with depth limit to prevent DoS
 */
export const getTextFromShadowDom = (
  element: Element,
  depth = 0
): string => {
  if (depth > MAX_SHADOW_ROOT_DEPTH) {
    console.warn('Max shadow DOM depth exceeded')
    return ''
  }

  let text = element.textContent || ''

  // Check for shadow roots
  if (element.shadowRoot) {
    const shadowText = Array.from(element.shadowRoot.children)
      .map(child => getTextFromShadowDom(child, depth + 1))
      .join(' ')
    text += ' ' + shadowText
  }

  return text
}

/**
 * ✓ SAFE: clean extracted text for storage
 * Remove excessive whitespace, normalize line breaks
 */
export const normalizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/\n\n+/g, '\n\n') // collapse multiple newlines
    .slice(0, 50_000) // cap at 50k chars for sanity
}

/**
 * ✓ SAFE: extract article content from page
 * Uses text extraction only, never HTML injection
 */
export const extractArticleContent = async (
  url: string
): Promise<{ title: string; content: string; cleanUrl: string }> => {
  try {
    // Get page title
    const title = document.title || ''

    // Extract and sanitize content
    const body = document.body
    let content = extractTextSafe(body)
    content = normalizeText(content)

    // Clean URL for storage
    const cleanUrl = sanitizeUrl(url)

    return { title, content, cleanUrl }
  } catch (error) {
    console.error('Error extracting article content:', error)
    return { title: '', content: '', cleanUrl: '' }
  }
}

/**
 * ✓ SAFE: validate selection contains safe content
 * Before sending to server, ensure no sensitive data
 */
export const isSelectionSafe = (text: string): boolean => {
  if (text.length === 0) return false
  if (text.length > 10_000) return false

  // Check for common credential patterns (very basic heuristic)
  const hasCredentialPattern =
    /password|token|secret|credential|apikey|api_key/i.test(text)

  if (hasCredentialPattern) {
    console.warn('Selection may contain sensitive data')
    return false
  }

  return true
}
