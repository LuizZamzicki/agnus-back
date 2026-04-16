import type { ProdutoFotoUpload } from "./produto-foto.types";
import type { PedidoStatus } from "./pedido.types";

export type ProdutoGradeInput = {
  nome?: string | null;
  acrescimo?: number | string | null;
};

export type ProdutoCorInput = {
  nome?: string | null;
  codigo_rgb?: string | null;
  tonalidade?: string | null;
  acrescimo?: number | string | null;
  fotos?: string[] | null;
  fotos_upload?: ProdutoFotoUpload[] | null;
};

export type ProdutoBody = {
  id_categoria?: number | string | null;
  nome?: string | null;
  descricao?: string | null;
  preco_custo?: number | string | null;
  preco_base?: number | string | null;
  ativo?: boolean | null;
  grades?: ProdutoGradeInput[] | null;
  cores?: ProdutoCorInput[] | null;
};

export type ProdutoRouteParams = {
  id?: string;
};

export type ProdutoQuery = {
  page?: string;
  limit?: string;
  id_categoria?: string;
  ativo?: string;
  q?: string;
  search?: string;
  busca?: string;
  descricao?: string;
};

export type ProdutoControllerError = {
  message: string;
  status?: number;
};

export type SqlReplacement = string | number | boolean | null;

export type CatalogFilters = {
  pagination: {
    page: number;
    limit: number;
    offset: number;
  };
  whereSql: string;
  replacements: Record<string, SqlReplacement>;
};

export type CatalogQueryRow = {
  id_produto: number;
  nome: string;
  preco_base: number;
  ativo: boolean;
  id_categoria: number | null;
  categoria_nome?: string | null;
  quantidade_vendida?: number | null;
  imagens_json: string;
};

export type SearchCatalogRow = {
  id_produto: number;
  id_categoria: number | null;
  nome: string;
  descricao?: string | null;
  preco_base: number;
  ativo: boolean;
  categoria_nome?: string | null;
  quantidade_vendida?: number | null;
  imagens?: string[];
  imagens_json?: string;
};

export type ProdutoIndexSearchInput = {
  query: string;
  page: number;
  limit: number;
  idCategoria?: string;
  ativo?: string;
  onlyWithSales?: boolean;
  sort?: string[];
};

export type ProdutoIndexSearchResult = {
  data: SearchCatalogRow[];
  total: number;
};

export type ProdutoCatalogResponse = {
  data: object[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type ProdutoCreateResult = {
  produto: { id_produto: number } & Record<string, boolean | number | string | null>;
  grades: ProdutoGradeRecord[];
  cores: ProdutoCorRecord[];
  fotos: ProdutoFotoRecord[];
};

export type ProdutoGradeRecord = {
  id_produto_grade: number;
  id_produto: number;
  nome: string;
  acrescimo: number | string | null;
};

export type ProdutoCorRecord = {
  id_produto_cor: number;
  id_produto: number;
  nome: string;
  codigo_rgb: string;
  acrescimo: number | string | null;
};

export type ProdutoFotoRecord = {
  id_produto_foto: number;
  id_produto: number;
  id_produto_cor: number;
  caminho_url: string;
};

export type ProdutoRemovalFilter = {
  id_produto_cor?: { [key: string]: number[] };
  id_produto_grade?: { [key: string]: number[] };
};

export type ProdutoSalesStatus = Extract<PedidoStatus, "pago" | "enviado" | "entregue">;
