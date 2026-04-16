export type UsuarioContatoTipo = "telefone" | "celular" | "email" | "outro";

export type UsuarioContatoBody = {
  id_usuario?: number | string | null;
  tipo?: UsuarioContatoTipo | string | null;
  valor?: string | null;
  principal?: boolean | null;
};

export type UsuarioContatoRouteParams = {
  id?: string;
  id_user?: string;
};

export type UsuarioContatoUpdateData = {
  id_usuario: number;
  tipo: UsuarioContatoTipo;
  valor: string;
  principal: boolean;
};
