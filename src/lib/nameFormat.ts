/** Capitalize the first letter of each name segment without rewriting the rest. */
export function capitalizeInitials(value: string | null | undefined) {
  return (value ?? "").trim().replace(/(^|[\s'’-])(\p{L})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("en-IN")}`);
}
