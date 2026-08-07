let n = 0;
export function createId(): string {
  n += 1;
  return `luma_${Date.now().toString(36)}_${n.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
