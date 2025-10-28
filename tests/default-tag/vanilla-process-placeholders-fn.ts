/**
 * Processes placeholders in a translation string.
 * If the input `translation` is not a string, it returns an empty string.
 * Otherwise, it replaces placeholders in the format `{{placeholder}}` with values from `params`.
 * If a placeholder is not found in `params`, it's replaced with an empty string.
 * @param translation The translation value to process. Can be of any type.
 * @param params Optional interpolation parameters.
 * @returns The processed string, or an empty string if the input was not a string.
 */
export function processPlaceholders(
  translation: any,
  params?: { [key: string]: any | number }
): string {
  if (typeof translation !== 'string') {
    // As a safeguard, return an empty string if the input is not a string.
    return '';
  }
  return translation.replace(/{{(.*?)}}/g, (_: any, placeholder: string) => {
    const trimmedPlaceholder = placeholder.trim();
    return params?.[trimmedPlaceholder] !== undefined
      ? String(params[trimmedPlaceholder])
      : '';
  });
}
