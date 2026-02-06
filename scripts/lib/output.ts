/**
 * Shared CLI output helpers for QuickBooks skill
 */

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function output(result: CommandResult): void {
  console.log(JSON.stringify(result, null, 2));
}

export function fail(error: string): never {
  output({ success: false, error });
  process.exit(1);
}

/**
 * Parse CLI arguments into flags and positional args
 */
export function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, ...valueParts] = arg.slice(2).split("=");
      flags[key] = valueParts.join("=") || "true";
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}
