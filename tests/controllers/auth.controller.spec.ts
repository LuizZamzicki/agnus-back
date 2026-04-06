import AuthController from "../../src/controllers/auth.controller";
import UsuarioSenhasHistoricoController from "../../src/controllers/usuarioSenhasHistorico.controller";
import Usuarios from "../../src/models/Usuarios";
import AuthService from "../../src/services/auth.service";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/services/auth.service", () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
    sanitizeUser: jest.fn(),
    buildGoogleAuthorizationUrl: jest.fn(),
    authenticateWithGoogle: jest.fn(),
  },
}));
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));

const authService = AuthService as unknown as {
  authenticate: jest.Mock;
  sanitizeUser: jest.Mock;
  buildGoogleAuthorizationUrl: jest.Mock;
  authenticateWithGoogle: jest.Mock;
};
const usuariosModel = Usuarios as unknown as { findByPk: jest.Mock };

describe("AuthController", () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.FRONTEND_URL = "http://localhost:3001";
  });

  afterAll(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it("helpers privados de tempo cobrem todas as faixas", () => {
    const originalNow = Date.now;
    const base = new Date("2026-01-01T00:00:00.000Z").getTime();

    Date.now = jest.fn(() => base);
    expect((AuthController as any).formatElapsedTime(new Date(base))).toBe("agora mesmo");

    Date.now = jest.fn(() => base + 5 * 60 * 1000);
    expect((AuthController as any).formatElapsedTime(new Date(base))).toBe("ha 5 minutos");

    Date.now = jest.fn(() => base + 2 * 60 * 60 * 1000);
    expect((AuthController as any).formatElapsedTime(new Date(base))).toBe("ha 2 horas");

    Date.now = jest.fn(() => base + 3 * 24 * 60 * 60 * 1000);
    expect((AuthController as any).formatElapsedTime(new Date(base))).toBe("ha 3 dias");

    Date.now = originalNow;
  });

  it("login cobre validacao, credencial invalida e sucesso", async () => {
    const resBad = mockResponse();
    await AuthController.login(mockRequest({ body: {} }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const resReuse = mockResponse();
    authService.authenticate.mockResolvedValueOnce(null);
    const spyHistory = jest.spyOn(UsuarioSenhasHistoricoController, "findByPasswordHash")
      .mockResolvedValueOnce(new Date("2026-01-01T00:00:00.000Z"));
    await AuthController.login(mockRequest({ body: { email: "a@a.com", senha: "123" } }), resReuse);
    expect(resReuse.status).toHaveBeenCalledWith(401);
    spyHistory.mockRestore();

    const resInvalid = mockResponse();
    authService.authenticate.mockResolvedValueOnce(null);
    const spyHistoryNull = jest.spyOn(UsuarioSenhasHistoricoController, "findByPasswordHash").mockResolvedValueOnce(null);
    await AuthController.login(mockRequest({ body: { email: "a@a.com", senha: "123" } }), resInvalid);
    expect(resInvalid.status).toHaveBeenCalledWith(401);
    spyHistoryNull.mockRestore();

    const resOk = mockResponse();
    authService.authenticate.mockResolvedValueOnce({ token: "jwt", user: { id_usuario: 1 } });
    await AuthController.login(mockRequest({ body: { email: "a@a.com", senha: "123" } }), resOk);
    expect(resOk.status).toHaveBeenCalledWith(200);
  });

  it("me cobre 401, 404 e 200", async () => {
    const res401 = mockResponse();
    await AuthController.me(mockRequest(), res401);
    expect(res401.status).toHaveBeenCalledWith(401);

    const res404 = mockResponse();
    res404.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "cliente" };
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await AuthController.me(mockRequest(), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com", senha: "x" });
    const res200 = mockResponse();
    res200.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "cliente" };
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    authService.sanitizeUser.mockReturnValueOnce({ id_usuario: 1, email: "a@a.com" });
    await AuthController.me(mockRequest(), res200);
    expect(res200.status).toHaveBeenCalledWith(200);
  });

  it("googleStart e googleCallback cobrem sucesso e erro", async () => {
    const resStart = mockResponse();
    authService.buildGoogleAuthorizationUrl.mockReturnValueOnce("https://google/auth");
    await AuthController.googleStart(mockRequest(), resStart);
    expect(resStart.redirect).toHaveBeenCalledWith("https://google/auth");

    const resStartFail = mockResponse();
    authService.buildGoogleAuthorizationUrl.mockImplementationOnce(() => {
      throw new Error("no cfg");
    });
    await AuthController.googleStart(mockRequest(), resStartFail);
    expect(resStartFail.status).toHaveBeenCalledWith(500);

    const resStartFailUnknown = mockResponse();
    authService.buildGoogleAuthorizationUrl.mockImplementationOnce(() => {
      throw "boom";
    });
    await AuthController.googleStart(mockRequest(), resStartFailUnknown);
    expect(resStartFailUnknown.status).toHaveBeenCalledWith(500);

    const resCbErr = mockResponse();
    await AuthController.googleCallback(mockRequest({ query: { error: "access_denied" } }), resCbErr);
    expect(resCbErr.redirect).toHaveBeenCalledWith(
      "http://localhost:3001/login?error=Google%20OAuth%20retornou%20erro%3A%20access_denied",
    );

    const resCbInvalid = mockResponse();
    await AuthController.googleCallback(mockRequest({ query: { code: 1, state: "a" } }), resCbInvalid);
    expect(resCbInvalid.redirect).toHaveBeenCalledWith(
      "http://localhost:3001/login?error=Parametros%20OAuth%20invalidos.",
    );

    const resCbOk = mockResponse();
    authService.authenticateWithGoogle.mockResolvedValueOnce({
      token: "jwt",
      user: { tipo: "cliente" },
    });
    await AuthController.googleCallback(mockRequest({ query: { code: "c", state: "s" } }), resCbOk);
    expect(resCbOk.redirect).toHaveBeenCalledWith(
      "http://localhost:3001/login?token=jwt&tipo=cliente&success=1",
    );

    const resCbFail = mockResponse();
    authService.authenticateWithGoogle.mockRejectedValueOnce(new Error("invalid"));
    await AuthController.googleCallback(mockRequest({ query: { code: "c", state: "s" } }), resCbFail);
    expect(resCbFail.redirect).toHaveBeenCalledWith("http://localhost:3001/login?error=invalid");

    const resCbFailUnknown = mockResponse();
    authService.authenticateWithGoogle.mockRejectedValueOnce("invalid");
    await AuthController.googleCallback(
      mockRequest({ query: { code: "c", state: "s" } }),
      resCbFailUnknown,
    );
    expect(resCbFailUnknown.redirect).toHaveBeenCalledWith(
      "http://localhost:3001/login?error=Falha%20no%20callback%20do%20Google%20OAuth.",
    );
  });
});
