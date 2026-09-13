export function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new Error("Password must have at least 6 characters");
  }
}




