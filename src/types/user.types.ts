export type UserRole = "cliente" | "administrador";

export type UsuarioModelData = {
  id_usuario: number;
  nome: string;
  cpf: string | null;
  email: string;
  senha: string;
  google_id: string | null;
  tipo: UserRole;
  data_criacao: Date;
  data_alteracao: Date;
};

export type UsuarioPublicData = Omit<UsuarioModelData, "senha">;

export type UsuarioBody = {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  senha?: string | null;
  tipo?: UserRole | string | null;
};

export type UsuarioPasswordBody = {
  senha_atual?: string | null;
  senhaAtual?: string | null;
  confirmacao_senha_atual?: string | null;
  confirmacaoSenhaAtual?: string | null;
  nova_senha?: string | null;
  novaSenha?: string | null;
};

export type UsuarioRouteParams = {
  id?: string;
};

export type UsuarioUpdateData = {
  nome: string;
  cpf: string | null;
  email: string;
  senha: string;
  tipo: UserRole;
};
