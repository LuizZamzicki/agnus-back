import authenticateToken, {
  authorizeRoles,
  authorizeSelfOrAdmin,
} from "../../src/middlewares/auth.middleware";
import Usuarios from "../../src/models/Usuarios";
import AuthService from "../../src/services/auth.service";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/services/auth.service", () => ({
  __esModule: true,
  default: { verifyToken: jest.fn() },
}));

type UsuariosModelMock = { findByPk: jest.Mock };
type AuthServiceMock = { verifyToken: jest.Mock };

const usuariosModel = Usuarios as typeof Usuarios & UsuariosModelMock;
const authService = AuthService as typeof AuthService & AuthServiceMock;

describe("auth.middleware", () => {
  it("authenticateToken retorna 401 sem token", async () => {
    const next = jest.fn(), response = mockResponse();
    await authenticateToken(mockRequest(), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Token nao informado." });
  });

  it("authenticateToken retorna 401 para token invalido", async () => {
    const next = jest.fn(), response = mockResponse();
    authService.verifyToken.mockReturnValueOnce(null);
    await authenticateToken(mockRequest({ headers: { authorization: "Bearer token" } }), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Token invalido ou expirado." });
  });

  it("authenticateToken retorna 401 quando o usuario do token nao existe", async () => {
    const next = jest.fn(), response = mockResponse();
    authService.verifyToken.mockReturnValueOnce({ id_usuario: 1, email: "a@a.com", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await authenticateToken(mockRequest({ headers: { authorization: "Bearer token" } }), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario do token nao existe mais." });
  });

  it("authenticateToken retorna 401 quando o token esta desatualizado", async () => {
    const next = jest.fn(), response = mockResponse();
    authService.verifyToken.mockReturnValueOnce({ id_usuario: 1, email: "old@a.com", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1, email: "new@a.com", tipo: "cliente" }) as never as Usuarios);
    await authenticateToken(mockRequest({ headers: { authorization: "Bearer token" } }), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Token desatualizado. Faca login novamente." });
  });

  it("authenticateToken define authUser e chama next no sucesso", async () => {
    const next = jest.fn(), response = mockResponse();
    authService.verifyToken.mockReturnValueOnce({ id_usuario: 1, email: "a@a.com", tipo: "administrador" });
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1, email: "a@a.com", tipo: "administrador" }) as never as Usuarios);
    await authenticateToken(mockRequest({ headers: { authorization: "Bearer token" } }), response, next);
    expect(response.locals.authUser).toEqual({ id_usuario: 1, email: "a@a.com", tipo: "administrador" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("authorizeRoles retorna 401 sem autenticacao", () => {
    const next = jest.fn(), middleware = authorizeRoles("administrador"), response = mockResponse();
    middleware(mockRequest(), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Nao autenticado." });
  });

  it("authorizeRoles retorna 403 sem permissao", () => {
    const next = jest.fn(), middleware = authorizeRoles("administrador"), response = mockResponse();
    response.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "cliente" };
    middleware(mockRequest(), response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "Sem permissao para este recurso." });
  });

  it("authorizeRoles chama next quando o papel e permitido", () => {
    const next = jest.fn(), middleware = authorizeRoles("administrador"), response = mockResponse();
    response.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "administrador" };
    middleware(mockRequest(), response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("authorizeSelfOrAdmin retorna 401 sem autenticacao", () => {
    const next = jest.fn(), middleware = authorizeSelfOrAdmin("id"), response = mockResponse();
    middleware(mockRequest(), response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Nao autenticado." });
  });

  it("authorizeSelfOrAdmin libera administrador", () => {
    const next = jest.fn(), middleware = authorizeSelfOrAdmin("id"), response = mockResponse();
    response.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "administrador" };
    middleware(mockRequest({ params: { id: "9" } }), response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("authorizeSelfOrAdmin retorna 400 para id invalido", () => {
    const next = jest.fn(), middleware = authorizeSelfOrAdmin("id"), response = mockResponse();
    response.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "x" } }), response, next);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID de usuario invalido." });
  });

  it("authorizeSelfOrAdmin retorna 403 para outro usuario", () => {
    const next = jest.fn(), middleware = authorizeSelfOrAdmin("id"), response = mockResponse();
    response.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "3" } }), response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "Voce so pode acessar o proprio usuario." });
  });

  it("authorizeSelfOrAdmin chama next para o proprio usuario", () => {
    const next = jest.fn(), middleware = authorizeSelfOrAdmin("id"), response = mockResponse();
    response.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "2" } }), response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
