const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Username must contain 3-32 lowercase characters: a-z, 0-9, ., _, or -.");
  }

  return username;
}

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}




