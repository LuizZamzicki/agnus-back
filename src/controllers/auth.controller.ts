import { Request, Response } from "express";
import { AuthenticatedResponseLocals } from "../middlewares/auth.middleware";
import Usuarios from "../models/Usuarios";
import AuthService from "../services/auth.service";
import type { ErrorLike } from "../types/errors.types";
import { isValidEmail } from "../utils/userValidation";
import UsuarioSenhasHistoricoController from "./usuarioSenhasHistorico.controller";

type AuthResponse = Response<object, AuthenticatedResponseLocals>;

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
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

    if (minutes < 1) {
      return "agora mesmo";
    }

    if (minutes < 60) {
      return `ha ${minutes} minuto${minutes > 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `ha ${hours} hora${hours > 1 ? "s" : ""}`;
    }

    const days = Math.floor(hours / 24);
    return `ha ${days} dia${days > 1 ? "s" : ""}`;
  }

  private static formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  }

  private static buildPasswordReuseMessage(date: Date) {
    const elapsedTime = AuthController.formatElapsedTime(date);
    const formattedDate = AuthController.formatDateTime(date);
    return `Essa senha ja foi usada ${elapsedTime} (em ${formattedDate}).`;
  }

  private static async buildLoginErrorMessage(email: string, senha: string) {
    const reusedAt = await UsuarioSenhasHistoricoController.findByPasswordHash(email, senha);

    if (!reusedAt) {
      return "Credenciais invalidas.";
    }

    return AuthController.buildPasswordReuseMessage(reusedAt);
  }

  private static getGoogleErrorRedirect(query: Request["query"]) {
    if (!query.error) {
      return null;
    }

    return AuthController.buildLoginErrorRedirect(`Google OAuth retornou erro: ${String(query.error)}`);
  }

  private static getGoogleCallbackParams(query: Request["query"]) {
    const { code, state } = query;

    return typeof code === "string" && typeof state === "string"
      ? { code, state }
      : null;
  }

  private static getErrorMessage(error: ErrorLike, fallback: string) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }

    return fallback;
  }

  private static async buildGoogleSuccessRedirect(code: string, state: string) {
    const authResult = await AuthService.authenticateWithGoogle(code, state);

    return AuthController.buildLoginSuccessRedirect(
      authResult.token,
      authResult.user.tipo,
    );
  }

  static async login(req: Request, res: Response) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: "Email e senha sao obrigatorios." });
    }

    if (!isValidEmail(String(email))) {
      return res.status(400).json({ message: "email invalido." });
    }

    const authResult = await AuthService.authenticate(email, senha);

    if (authResult) {
      return res.status(200).json(authResult);
    }

    return res.status(401).json({
      message: await AuthController.buildLoginErrorMessage(email, senha),
    });
  }

  static async me(req: Request, res: AuthResponse) {
    const authUser = res.locals.authUser;

    if (!authUser) {
      return res.status(401).json({ message: "Nao autenticado." });
    }

    const user = await Usuarios.findByPk(authUser.id_usuario);

    if (!user) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    return res.status(200).json({ user: AuthService.sanitizeUser(user) });
  }

  static async googleStart(req: Request, res: Response) {
    try {
      return res.redirect(AuthService.buildGoogleAuthorizationUrl());
    } catch (error) {
      return res.status(500).json({
        message: AuthController.getErrorMessage(
          error as ErrorLike,
          "Falha ao iniciar login com Google.",
        ),
      });
    }
  }

  static async googleCallback(req: Request, res: Response) {
    const errorRedirect = AuthController.getGoogleErrorRedirect(req.query);
    const params = AuthController.getGoogleCallbackParams(req.query);

    if (errorRedirect) {
      return res.redirect(errorRedirect);
    }

    if (!params) {
      return res.redirect(AuthController.buildLoginErrorRedirect("Parametros OAuth invalidos."));
    }

    try {
      return res.redirect(
        await AuthController.buildGoogleSuccessRedirect(params.code, params.state),
      );
    } catch (error) {
      return res.redirect(
        AuthController.buildLoginErrorRedirect(
          AuthController.getErrorMessage(
            error as ErrorLike,
            "Falha no callback do Google OAuth.",
          ),
        ),
      );
    }
  }
}

export default AuthController;
