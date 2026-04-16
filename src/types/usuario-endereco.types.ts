export type UsuarioEnderecoBody = {
  id_usuario?: number | string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  principal?: boolean | null;
  ativo?: boolean | null;
};

export type UsuarioEnderecoRouteParams = {
  id?: string;
  id_user?: string;
};

export type UsuarioEnderecoUpdateData = {
  id_usuario: number;
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  principal: boolean;
  ativo: boolean;
};
