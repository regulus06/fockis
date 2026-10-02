export function requiredPrompt(prompt: string): string | undefined {
  if (!prompt.trim()) return "Enter a prompt first.";
  if (prompt.trim().length < 3) return "Your prompt is too short.";
  return undefined;
}

export function clampDuration(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
