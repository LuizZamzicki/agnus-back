import PedidoItensController from "../../src/controllers/pedidoItens.controller";
import PedidosController from "../../src/controllers/pedidos.controller";
import PedidoItens from "../../src/models/PedidoItens";
import Pedidos from "../../src/models/Pedidos";
import ProdutoCores from "../../src/models/ProdutoCores";
import ProdutoGrades from "../../src/models/ProdutoGrades";
import {
  calculateSubtotal,
  enrichItemsWithProductData,
  normalizeItemQuantity,
  resolveProdutoContext,
} from "../../src/utils/itemDetails";
import UsuarioEnderecos from "../../src/models/UsuarioEnderecos";
import Usuarios from "../../src/models/Usuarios";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/PedidoItens", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/Pedidos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/ProdutoCores", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/models/ProdutoGrades", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/models/UsuarioEnderecos", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/utils/itemDetails", () => ({
  __esModule: true,
  calculateSubtotal: jest.fn((precoUnitario, quantidade) => Number(precoUnitario) * Number(quantidade)),
  enrichItemsWithProductData: jest.fn(async (items) => items ?? []),
  normalizeItemQuantity: jest.fn((value) => {
    const parsedValue = Number(value ?? 1);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.trunc(parsedValue) : 1;
  }),
  resolveProdutoContext: jest.fn(),
}));

const pedidoItensModel = PedidoItens as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const pedidosModel = Pedidos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const coresModel = ProdutoCores as unknown as { findByPk: jest.Mock };
const gradesModel = ProdutoGrades as unknown as { findByPk: jest.Mock };
const enderecosModel = UsuarioEnderecos as unknown as { findByPk: jest.Mock };
const usuariosModel = Usuarios as unknown as { findByPk: jest.Mock };
const calculateSubtotalMock = calculateSubtotal as unknown as jest.Mock;
const enrichItemsWithProductDataMock = enrichItemsWithProductData as unknown as jest.Mock;
const normalizeItemQuantityMock = normalizeItemQuantity as unknown as jest.Mock;
const resolveProdutoContextMock = resolveProdutoContext as unknown as jest.Mock;

