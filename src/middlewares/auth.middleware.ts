import { NextFunction, Request, Response } from "express";
import User from "../models/Usuarios";
import AuthService, { AuthUserPayload } from "../services/auth.service";

export type AuthenticatedResponseLocals = {
  authUser?: AuthUserPayload;
};

type UserRole = AuthUserPayload["tipo"];

const authenticateToken = async (
  req: Request,
  res: Response<any, AuthenticatedResponseLocals>,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não informado." });
  }

  const token = authHeader.split(" ")[1];
  const tokenPayload = AuthService.verifyToken(token);
  if (!tokenPayload) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }

  const user = await User.findByPk(tokenPayload.id_usuario);
  if (!user) {
    return res.status(401).json({ message: "Usuário do token não existe mais." });
  }

  const authUser: AuthUserPayload = {
    id_usuario: Number(user.get("id_usuario")),
    email: String(user.get("email")),
    tipo: user.get("tipo") as UserRole,
  };

  if (authUser.email !== tokenPayload.email || authUser.tipo !== tokenPayload.tipo) {
    return res.status(401).json({ message: "Token desatualizado. Faca login novamente." });
  }

  res.locals.authUser = authUser;
  return next();
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => (
  req: Request,
  res: Response<any, AuthenticatedResponseLocals>,
  next: NextFunction,
) => {
  const authUser = res.locals.authUser;
  if (!authUser) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  if (!allowedRoles.includes(authUser.tipo)) {
    return res.status(403).json({ message: "Sem permissão para este recurso." });
  }

  return next();
};

export const authorizeSelfOrAdmin = (paramName = "id") => (
  req: Request,
  res: Response<any, AuthenticatedResponseLocals>,
  next: NextFunction,
) => {
  const authUser = res.locals.authUser;
  if (!authUser) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  if (authUser.tipo === "administrador") {
    return next();
  }

  const requestedUserId = Number(req.params[paramName]);
  if (!Number.isInteger(requestedUserId)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  if (requestedUserId !== authUser.id_usuario) {
    return res.status(403).json({ message: "Você só pode acessar o próprio usuário." });
  }

  return next();
};

export default authenticateToken;
