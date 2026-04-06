import argon2 from "argon2";
import jwt from "jsonwebtoken";
import User from "../../src/models/Usuarios";
import AuthService from "../../src/services/auth.service";
import { buildModelInstance } from "../helpers/http";

jest.mock("argon2", () => ({
  __esModule: true,
  default: {
    argon2id: 2,
    hash: jest.fn(),
    verify: jest.fn(),
  },
}));
jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));
jest.mock("crypto", () => ({
  __esModule: true,
  default: {
    randomBytes: jest.fn(() => Buffer.from("1234567890123456")),
  },
}));
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const argon2Mock = argon2 as unknown as { verify: jest.Mock; hash: jest.Mock };
const jwtMock = jwt as unknown as { sign: jest.Mock; verify: jest.Mock };
const userModel = User as unknown as { findOne: jest.Mock; create: jest.Mock };

describe("AuthService", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "secret";
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "secret-google";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost/callback";
    process.env.GOOGLE_OAUTH_SCOPES = "openid email profile";
    process.env.GOOGLE_STATE_SECRET = "state-secret";
    (global as any).fetch = jest.fn();
  });

  it("sanitizeUser remove senha", () => {
    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com", senha: "hash" });
    const sanitized = AuthService.sanitizeUser(user);
    expect(sanitized).toEqual({ id_usuario: 1, email: "a@a.com" });
  });

  it("signToken e verifyToken cobrem sucesso e falhas", () => {
    jwtMock.sign.mockReturnValueOnce("jwt-token");
    const token = AuthService.signToken({ id_usuario: 1, email: "a@a.com", tipo: "cliente" });
    expect(token).toBe("jwt-token");

    jwtMock.verify.mockReturnValueOnce({ id_usuario: 1, email: "a@a.com", tipo: "administrador" });
    const payload = AuthService.verifyToken("jwt-token");
    expect(payload).toEqual({ id_usuario: 1, email: "a@a.com", tipo: "administrador" });

    jwtMock.verify.mockReturnValueOnce({ id_usuario: 1 });
    expect(AuthService.verifyToken("bad")).toBeNull();

    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error("invalid");
    });
    expect(AuthService.verifyToken("bad")).toBeNull();
  });

  it("authenticate cobre user inexistente, senha invalida e sucesso", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    expect(await AuthService.authenticate("a@a.com", "123")).toBeNull();

    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com", senha: "hash", tipo: "cliente" });
    userModel.findOne.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(false);
    expect(await AuthService.authenticate("a@a.com", "123")).toBeNull();

    userModel.findOne.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(true);
    jwtMock.sign.mockReturnValueOnce("jwt-ok");
    const result = await AuthService.authenticate("a@a.com", "123");
    expect(result).toEqual({
      user: { id_usuario: 1, email: "a@a.com", tipo: "cliente" },
      token: "jwt-ok",
    });
  });

  it("buildGoogleAuthorizationUrl monta URL e falha sem config", () => {
    jwtMock.sign.mockReturnValueOnce("state-token");
    const url = AuthService.buildGoogleAuthorizationUrl();
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("state=state-token");

    process.env.GOOGLE_CLIENT_ID = "";
    process.env.GOOGLE_CLIENT_SECRET = "";
    expect(() => AuthService.buildGoogleAuthorizationUrl()).toThrow("Google OAuth");
  });

  it("authenticateWithGoogle cobre erros de estado, token, perfil e sucesso", async () => {
    jwtMock.verify.mockImplementationOnce(() => {
      throw new Error("state invalid");
    });
    await expect(AuthService.authenticateWithGoogle("code", "state")).rejects.toThrow("Estado OAuth");

    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad code" });
    await expect(AuthService.authenticateWithGoogle("code", "state")).rejects.toThrow(
      "Falha ao obter token Google",
    );

    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "ga" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ email: "", email_verified: false }) });
    await expect(AuthService.authenticateWithGoogle("code", "state")).rejects.toThrow(
      "Conta Google sem email verificado.",
    );

    const existingByGoogle = buildModelInstance({
      id_usuario: 1,
      email: "a@a.com",
      tipo: "cliente",
      google_id: "sub-1",
      senha: "hash",
    });
    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "ga" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "sub-1", name: "A", email: "a@a.com", email_verified: true }),
      });
    userModel.findOne.mockResolvedValueOnce(existingByGoogle);
    jwtMock.sign.mockReturnValueOnce("jwt-user");
    const byGoogle = await AuthService.authenticateWithGoogle("code", "state");
    expect(byGoogle.token).toBe("jwt-user");

    const existingByEmail = buildModelInstance({
      id_usuario: 2,
      email: "b@b.com",
      tipo: "cliente",
      google_id: null,
      senha: "hash",
    });
    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "ga" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "sub-2", name: "B", email: "b@b.com", email_verified: true }),
      });
    userModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingByEmail);
    jwtMock.sign.mockReturnValueOnce("jwt-email");
    const byEmail = await AuthService.authenticateWithGoogle("code", "state");
    expect(existingByEmail.update).toHaveBeenCalledWith({ google_id: "sub-2" });
    expect(byEmail.token).toBe("jwt-email");

    const created = buildModelInstance({
      id_usuario: 3,
      email: "c@c.com",
      tipo: "cliente",
      google_id: "sub-3",
      senha: "hash",
    });
    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "ga" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "sub-3", name: "C", email: "c@c.com", email_verified: true }),
      });
    userModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    argon2Mock.hash.mockResolvedValueOnce("hashed-random");
    userModel.create.mockResolvedValueOnce(created);
    jwtMock.sign.mockReturnValueOnce("jwt-create");
    const byCreate = await AuthService.authenticateWithGoogle("code", "state");
    expect(userModel.create).toHaveBeenCalled();
    expect(byCreate.token).toBe("jwt-create");
  });

  it("authenticateWithGoogle cobre falha ao buscar perfil", async () => {
    jwtMock.verify.mockReturnValueOnce({ provider: "google" });
    (global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "ga" }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "profile error" });

    await expect(AuthService.authenticateWithGoogle("code", "state")).rejects.toThrow(
      "Falha ao obter perfil Google",
    );
  });
});
