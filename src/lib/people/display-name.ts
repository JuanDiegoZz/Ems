export function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");
}
