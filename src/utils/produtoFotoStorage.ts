import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

type ParsedBinaryImage = {
  buffer: Buffer;
  extension: string;
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
};

const PHOTO_DIR = path.resolve(process.cwd(), "produto_fotos");

const sanitizeExtension = (extension: string) => {
  return extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

const extensionFromMime = (mimeType: string) => {
  return MIME_EXTENSION_MAP[mimeType.toLowerCase()] ?? "png";
};

const looksLikeRawBase64 = (value: string) => {
  const normalized = value.replace(/\s+/g, "");

  return (
    normalized.length >= 64 &&
    normalized.length % 4 === 0 &&
    /^[A-Za-z0-9+/=]+$/.test(normalized)
  );
};

const parseDataUrl = (value: string): ParsedBinaryImage | null => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const base64Data = match[2].replace(/\s+/g, "");
  const buffer = Buffer.from(base64Data, "base64");

  if (!buffer.length) {
    return null;
  }

  return {
    buffer,
    extension: extensionFromMime(mimeType),
  };
};

const parseObjectImage = (source: Record<string, unknown>): ParsedBinaryImage | null => {
  const explicitExt =
    source.extensao ??
    source.ext ??
    source.extension ??
    source.tipo_extensao ??
    source.tipoExtensao;
  const explicitMime =
    source.mimeType ??
    source.mime_type ??
    source.contentType ??
    source.content_type ??
    source.mimetype ??
    source.tipo_arquivo ??
    source.tipoArquivo;
  const rawBits =
    source.bits ??
    source.base64 ??
    source.arquivo_base64 ??
    source.arquivoBase64 ??
    source.conteudo ??
    source.content ??
    source.data ??
    source.bytes ??
    source.buffer;
  const rawStringCandidate =
    typeof rawBits === "string"
      ? rawBits
      : typeof source.caminho_url === "string"
        ? source.caminho_url
        : typeof source.caminhoUrl === "string"
          ? source.caminhoUrl
          : typeof source.caminho === "string"
            ? source.caminho
            : typeof source.url === "string"
              ? source.url
              : typeof source.src === "string"
                ? source.src
                : typeof source.link === "string"
                  ? source.link
                  : typeof source.path === "string"
                    ? source.path
                    : typeof source.preview === "string"
                      ? source.preview
                      : undefined;

  const originalName =
    typeof source.originalname === "string"
      ? source.originalname
      : typeof source.nome_original === "string"
        ? source.nome_original
        : typeof source.nomeOriginal === "string"
          ? source.nomeOriginal
          : typeof source.filename === "string"
            ? source.filename
            : typeof source.fileName === "string"
              ? source.fileName
              : typeof source.nome_arquivo === "string"
                ? source.nome_arquivo
                : typeof source.nomeArquivo === "string"
                  ? source.nomeArquivo
                  : "";
  const fileNameExt = originalName.includes(".") ? originalName.split(".").pop() : "";

  if (Buffer.isBuffer(rawBits)) {
    if (!rawBits.length) {
      return null;
    }

    const extension =
      typeof explicitExt === "string" && explicitExt.trim()
        ? sanitizeExtension(explicitExt)
        : typeof explicitMime === "string"
          ? extensionFromMime(explicitMime)
          : typeof fileNameExt === "string" && fileNameExt.trim()
            ? sanitizeExtension(fileNameExt)
            : "png";

    return { buffer: rawBits, extension: extension || "png" };
  }

  if (Array.isArray(rawBits)) {
    const numericArray = rawBits.every((item) => Number.isInteger(item));
    if (!numericArray) {
      return null;
    }

    const buffer = Buffer.from(rawBits as number[]);
    if (!buffer.length) {
      return null;
    }

    const extension =
      typeof explicitExt === "string" && explicitExt.trim()
        ? sanitizeExtension(explicitExt)
        : typeof explicitMime === "string"
          ? extensionFromMime(explicitMime)
          : typeof fileNameExt === "string" && fileNameExt.trim()
          ? sanitizeExtension(fileNameExt)
          : "png";

    return { buffer, extension: extension || "png" };
  }

  if (typeof rawStringCandidate !== "string") {
    return null;
  }

  const dataUrlParsed = parseDataUrl(rawStringCandidate.trim());
  if (dataUrlParsed) {
    return dataUrlParsed;
  }

  const normalizedBase64 = rawStringCandidate.replace(/\s+/g, "");
  if (!looksLikeRawBase64(normalizedBase64)) {
    return null;
  }

  const buffer = Buffer.from(normalizedBase64, "base64");
  if (!buffer.length) {
    return null;
  }

  const extension =
    typeof explicitExt === "string" && explicitExt.trim()
      ? sanitizeExtension(explicitExt)
      : typeof explicitMime === "string"
        ? extensionFromMime(explicitMime)
        : typeof fileNameExt === "string" && fileNameExt.trim()
          ? sanitizeExtension(fileNameExt)
        : "png";

  return { buffer, extension: extension || "png" };
};

const parseImageBitsInput = (input: unknown): ParsedBinaryImage | null => {
  if (typeof input === "string") {
    const value = input.trim();
    if (!value) {
      return null;
    }

    const dataUrlParsed = parseDataUrl(value);
    if (dataUrlParsed) {
      return dataUrlParsed;
    }

    if (!looksLikeRawBase64(value)) {
      return null;
    }

    const buffer = Buffer.from(value.replace(/\s+/g, ""), "base64");
    if (!buffer.length) {
      return null;
    }

    return {
      buffer,
      extension: "png",
    };
  }

  if (input && typeof input === "object") {
    return parseObjectImage(input as Record<string, unknown>);
  }

  return null;
};

export const saveProdutoFotoBits = async (input: unknown): Promise<string | null> => {
  const parsed = parseImageBitsInput(input);
  if (!parsed) {
    return null;
  }

  const extension = sanitizeExtension(parsed.extension) || "png";
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;

  await fs.mkdir(PHOTO_DIR, { recursive: true });
  await fs.writeFile(path.join(PHOTO_DIR, fileName), parsed.buffer);

  return `produto_fotos/${fileName}`;
};
