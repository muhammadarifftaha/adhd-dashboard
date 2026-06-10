/**
 * Derive avatar initials (max 2 characters, uppercased) from a user's name,
 * falling back to their username when a name is not available.
 *
 *   "Ada Lovelace"       -> "AL"   (first letter of first + last word)
 *   "Grace B. Hopper"    -> "GH"   (middle tokens ignored)
 *   "Madonna"            -> "MA"   (single token -> first two letters)
 *   name "" / username "ada_byron" -> "AB"  (separators split the username)
 *   nothing usable       -> ""     (caller decides on a placeholder)
 *
 * Tokens are split on whitespace and common username separators (`. _ -`) so a
 * username like "ada_byron" yields "AB" rather than "AD".
 */
export function generateInitials(
  name?: string | null,
  username?: string | null,
): string {
  const source = name?.trim() || username?.trim() || "";
  const tokens = source.split(/[\s._-]+/).filter(Boolean);

  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
}
