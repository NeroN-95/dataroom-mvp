export function resolveNameConflict(
  desired: string,
  existing: Set<string>,
): string {
  if (!existing.has(desired)) return desired;

  const dot = desired.lastIndexOf('.');
  const hasExt = dot > 0;
  const base = hasExt ? desired.slice(0, dot) : desired;
  const ext = hasExt ? desired.slice(dot) : '';

  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (existing.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}
