const DB_NAME = 'jianghu_image_store';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const objectUrlCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开图片存储数据库'));
  });
  return dbPromise;
}

export async function saveImageBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('图片保存失败'));
  });
}

export async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`图片获取失败：${res.status}`);
  return await res.blob();
}

export async function saveImageFromUrl(key: string, url: string): Promise<void> {
  const blob = await fetchImageBlob(url);
  // 过大的原图容易导致 IndexedDB 与渲染压力暴涨，超过 18MB 时直接拒绝缓存，交由运行时 URL 使用。
  if (blob.size > 18 * 1024 * 1024) {
    throw new Error('生成图片过大（超过18MB），已阻止写入本地缓存以避免页面崩溃。请降低分辨率、步数或改用更轻流程。');
  }
  await saveImageBlob(key, blob);
}

export async function loadImageBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as Blob) || null);
    request.onerror = () => reject(request.error || new Error('图片读取失败'));
  });
}

export async function getImageObjectUrl(key: string): Promise<string | null> {
  if (objectUrlCache.has(key)) return objectUrlCache.get(key)!;
  const blob = await loadImageBlob(key);
  if (!blob) return null;
  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(key, objectUrl);
  return objectUrl;
}

export function revokeImageObjectUrl(key: string) {
  const url = objectUrlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(key);
  }
}

export async function deleteImage(key: string): Promise<void> {
  revokeImageObjectUrl(key);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('图片删除失败'));
  });
}

export async function listImageKeys(): Promise<string[]> {
  const db = await openDB();
  return await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => resolve((request.result as string[]) || []);
    request.onerror = () => reject(request.error || new Error('图片索引读取失败'));
  });
}
