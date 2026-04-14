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
  it("cobre todos os fluxos principais", async () => {
    const resBadUser = mockResponse();
    await PedidosController.findAll(mockRequest({ query: { id_usuario: "x" } }), resBadUser);
    expect(resBadUser.status).toHaveBeenCalledWith(400);

    const resBadStatus = mockResponse();
    await PedidosController.findAll(mockRequest({ query: { status: "foo" } }), resBadStatus);
    expect(resBadStatus.status).toHaveBeenCalledWith(400);

    const resFind = mockResponse();
    pedidosModel.findAll.mockResolvedValueOnce([]);
    await PedidosController.findAll(mockRequest({ query: { id_usuario: "1", status: "pago" } }), resFind);
    expect(resFind.status).toHaveBeenCalledWith(200);

    const resGet404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.getById(mockRequest({ params: { id: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const pedido = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    const resGet200 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.getById(mockRequest({ params: { id: "1" } }), resGet200);
    expect(resGet200.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await PedidosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreateStatusBad = mockResponse();
    await PedidosController.create(
      mockRequest({ body: { id_usuario: 1, id_usuario_endereco: 1, status: "x" } }),
      resCreateStatusBad,
    );
    expect(resCreateStatusBad.status).toHaveBeenCalledWith(400);

    const payload = { id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 20, valor_frete: 5 };

    const resCreateUser404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.create(mockRequest({ body: payload }), resCreateUser404);
    expect(resCreateUser404.status).toHaveBeenCalledWith(404);

    const resCreateEnd404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.create(mockRequest({ body: payload }), resCreateEnd404);
    expect(resCreateEnd404.status).toHaveBeenCalledWith(404);

    const resCreateMismatch = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 2 }));
    await PedidosController.create(mockRequest({ body: payload }), resCreateMismatch);
    expect(resCreateMismatch.status).toHaveBeenCalledWith(400);

    const resCreate201 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    pedidosModel.create.mockResolvedValueOnce(pedido);
    await PedidosController.create(mockRequest({ body: payload }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const resUpStatusBad = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { status: "foo" } }), resUpStatusBad);
    expect(resUpStatusBad.status).toHaveBeenCalledWith(400);

    const resUpUser404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), resUpUser404);
    expect(resUpUser404.status).toHaveBeenCalledWith(404);

    const resUpEnd404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario_endereco: 3 } }), resUpEnd404);
    expect(resUpEnd404.status).toHaveBeenCalledWith(404);

    const resUpMismatch = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(pedido);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 2 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    await PedidosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), resUpMismatch);
    expect(resUpMismatch.status).toHaveBeenCalledWith(400);

    const resUp200 = mockResponse();
    const pedidoUp = buildModelInstance({ id_pedido: 1, id_usuario: 1, id_usuario_endereco: 1, status: "pago", valor_total: 10, valor_frete: 2 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedidoUp);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    enderecosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1 }));
    await PedidosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 1, id_usuario_endereco: 1, status: "enviado" } }),
      resUp200,
    );
    expect(pedidoUp.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const resDel204 = mockResponse();
    const pedidoDel = buildModelInstance({ id_pedido: 1 });
    pedidosModel.findByPk.mockResolvedValueOnce(pedidoDel);
    await PedidosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(pedidoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});

describe("PedidoItensController", () => {
  it("cobre todos os fluxos principais", async () => {
    const resGet = mockResponse();
    pedidoItensModel.findAll.mockResolvedValueOnce([]);
    await PedidoItensController.getByIdOrder(mockRequest({ params: { id_order: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await PedidoItensController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const payload = { id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 };

    const resPedido404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), resPedido404);
    expect(resPedido404.status).toHaveBeenCalledWith(404);

    const resCor404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), resCor404);
    expect(resCor404.status).toHaveBeenCalledWith(404);

    const resGrade404 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.create(mockRequest({ body: payload }), resGrade404);
    expect(resGrade404.status).toHaveBeenCalledWith(404);

    const resMismatch = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 8 }));
    await PedidoItensController.create(mockRequest({ body: payload }), resMismatch);
    expect(resMismatch.status).toHaveBeenCalledWith(400);

    const item = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resCreate201 = mockResponse();
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 7 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([item]);
    pedidoItensModel.create.mockResolvedValueOnce(item);
    await PedidoItensController.create(mockRequest({ body: payload }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const itemUp = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpPedido404 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemUp);
    pedidosModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_pedido: 2 } }), resUpPedido404);
    expect(resUpPedido404.status).toHaveBeenCalledWith(404);

    const itemUp2 = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpCor404 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemUp2);
    coresModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2 } }), resUpCor404);
    expect(resUpCor404.status).toHaveBeenCalledWith(404);

    const itemUp3 = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpGrade404 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemUp3);
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_grade: 3 } }), resUpGrade404);
    expect(resUpGrade404.status).toHaveBeenCalledWith(404);

    const itemUp4 = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpMismatch = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemUp4);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 8 }));
    await PedidoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2, id_produto_grade: 3 } }), resUpMismatch);
    expect(resUpMismatch.status).toHaveBeenCalledWith(400);

    const itemUp5 = buildModelInstance({ id_pedido_item: 1, id_pedido: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUp200 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemUp5);
    pedidosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_pedido: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 7 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 7 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 7 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([itemUp5]);
    await PedidoItensController.update(
      mockRequest({ params: { id: "1" }, body: { id_pedido: 1, id_produto_cor: 2, id_produto_grade: 3, quantidade: 2 } }),
      resUp200,
    );
    expect(itemUp5.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);
    expect(normalizeItemQuantityMock).toHaveBeenCalled();
    expect(calculateSubtotalMock).toHaveBeenCalled();

    const resDel404 = mockResponse();
    pedidoItensModel.findByPk.mockResolvedValueOnce(null);
    await PedidoItensController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const resDel204 = mockResponse();
    const itemDel = buildModelInstance({ id_pedido_item: 1 });
    pedidoItensModel.findByPk.mockResolvedValueOnce(itemDel);
    await PedidoItensController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(itemDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});
