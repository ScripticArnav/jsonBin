export function getByPath(obj, path) {
  if (!path) return undefined;
  return String(path)
    .split(".")
    .reduce((o, key) => (o == null ? undefined : o[key]), obj);
}

export function setByPath(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}
