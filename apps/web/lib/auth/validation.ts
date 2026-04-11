interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRegisterInput(body: {
  username?: string;
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Username: 3-30 chars, alphanumeric + underscore
  if (!body.username || body.username.length < 3 || body.username.length > 30) {
    errors.push('Username must be 3-30 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Email: basic format check
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Invalid email address');
  }

  // Password: min 8 chars, at least one letter and one number
  if (!body.password || body.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!/[a-zA-Z]/.test(body.password) || !/[0-9]/.test(body.password)) {
    errors.push('Password must contain at least one letter and one number');
  }

  return { valid: errors.length === 0, errors };
}
