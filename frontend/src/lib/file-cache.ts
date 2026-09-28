const cache = new Map<string, string>();

export function setFileData(id: string, dataUrl: string) {
  cache.set(id, dataUrl);
}

export function getFileData(id: string) {
  return cache.get(id);
}

export function copyFileData(fromId: string, toId: string) {
  const data = cache.get(fromId);
  if (data) cache.set(toId, data);
}

export function removeFileData(id: string) {
  cache.delete(id);
}

export function hasFileData(id: string) {
  return cache.has(id);
}
