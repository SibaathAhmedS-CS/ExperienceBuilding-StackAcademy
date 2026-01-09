/**
 * Extract valid HTML attributes from Contentstack Live Preview $ object
 * Filters out non-HTML attributes and only returns valid data-* attributes
 */
export function getLivePreviewAttributes($: any): Record<string, string> | undefined {
  if (!$) return undefined;
  
  const validAttributes: Record<string, string> = {};
  
  // Only include properties that are valid HTML data attributes (start with 'data-')
  // or are valid React HTML attributes
  Object.keys($).forEach((key) => {
    // Include data-* attributes (valid HTML data attributes)
    if (key.startsWith('data-')) {
      validAttributes[key] = $[key];
    }
  });
  
  // Return undefined if no valid attributes found (to avoid spreading empty object)
  return Object.keys(validAttributes).length > 0 ? validAttributes : undefined;
}