describe("PedidosController", () => {
  const payload = { id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 20, valor_frete: 5 };

  it("findAll retorna 400 para id_usuario invalido", async () => {
    const response = mockResponse();
    await PedidosController.findAll(mockRequest({ query: { id_usuario: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario invalido." });
  });

  it("findAll retorna 400 para status invalido", async () => {
    const response = mockResponse();
    await PedidosController.findAll(mockRequest({ query: { status: "foo" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "status invalido." });
  });

  it("findAll retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    pedidosModel.findAll.mockResolvedValueOnce([]);
    await PedidosController.findAll(mockRequest({ query: { id_usuario: "1", status: "pago" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("getById retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidosController.getById(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do pedido invalido." });
  });

  it("getById retorna 404 quando o pedido nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.getById(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Pedido nao encontrado." });
  });

  it("getById retorna 200 com o pedido", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.getById(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(pedido);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await PedidosController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario e id_usuario_endereco sao obrigatorios." });
  });

  it("create retorna 400 para id_usuario invalido", async () => {
    const response = mockResponse();
    await PedidosController.create(mockRequest({ body: { id_usuario: "x", id_usuario_endereco: 1 } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario invalido." });
  });

  it("create retorna 400 para status invalido", async () => {
    const response = mockResponse();
    await PedidosController.create(mockRequest({ body: { id_usuario: 1, id_usuario_endereco: 1, status: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "status invalido." });
  });

  it("create retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("create retorna 404 quando o endereco nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Endereco do usuario nao encontrado." });
  });

  it("create retorna 400 quando o endereco nao pertence ao usuario", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 2 }));
    await PedidosController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "O endereco informado nao pertence ao usuario informado." });
  });

  it("create retorna 201 com o pedido criado", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, ...payload });
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    pedidosModel.create.mockResolvedValueOnce(pedido);
    await PedidosController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(pedidosModel.create).toHaveBeenCalledWith(payload);
    expect(response.send).toHaveBeenCalledWith(pedido);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidosController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do pedido invalido." });
  });

  it("update retorna 404 quando o pedido nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Pedido nao encontrado." });
  });

  it("update retorna 400 para status invalido", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { status: "foo" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "status invalido." });
  });

  it("update retorna 404 quando o usuario informado nao existe", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("update retorna 404 quando o endereco informado nao existe", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario_endereco: 3 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Endereco do usuario nao encontrado." });
  });

  it("update retorna 400 quando o endereco nao pertence ao usuario", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 2 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "O endereco informado nao pertence ao usuario informado." });
  });

  it("update retorna 400 para id_usuario_endereco invalido", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario_endereco: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario_endereco invalido." });
  });

  it("update retorna 200 com o pedido atualizado", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    await PedidosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 1, id_usuario_endereco: 1, status: "enviado" } }),
      response,
    );
    expect(pedido.update).toHaveBeenCalledWith({
      id_usuario: 1,
      id_usuario_endereco: 1,
      status: "enviado",
      valor_total: 10,
      valor_frete: 2,
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(pedido);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidosController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do pedido invalido." });
  });

  it("remove retorna 404 quando o pedido nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Pedido nao encontrado." });
  });

  it("remove retorna 204 quando exclui o pedido", async () => {
    const response = mockResponse(), pedido = buildModelInstance({ id_pedido: 1 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(pedido.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});

describe("PedidoItensController", () => {
  const payload = { id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 };

  it("getByIdOrder retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidoItensController.getByIdOrder(mockRequest({ params: { id_order: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do pedido invalido." });
  });

  it("getByIdOrder retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    pedidoItensModel.findAll.mockResolvedValueOnce([]);
    await PedidoItensController.getByIdOrder(mockRequest({ params: { id_order: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await PedidoItensController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_pedido, id_produto_cor, id_produto_grade e quantidade sao obrigatorios." });
  });

  it("create retorna 400 para id_pedido invalido", async () => {
    const response = mockResponse();
    await PedidoItensController.create(mockRequest({ body: { id_pedido: "x", id_produto_cor: 1, id_produto_grade: 1, quantidade: 1 } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_pedido invalido." });
  });

  it("create retorna 404 quando o pedido nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Pedido nao encontrado." });
  });

  it("create retorna 404 quando a cor nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("create retorna 404 quando a grade nao existe", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Grade do produto nao encontrada." });
  });

  it("create retorna 400 quando cor e grade nao pertencem ao mesmo produto", async () => {
    const response = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 8 }));
    await PedidoItensController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "A cor e a grade informadas nao pertencem ao mesmo produto." });
  });

  it("create retorna 201 com o item criado", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 7 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([item]);
    pedidoItensModel.create.mockResolvedValueOnce(item);
    await PedidoItensController.create(mockRequest({ body: payload }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(pedidoItensModel.create).toHaveBeenCalledWith({
      id_pedido: 1,
      id_produto_cor: 1,
      id_produto_grade: 1,
      quantidade: 1,
      preco_unitario: 10,
      subtotal: 10,
    });
    expect(response.send).toHaveBeenCalledWith(item);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidoItensController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do item invalido." });
  });

  it("update retorna 404 quando o item nao existe", async () => {
    const response = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Item do pedido nao encontrado." });
  });

  it("update retorna 404 quando o pedido informado nao existe", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_pedido: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Pedido nao encontrado." });
  });

  it("update retorna 404 quando a cor informada nao existe", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    coresModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("update retorna 404 quando a grade informada nao existe", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_grade: 3 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Grade do produto nao encontrada." });
  });

  it("update retorna 400 quando cor e grade nao pertencem ao mesmo produto", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 8 }));
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2, id_produto_grade: 3 } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "A cor e a grade informadas nao pertencem ao mesmo produto." });
  });

  it("update retorna 400 para id_produto_cor invalido", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto_cor invalido." });
  });

  it("update retorna 200 com o item atualizado", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 7 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 7 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([item]);
    await PedidoItensController.update(
      mockRequest({ params: { id: "1" }, body: { id_pedido: 1, id_produto_cor: 2, id_produto_grade: 3, quantidade: 2 } }),
      response,
    );
    expect(item.update).toHaveBeenCalledWith({
      id_pedido: 1,
      id_produto_cor: 2,
      id_produto_grade: 3,
      quantidade: 2,
      preco_unitario: 10,
      subtotal: 20,
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(item);
    expect(normalizeItemQuantityMock).toHaveBeenCalled();
    expect(calculateSubtotalMock).toHaveBeenCalled();
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await PedidoItensController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do item invalido." });
  });

  it("remove retorna 404 quando o item nao existe", async () => {
    const response = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Item do pedido nao encontrado." });
  });

  it("remove retorna 204 quando exclui o item", async () => {
    const response = mockResponse(), item = buildModelInstance({ id_pedido_item: 1 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(item);
    await PedidoItensController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(item.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});
