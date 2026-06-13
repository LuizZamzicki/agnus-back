const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const stripDigits = (value: string) => value.replace(/\D/g, "");

const hasRepeatedDigits = (digits: string) => /^(\d)\1{10}$/.test(digits);

const calculateCpfDigit = (digits: string, weight: number) => {
  const total = digits
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (weight - index), 0);
  const remainder = (total * 10) % 11;

  return remainder === 10 ? 0 : remainder;
};

export const isValidEmail = (email: string) => {
  return EMAIL_REGEX.test(email);
};

export const isValidCpf = (cpf: string) => {
  const digits = stripDigits(cpf);
  const baseDigits = digits.slice(0, 9);

  if (digits.length !== 11 || hasRepeatedDigits(digits)) {
    return false;
  }

  const firstDigit = calculateCpfDigit(baseDigits, 10);
  const secondDigit = calculateCpfDigit(`${baseDigits}${firstDigit}`, 11);

  return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]);
};
