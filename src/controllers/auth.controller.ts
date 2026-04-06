import { Request, Response } from "express";
import { AuthenticatedResponseLocals } from "../middlewares/auth.middleware";
import User from "../models/Usuarios";
import AuthService from "../services/auth.service";
import UsuarioSenhasHistoricoController from "./usuarioSenhasHistorico.controller";

class AuthController {
  private static getFrontendUrl() {
    return process.env.FRONTEND_URL || "http://localhost:3001";
  }

  private static buildLoginSuccessRedirect(token: string, tipo: string) {
    const params = new URLSearchParams({ token, tipo, success: "1" });
    return `${AuthController.getFrontendUrl()}/login?${params.toString()}`;
  }

  private static buildLoginErrorRedirect(message: string) {
    return `${AuthController.getFrontendUrl()}/login?error=${encodeURIComponent(message)}`;
  }

  private static formatElapsedTime(date: Date) {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (minutes < 1) return "agora mesmo";
    if (minutes < 60) return `ha ${minutes} minuto${minutes > 1 ? "s" : ""}`;
    if (hours < 24) return `ha ${hours} hora${hours > 1 ? "s" : ""}`;
    return `ha ${days} dia${days > 1 ? "s" : ""}`;
  }

  private static formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  }

  static async login(req: Request, res: Response) {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ message: "Email e senha sao obrigatorios." });
    }

    const authResult = await AuthService.authenticate(email, senha);
    if (!authResult) {
      const senhaJaUsada = await UsuarioSenhasHistoricoController.findByPasswordHash(email, senha);
      if (senhaJaUsada != null) {
        const elapsedTime = AuthController.formatElapsedTime(senhaJaUsada);
        const dataFormatada = AuthController.formatDateTime(senhaJaUsada);
        return res.status(401).json({
          message: `Essa senha ja foi usada ${elapsedTime} (em ${dataFormatada}).`,
        });
      }

      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    return res.status(200).json(authResult);
  }

  static async me(req: Request, res: Response<any, AuthenticatedResponseLocals>) {
    const authUser = res.locals.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Nao autenticado." });
    }

    const user = await User.findByPk(authUser.id_usuario);
    if (!user) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    return res.status(200).json({ user: AuthService.sanitizeUser(user) });
  }

  static async googleStart(req: Request, res: Response) {
    try {
      const authUrl = AuthService.buildGoogleAuthorizationUrl();
      return res.redirect(authUrl);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao iniciar login com Google.",
      });
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;
      if (error) {
        const message = `Google OAuth retornou erro: ${String(error)}`;
        return res.redirect(AuthController.buildLoginErrorRedirect(message));
      }

      if (!code || !state || typeof code !== "string" || typeof state !== "string") {
        return res.redirect(AuthController.buildLoginErrorRedirect("Parametros OAuth invalidos."));
      }

      const authResult = await AuthService.authenticateWithGoogle(code, state);
      const tipo = String(authResult.user.tipo);
      return res.redirect(AuthController.buildLoginSuccessRedirect(authResult.token, tipo));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no callback do Google OAuth.";
      return res.redirect(AuthController.buildLoginErrorRedirect(message));
    }
  }
}

export default AuthController;
