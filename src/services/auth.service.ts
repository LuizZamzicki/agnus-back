import argon2 from "argon2";
import crypto from "crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import User from "../models/Usuarios";

export type AuthUserPayload = {
  id_usuario: number;
  email: string;
  tipo: "cliente" | "administrador";
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture?: string;
};

class AuthService {
  private static getJwtSecret() {
    return process.env.JWT_SECRET || "change-me-in-production";
  }

  private static getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || "1h";
  }

  private static getOAuthStateSecret() {
    return process.env.GOOGLE_STATE_SECRET || AuthService.getJwtSecret();
  }

  private static getGoogleClientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
  }

  private static getGoogleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
  }

  private static getGoogleRedirectUri() {
    return process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";
  }

  private static getGoogleScopes() {
    return process.env.GOOGLE_OAUTH_SCOPES || "openid email profile";
  }

  private static ensureGoogleOAuthConfig() {
    if (!AuthService.getGoogleClientId() || !AuthService.getGoogleClientSecret()) {
      throw new Error("Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.");
    }
  }

  static sanitizeUser(user: any) {
    const userData = user.toJSON();
    delete userData.senha;
    return userData;
  }

  static signToken(payload: AuthUserPayload) {
    const options: SignOptions = {
      expiresIn: AuthService.getJwtExpiresIn() as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, AuthService.getJwtSecret(), options);
  }

  static verifyToken(token: string): AuthUserPayload | null {
    try {
      const decoded = jwt.verify(token, AuthService.getJwtSecret()) as JwtPayload & AuthUserPayload;
      if (!decoded.id_usuario || !decoded.email || !decoded.tipo) {
        return null;
      }

      return {
        id_usuario: decoded.id_usuario,
        email: decoded.email,
        tipo: decoded.tipo,
      };
    } catch {
      return null;
    }
  }

  static async authenticate(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const senhaHash = String(user.get("senha"));
    const isValidPassword = await argon2.verify(senhaHash, password);
    if (!isValidPassword) {
      return null;
    }

    const payload: AuthUserPayload = {
      id_usuario: Number(user.get("id_usuario")),
      email: String(user.get("email")),
      tipo: user.get("tipo") as "cliente" | "administrador",
    };

    return {
      user: AuthService.sanitizeUser(user),
      token: AuthService.signToken(payload),
    };
  }

  static buildGoogleAuthorizationUrl() {
    AuthService.ensureGoogleOAuthConfig();

    const state = jwt.sign(
      {
        nonce: crypto.randomBytes(16).toString("hex"),
        provider: "google",
      },
      AuthService.getOAuthStateSecret(),
      { expiresIn: "10m" },
    );

    const params = new URLSearchParams({
      client_id: AuthService.getGoogleClientId(),
      redirect_uri: AuthService.getGoogleRedirectUri(),
      response_type: "code",
      scope: AuthService.getGoogleScopes(),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private static verifyGoogleState(state: string) {
    try {
      const decoded = jwt.verify(state, AuthService.getOAuthStateSecret()) as JwtPayload;
      return decoded.provider === "google";
    } catch {
      return false;
    }
  }

  private static async exchangeGoogleCodeForToken(code: string) {
    const body = new URLSearchParams({
      code,
      client_id: AuthService.getGoogleClientId(),
      client_secret: AuthService.getGoogleClientSecret(),
      redirect_uri: AuthService.getGoogleRedirectUri(),
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Falha ao obter token Google: ${response.status} ${responseBody}`);
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private static async fetchGoogleUserInfo(accessToken: string) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Falha ao obter perfil Google: ${response.status} ${responseBody}`);
    }

    return (await response.json()) as GoogleUserInfo;
  }

  static async authenticateWithGoogle(code: string, state: string) {
    AuthService.ensureGoogleOAuthConfig();

    if (!AuthService.verifyGoogleState(state)) {
      throw new Error("Estado OAuth inválido ou expirado.");
    }

    const tokenResponse = await AuthService.exchangeGoogleCodeForToken(code);
    const googleUser = await AuthService.fetchGoogleUserInfo(tokenResponse.access_token);

    if (!googleUser.email || !googleUser.email_verified) {
      throw new Error("Conta Google sem email verificado.");
    }

    let user = await User.findOne({ where: { google_id: googleUser.sub } });
    if (!user) {
      user = await User.findOne({ where: { email: googleUser.email } });
    }

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await argon2.hash(randomPassword, { type: argon2.argon2id });

      user = await User.create({
        nome: googleUser.name,
        email: googleUser.email,
        senha: hashedPassword,
        tipo: "cliente",
        google_id: googleUser.sub,
      });
    } else if (user.get("google_id") !== googleUser.sub) {
      await user.update({ google_id: googleUser.sub });
    }

    const payload: AuthUserPayload = {
      id_usuario: Number(user.get("id_usuario")),
      email: String(user.get("email")),
      tipo: user.get("tipo") as "cliente" | "administrador",
    };

    return {
      user: AuthService.sanitizeUser(user),
      token: AuthService.signToken(payload),
    };
  }
}

export default AuthService;
