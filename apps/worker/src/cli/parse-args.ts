export function parseDryRunLimitArgs(argv: string[]) {
  let dryRun = false;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = parseInt(argv[i + 1], 10);
      i++;
    }
  }

  return { dryRun, limit };
}
