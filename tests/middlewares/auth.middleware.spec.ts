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

const usuariosModel = Usuarios as unknown as { findByPk: jest.Mock };
const authService = AuthService as unknown as { verifyToken: jest.Mock };

describe("auth.middleware", () => {
  it("authenticateToken cobre todos os fluxos", async () => {
    const next = jest.fn();

    const resMissing = mockResponse();
    await authenticateToken(mockRequest(), resMissing, next);
    expect(resMissing.status).toHaveBeenCalledWith(401);

    const resInvalid = mockResponse();
    authService.verifyToken.mockReturnValueOnce(null);
    await authenticateToken(
      mockRequest({ headers: { authorization: "Bearer token" } }),
      resInvalid,
      next,
    );
    expect(resInvalid.status).toHaveBeenCalledWith(401);

    const resUserMissing = mockResponse();
    authService.verifyToken.mockReturnValueOnce({
      id_usuario: 1,
      email: "a@a.com",
      tipo: "cliente",
    });
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await authenticateToken(
      mockRequest({ headers: { authorization: "Bearer token" } }),
      resUserMissing,
      next,
    );
    expect(resUserMissing.status).toHaveBeenCalledWith(401);

    const resStale = mockResponse();
    authService.verifyToken.mockReturnValueOnce({
      id_usuario: 1,
      email: "old@a.com",
      tipo: "cliente",
    });
    usuariosModel.findByPk.mockResolvedValueOnce(
      buildModelInstance({ id_usuario: 1, email: "new@a.com", tipo: "cliente" }),
    );
    await authenticateToken(
      mockRequest({ headers: { authorization: "Bearer token" } }),
      resStale,
      next,
    );
    expect(resStale.status).toHaveBeenCalledWith(401);

    const resOk = mockResponse();
    authService.verifyToken.mockReturnValueOnce({
      id_usuario: 1,
      email: "a@a.com",
      tipo: "administrador",
    });
    usuariosModel.findByPk.mockResolvedValueOnce(
      buildModelInstance({ id_usuario: 1, email: "a@a.com", tipo: "administrador" }),
    );
    await authenticateToken(
      mockRequest({ headers: { authorization: "Bearer token" } }),
      resOk,
      next,
    );
    expect(resOk.locals.authUser).toEqual({
      id_usuario: 1,
      email: "a@a.com",
      tipo: "administrador",
    });
    expect(next).toHaveBeenCalled();
  });

  it("authorizeRoles cobre 401/403/next", () => {
    const next = jest.fn();
    const middleware = authorizeRoles("administrador");

    const res401 = mockResponse();
    middleware(mockRequest(), res401, next);
    expect(res401.status).toHaveBeenCalledWith(401);

    const res403 = mockResponse();
    res403.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "cliente" };
    middleware(mockRequest(), res403, next);
    expect(res403.status).toHaveBeenCalledWith(403);

    const res200 = mockResponse();
    res200.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "administrador" };
    middleware(mockRequest(), res200, next);
    expect(next).toHaveBeenCalled();
  });

  it("authorizeSelfOrAdmin cobre 401/admin/400/403/next", () => {
    const next = jest.fn();
    const middleware = authorizeSelfOrAdmin("id");

    const res401 = mockResponse();
    middleware(mockRequest(), res401, next);
    expect(res401.status).toHaveBeenCalledWith(401);

    const resAdmin = mockResponse();
    resAdmin.locals.authUser = { id_usuario: 1, email: "a@a.com", tipo: "administrador" };
    middleware(mockRequest({ params: { id: "9" } }), resAdmin, next);
    expect(next).toHaveBeenCalled();

    const res400 = mockResponse();
    res400.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "x" } }), res400, next);
    expect(res400.status).toHaveBeenCalledWith(400);

    const res403 = mockResponse();
    res403.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "3" } }), res403, next);
    expect(res403.status).toHaveBeenCalledWith(403);

    const resOk = mockResponse();
    resOk.locals.authUser = { id_usuario: 2, email: "b@b.com", tipo: "cliente" };
    middleware(mockRequest({ params: { id: "2" } }), resOk, next);
    expect(next).toHaveBeenCalled();
  });
});
