export type ProdutoFotoUpload = {
  upload_index: number;
  cor_index?: number;
  nome_original: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number;
  arquivo_base64: string;
};

export type ProdutoFotoPathInput = {
  caminho_url?: string | null;
  caminhoUrl?: string | null;
};

export type ProdutoFotoSourceInput =
  | string
  | Express.Multer.File
  | ProdutoFotoUpload
  | ProdutoFotoPathInput
  | null
  | undefined;

export type ProdutoFotoBody = {
  id_produto?: number | string | null;
  id_produto_cor?: number | string | null;
  caminho_url?: ProdutoFotoSourceInput;
  caminhoUrl?: ProdutoFotoSourceInput;
};

export type ProdutoFotoRouteParams = {
  id?: string;
  id_produto?: string;
};

export type ProdutoFotoUpdateData = {
  id_produto: number;
  id_produto_cor: number;
  caminho_url: string;
};

export type ProdutoFotoFiles = Express.Multer.File[] | Record<string, Express.Multer.File[]>;
