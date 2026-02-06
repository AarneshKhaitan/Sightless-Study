/**
 * Converts raw math notation into natural speech text.
 * e.g. "exp(z_i) / sum_j exp(z_j)" → "e to the power of z sub i divided by sum over j of e to the power of z sub j"
 */

const replacements: [RegExp, string][] = [
  // Functions / keywords
  [/\bexp\(/g, "e to the power of ("],
  [/\bsoftmax\(/g, "softmax of ("],
  [/\bsum_(\w+)/g, "sum over $1 of"],
  [/\bsum\(/g, "sum of ("],
  [/\blog\(/g, "log of ("],
  [/\bln\(/g, "natural log of ("],
  [/\bsqrt\(/g, "square root of ("],
  [/\babs\(/g, "absolute value of ("],
  [/\bsin\(/g, "sine of ("],
  [/\bcos\(/g, "cosine of ("],
  [/\btan\(/g, "tangent of ("],

  // Operators
  [/\s*\/\s*/g, " divided by "],
  [/\s*\*\s*/g, " times "],
  [/\s*\+\s*/g, " plus "],
  [/\s*-\s*/g, " minus "],
  [/\s*=\s*/g, " equals "],

  // Exponents
  [/\^2\b/g, " squared"],
  [/\^3\b/g, " cubed"],
  [/\^(\w+)/g, " to the power of $1"],
  [/\^\(([^)]+)\)/g, " to the power of $1"],

  // Subscripts
  [/_(\w)\b/g, " sub $1"],
  [/_\{([^}]+)\}/g, " sub $1"],
];

export function formulaToSpeech(expression: string): string {
  let result = expression;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  // Clean up extra whitespace
  return result.replace(/\s+/g, " ").trim();
}
