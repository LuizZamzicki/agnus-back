export type PedidoStatus =
  | "aguardando_calculo_frete"
  | "aguardando_pagamento"
  | "pago"
  | "enviado"
  | "entregue"
  | "cancelado";

export type PedidoBody = {
  id_usuario?: number | string | null;
  id_usuario_endereco?: number | string | null;
  status?: PedidoStatus | string | null;
  valor_total?: number | string | null;
  valor_frete?: number | string | null;
};

export type PedidoRouteParams = {
  id?: string;
};

export type PedidoQuery = {
  id_usuario?: string;
  status?: string;
};

export type PedidoUpdateData = {
  id_usuario: number;
  id_usuario_endereco: number;
  status: PedidoStatus;
  valor_total: number | string | null;
  valor_frete: number | string | null;
};
