import type { UsuarioModelData, UsuarioPublicData } from "./user.types";

export type AuthUserPayload = Pick<UsuarioModelData, "id_usuario" | "email" | "tipo">;

export type AuthResult = {
  user: UsuarioPublicData;
  token: string;
};
