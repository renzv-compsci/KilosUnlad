export async function calculateSha256(file: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Secure photo hashing requires HTTPS or localhost.');
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function validateEvidencePhoto(file: Blob): Promise<void> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose a non-empty photo up to 10 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (offset: number, values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  const valid = file.type === 'image/jpeg' ? matches(0, [255, 216, 255])
    : file.type === 'image/png' ? matches(0, [137, 80, 78, 71, 13, 10, 26, 10])
    : file.type === 'image/webp' && matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]);
  if (!valid) throw new Error('Choose a JPEG, PNG or WebP photo. The file contents must match its image type.');
}

export function readPhotoAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected photo.'));
    reader.onabort = () => reject(new Error('Photo reading was cancelled. Please try again.'));
    reader.readAsDataURL(file);
  });
}
