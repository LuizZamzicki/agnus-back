import CarrinhoItensController from "../../src/controllers/carrinhoItens.controller";
import CarrinhosController from "../../src/controllers/carrinhos.controller";
import CarrinhoItens from "../../src/models/CarrinhoItens";
import Carrinhos from "../../src/models/Carrinhos";
import ProdutoCores from "../../src/models/ProdutoCores";
import ProdutoGrades from "../../src/models/ProdutoGrades";
import {
  enrichItemsWithProductData,
  normalizeItemQuantity,
  resolveProdutoContext,
} from "../../src/utils/itemDetails";
import Usuarios from "../../src/models/Usuarios";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/CarrinhoItens", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/Carrinhos", () => ({
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
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/utils/itemDetails", () => ({
  __esModule: true,
  enrichItemsWithProductData: jest.fn(async (items) => items ?? []),
  normalizeItemQuantity: jest.fn((value) => {
    const parsedValue = Number(value ?? 1);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.trunc(parsedValue) : 1;
  }),
  resolveProdutoContext: jest.fn(),
}));

const carrinhoItensModel = CarrinhoItens as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const carrinhosModel = Carrinhos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const coresModel = ProdutoCores as unknown as { findByPk: jest.Mock };
const gradesModel = ProdutoGrades as unknown as { findByPk: jest.Mock };
const usuariosModel = Usuarios as unknown as { findByPk: jest.Mock };
const enrichItemsWithProductDataMock = enrichItemsWithProductData as unknown as jest.Mock;
const normalizeItemQuantityMock = normalizeItemQuantity as unknown as jest.Mock;
const resolveProdutoContextMock = resolveProdutoContext as unknown as jest.Mock;

describe("CarrinhosController", () => {
  it("cobre todos os fluxos principais", async () => {
    const resBad = mockResponse();
    await CarrinhosController.findAll(mockRequest({ query: { id_usuario: "x" } }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const resFind = mockResponse();
    carrinhosModel.findAll.mockResolvedValueOnce([]);
    await CarrinhosController.findAll(mockRequest({ query: { id_usuario: "1" } }), resFind);
    expect(resFind.status).toHaveBeenCalledWith(200);

    const resGet404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhosController.getById(mockRequest({ params: { id: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const carrinho = buildModelInstance({ id_carrinho: 1, id_usuario: 1 });
    const resGet200 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(carrinho);
    await CarrinhosController.getById(mockRequest({ params: { id: "1" } }), resGet200);
    expect(resGet200.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await CarrinhosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreate404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhosController.create(mockRequest({ body: { id_usuario: 1 } }), resCreate404);
    expect(resCreate404.status).toHaveBeenCalledWith(404);

    const resCreate201 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    carrinhosModel.create.mockResolvedValueOnce(carrinho);
    await CarrinhosController.create(mockRequest({ body: { id_usuario: 1 } }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const resUpUser404 = mockResponse();
    const carrinhoUp = buildModelInstance({ id_carrinho: 1, id_usuario: 1 });
    carrinhosModel.findByPk.mockResolvedValueOnce(carrinhoUp);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), resUpUser404);
    expect(resUpUser404.status).toHaveBeenCalledWith(404);

    const resUp200 = mockResponse();
    const carrinhoUp2 = buildModelInstance({ id_carrinho: 1, id_usuario: 1 });
    carrinhosModel.findByPk.mockResolvedValueOnce(carrinhoUp2);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await CarrinhosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 1 } }), resUp200);
    expect(carrinhoUp2.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const resDel204 = mockResponse();
    const carrinhoDel = buildModelInstance({ id_carrinho: 1 });
    carrinhosModel.findByPk.mockResolvedValueOnce(carrinhoDel);
    await CarrinhosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(carrinhoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});

describe("CarrinhoItensController", () => {
  it("cobre todos os fluxos principais", async () => {
    const resGet = mockResponse();
    carrinhoItensModel.findAll.mockResolvedValueOnce([]);
    await CarrinhoItensController.getByIdCart(mockRequest({ params: { id_cart: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await CarrinhoItensController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const payload = { id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 };

    const resCarrinho404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.create(mockRequest({ body: payload }), resCarrinho404);
    expect(resCarrinho404.status).toHaveBeenCalledWith(404);

    const resCor404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_carrinho: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.create(mockRequest({ body: payload }), resCor404);
    expect(resCor404.status).toHaveBeenCalledWith(404);

    const resGrade404 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_carrinho: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.create(mockRequest({ body: payload }), resGrade404);
    expect(resGrade404.status).toHaveBeenCalledWith(404);

    const resMismatch = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_carrinho: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 6 }));
    await CarrinhoItensController.create(mockRequest({ body: payload }), resMismatch);
    expect(resMismatch.status).toHaveBeenCalledWith(400);

    const item = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resCreate201 = mockResponse();
    carrinhosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_carrinho: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 1, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 5 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([item]);
    carrinhoItensModel.create.mockResolvedValueOnce(item);
    await CarrinhoItensController.create(mockRequest({ body: payload }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const itemUp = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpCarrinho404 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemUp);
    carrinhosModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.update(mockRequest({ params: { id: "1" }, body: { id_carrinho: 2 } }), resUpCarrinho404);
    expect(resUpCarrinho404.status).toHaveBeenCalledWith(404);

    const itemUp2 = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpCor404 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemUp2);
    coresModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2 } }), resUpCor404);
    expect(resUpCor404.status).toHaveBeenCalledWith(404);

    const itemUp3 = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpGrade404 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemUp3);
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_grade: 3 } }), resUpGrade404);
    expect(resUpGrade404.status).toHaveBeenCalledWith(404);

    const itemUp4 = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUpMismatch = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemUp4);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 6 }));
    await CarrinhoItensController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 2, id_produto_grade: 3 } }), resUpMismatch);
    expect(resUpMismatch.status).toHaveBeenCalledWith(400);

    const itemUp5 = buildModelInstance({ id_carrinho_item: 1, id_carrinho: 1, id_produto_cor: 1, id_produto_grade: 1, quantidade: 1, preco_unitario: 10 });
    const resUp200 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemUp5);
    carrinhosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_carrinho: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 5 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 5 }));
    gradesModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 3, id_produto: 5 }));
    resolveProdutoContextMock.mockResolvedValueOnce({ precoUnitario: 10 });
    enrichItemsWithProductDataMock.mockResolvedValueOnce([itemUp5]);
    await CarrinhoItensController.update(
      mockRequest({ params: { id: "1" }, body: { id_carrinho: 1, id_produto_cor: 2, id_produto_grade: 3, quantidade: 2 } }),
      resUp200,
    );
    expect(itemUp5.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);
    expect(normalizeItemQuantityMock).toHaveBeenCalled();

    const resDel404 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(null);
    await CarrinhoItensController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const itemDel = buildModelInstance({ id_carrinho_item: 1 });
    const resDel204 = mockResponse();
    carrinhoItensModel.findByPk.mockResolvedValueOnce(itemDel);
    await CarrinhoItensController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(itemDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});
