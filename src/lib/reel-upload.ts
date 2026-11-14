import 'server-only';

// Match nginx client_max_body_size 10m.
export const MAX_REEL_BYTES = 10 * 1024 * 1024;
const BRANDS = new Set(['mp4 ', 'isom', 'qt  ', 'mp42', 'avc1']);
export class ReelUploadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Signatures do not prove H.264 or 9:16.
export async function readReelUpload(request: Request) {
  const invalid = () => new ReelUploadError(415, 'Expected MP4 or MOV');
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REEL_BYTES) {
        await reader.cancel();
        throw new ReelUploadError(413, 'Video exceeds 10 MiB');
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const buffer = Buffer.concat(chunks, size);
  if (size < 16 || buffer.toString('latin1', 4, 8) !== 'ftyp') throw invalid();
  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > size || (boxSize - 16) % 4) throw invalid();
  const major = buffer.toString('latin1', 8, 12);
  // Reject unknown/image brands, including compatible brands.
  if (!BRANDS.has(major)) throw invalid();
  for (let i = 16; i < boxSize; i += 4) {
    if (!BRANDS.has(buffer.toString('latin1', i, i + 4))) throw invalid();
  }
  const mov = major === 'qt  ';
  return { buffer, extension: mov ? 'mov' : 'mp4', contentType: mov ? 'video/quicktime' : 'video/mp4' };
}
