export type ProdutoCorBody = {
  id_produto?: number | string | null;
  nome?: string | null;
  codigo_rgb?: string | null;
  tonalidade?: string | null;
  acrescimo?: number | string | null;
};

export type ProdutoCorRouteParams = {
  id?: string;
  id_produto?: string;
};

export type ProdutoCorUpdateData = {
  id_produto: number;
  nome: string;
  codigo_rgb: string;
  acrescimo: number | string | null;
};
