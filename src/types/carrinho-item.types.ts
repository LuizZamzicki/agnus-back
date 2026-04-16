export type CarrinhoItemBody = {
  id_carrinho?: number | string | null;
  id_produto_cor?: number | string | null;
  id_produto_grade?: number | string | null;
  quantidade?: number | string | null;
};

export type CarrinhoItemRouteParams = {
  id?: string;
  id_cart?: string;
};

export type CarrinhoItemSelection = {
  colorId: number;
  gradeId: number;
};

export type CarrinhoItemMutationData = {
  id_carrinho: number;
  id_produto_cor: number;
  id_produto_grade: number;
  quantidade: number;
  preco_unitario: number;
};

export type CarrinhoItemControllerError = {
  message: string;
  status: number;
};
