export type PedidoItemBody = {
  id_pedido?: number | string | null;
  id_produto_cor?: number | string | null;
  id_produto_grade?: number | string | null;
  quantidade?: number | string | null;
};

export type PedidoItemRouteParams = {
  id?: string;
  id_order?: string;
};

export type PedidoItemSelection = {
  colorId: number;
  gradeId: number;
};

export type PedidoItemPricing = {
  preco_unitario: number;
  subtotal: number;
};

export type PedidoItemMutationData = {
  id_pedido: number;
  id_produto_cor: number;
  id_produto_grade: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

export type PedidoItemControllerError = {
  message: string;
  status: number;
};
