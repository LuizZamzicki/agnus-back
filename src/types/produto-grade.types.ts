export type ProdutoGradeBody = {
  id_produto?: number | string | null;
  nome?: string | null;
  acrescimo?: number | string | null;
};

export type ProdutoGradeRouteParams = {
  id?: string;
  id_produto?: string;
};

export type ProdutoGradeUpdateData = {
  id_produto: number;
  nome: string;
  acrescimo: number | string | null;
};
