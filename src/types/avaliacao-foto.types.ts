export type AvaliacaoFotoUpload = {
  upload_index: number;
  nome_original: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number;
  arquivo_base64: string;
};

export type AvaliacaoFotoBody = {
  id_avaliacao_produto?: number | string;
  fotos_upload?: AvaliacaoFotoUpload[];
  foto_upload?: AvaliacaoFotoUpload;
  caminho_url?: string;
};

export type AvaliacaoFotoRouteParams = {
  id?: string;
  id_review?: string;
};

export type ParsedBinaryImage = {
  buffer: Buffer;
  extension: string;
};
