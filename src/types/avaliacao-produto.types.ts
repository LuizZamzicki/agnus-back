export type AvaliacaoProdutoBody = {
  id_produto?: number | string | null;
  id_usuario?: number | string | null;
  titulo?: string | null;
  nome?: string | null;
  comentario?: string | null;
  nota?: number | string | null;
};

export type AvaliacaoProdutoRouteParams = {
  id?: string;
  id_produto?: string;
};

export type AvaliacaoProdutoNotaValue = number | null | "invalid" | undefined;

export type AvaliacaoProdutoCreateData = {
  id_produto: number;
  id_usuario: number;
  titulo: string | null;
  comentario: string | null;
  nota: number | null;
};

export type AvaliacaoProdutoUpdateData = AvaliacaoProdutoCreateData;
