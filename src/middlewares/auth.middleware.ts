import { NextFunction, Request, Response } from "express";
import AuthService, { AuthUserPayload } from "../services/auth.service";

export type AuthenticatedResponseLocals = {
  authUser?: AuthUserPayload;
};

const authenticateToken = (
  req: Request,
  res: Response<any, AuthenticatedResponseLocals>,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não informado." });
  }

  const token = authHeader.split(" ")[1];
  const authUser = AuthService.verifyToken(token);
  if (!authUser) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }

  res.locals.authUser = authUser;
  next();
};

export default authenticateToken;
