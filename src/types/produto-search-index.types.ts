export type ProdutoSearchDocument = {
  id_produto: number;
  id_categoria: number | null;
  sem_categoria: boolean;
  nome: string;
  descricao: string;
  preco_base: number;
  ativo: boolean;
  categoria_nome: string | null;
  quantidade_vendida: number;
  imagens: string[];
};

export type ProdutoSearchFilterInput = {
  idCategoria?: string;
  ativo?: string;
  onlyWithSales?: boolean;
};

export type ProdutoSearchRequest = ProdutoSearchFilterInput & {
  query: string;
  page: number;
  limit: number;
  sort?: string[];
};

export type ProdutoSearchQueryRow = {
  id_produto: number | string;
  id_categoria: number | string | null;
  nome: string | null;
  descricao: string | null;
  preco_base: number | string | null;
  ativo: boolean | number | null;
  categoria_nome: string | null;
  quantidade_vendida: number | string | null;
  imagens_json: string | null;
};

export type ProdutoSearchResult = {
  data: ProdutoSearchDocument[];
  total: number;
};
