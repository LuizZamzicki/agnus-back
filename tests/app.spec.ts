import request from "supertest";

const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
const middleware = jest.fn((req, res, next) => next());

const controllerMock = {
  findAll: handler,
  create: handler,
  getById: handler,
  update: handler,
  remove: handler,
  getByIdUser: handler,
  getByIdProduto: handler,
  getByIdReview: handler,
  getByIdCart: handler,
  getByIdOrder: handler,
  updatePassword: handler,
  login: handler,
  me: handler,
  catalog: handler,
  bestSellers: handler,
  googleStart: handler,
  googleCallback: handler,
};

jest.mock("../src/controllers/avaliacaoFotos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/avaliacaoProdutos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/auth.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/carrinhoItens.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/carrinhos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/categorias.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/pedidoItens.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/produtoCores.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/produtoFotos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/produtoGrades.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/produtos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/pedidos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/usuarioContatos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/usuarioEnderecos.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/usuarioSenhasHistorico.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/controllers/usuarios.controller", () => ({ __esModule: true, default: controllerMock }));
jest.mock("../src/middlewares/auth.middleware", () => ({
  __esModule: true,
  default: middleware,
  authorizeRoles: () => middleware,
  authorizeSelfOrAdmin: () => middleware,
}));

import app from "../src/app";

describe("app routes", () => {
  it("sobe rotas e responde", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});
