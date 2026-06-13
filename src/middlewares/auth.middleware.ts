import { NextFunction, Request, Response } from "express";
import Usuarios from "../models/Usuarios";
import AuthService from "../services/auth.service";
import type { AuthUserPayload } from "../types/auth.types";
import type { UserRole } from "../types/user.types";

export type AuthenticatedResponseLocals = {
  authUser?: AuthUserPayload;
};

type AuthResponse = Response<object, AuthenticatedResponseLocals>;

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
};

const buildAuthUser = async (id_usuario: number): Promise<AuthUserPayload | null> => {
  const user = await Usuarios.findByPk(id_usuario);

  if (!user) {
    return null;
  }

  return {
    id_usuario: user.id_usuario,
    email: user.email,
    tipo: user.tipo,
  };
};

const isCurrentToken = (tokenPayload: AuthUserPayload, authUser: AuthUserPayload) => {
  return authUser.email === tokenPayload.email && authUser.tipo === tokenPayload.tipo;
};

const authenticateToken = async (req: Request, res: AuthResponse, next: NextFunction) => {
  const token = getBearerToken(req);
  const tokenPayload = token ? AuthService.verifyToken(token) : null;

  if (!token) {
    return res.status(401).json({ message: "Token nao informado." });
  }

  if (!tokenPayload) {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }

  const authUser = await buildAuthUser(tokenPayload.id_usuario);

  if (!authUser) {
    return res.status(401).json({ message: "Usuario do token nao existe mais." });
  }

  if (!isCurrentToken(tokenPayload, authUser)) {
    return res.status(401).json({ message: "Token desatualizado. Faca login novamente." });
  }

  res.locals.authUser = authUser;
  return next();
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => (req: Request, res: AuthResponse, next: NextFunction) => {
  const authUser = res.locals.authUser;

  if (!authUser) {
    return res.status(401).json({ message: "Nao autenticado." });
  }

  if (!allowedRoles.includes(authUser.tipo)) {
    return res.status(403).json({ message: "Sem permissao para este recurso." });
  }

  return next();
};

export const authorizeSelfOrAdmin = (paramName = "id") => (req: Request, res: AuthResponse, next: NextFunction) => {
  const authUser = res.locals.authUser;

  if (!authUser) {
    return res.status(401).json({ message: "Nao autenticado." });
  }

  if (authUser.tipo === "administrador") {
    return next();
  }

  const requestedUserId = Number(req.params[paramName]);

  if (!Number.isInteger(requestedUserId)) {
    return res.status(400).json({ message: "ID de usuario invalido." });
  }

  if (requestedUserId !== authUser.id_usuario) {
    return res.status(403).json({ message: "Voce so pode acessar o proprio usuario." });
  }

  return next();
};

export default authenticateToken;
