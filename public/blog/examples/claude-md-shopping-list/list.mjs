export function addItem(items, name) {
  const trimmed = name.trim();
  return trimmed ? [...items, trimmed] : [...items];
}
