import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  AvaliacaoFotoUpload,
  ParsedBinaryImage,
} from "../types/avaliacao-foto.types";

const PHOTO_DIR = path.resolve(process.cwd(), "avaliacao_fotos");
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
};

const sanitizeExtension = (extension: string) => {
  return extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

const getOriginalExtension = (fileName: string) => {
  return fileName.includes(".")
    ? sanitizeExtension(fileName.split(".").pop() ?? "")
    : "";
};

const getMimeExtension = (mimeType: string | null) => {
  return mimeType ? MIME_EXTENSION_MAP[mimeType.toLowerCase()] ?? "png" : "png";
};

const getUploadExtension = (upload: AvaliacaoFotoUpload) => {
  const originalExtension = getOriginalExtension(upload.nome_original);
  return originalExtension || getMimeExtension(upload.tipo_arquivo);
};

const getBase64Content = (base64Value: string) => {
  const match = base64Value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  return match
    ? { mimeType: match[1], content: match[2].replace(/\s+/g, "") }
    : { mimeType: null, content: base64Value.replace(/\s+/g, "") };
};

const buildImageBuffer = (content: string) => {
  const buffer = Buffer.from(content, "base64");
  return buffer.length ? buffer : null;
};

const parseUploadImage = (upload: AvaliacaoFotoUpload): ParsedBinaryImage | null => {
  const base64Data = getBase64Content(upload.arquivo_base64);
  const buffer = buildImageBuffer(base64Data.content);

  if (!buffer) {
    return null;
  }

  const extension = base64Data.mimeType
    ? getMimeExtension(base64Data.mimeType)
    : getUploadExtension(upload);

  return { buffer, extension };
};

export const normalizeFotoPath = (value: string | undefined) => {
  return value?.trim() || "";
};

export const saveAvaliacaoFotoUpload = async (upload: AvaliacaoFotoUpload): Promise<string | null> => {
  const parsedImage = parseUploadImage(upload);

  if (!parsedImage) {
    return null;
  }

  const fileName = `${Date.now()}-${randomUUID()}.${
    sanitizeExtension(parsedImage.extension) || "png"
  }`;

  await fs.mkdir(PHOTO_DIR, { recursive: true });
  await fs.writeFile(path.join(PHOTO_DIR, fileName), parsedImage.buffer);

  return `avaliacao_fotos/${fileName}`;
};
