import ProdutosController from "../../src/controllers/produtos.controller";
import sequelize from "../../src/config/database";
import AvaliacaoFotos from "../../src/models/AvaliacaoFotos";
import AvaliacaoProdutos from "../../src/models/AvaliacaoProdutos";
import CarrinhoItens from "../../src/models/CarrinhoItens";
import Categorias from "../../src/models/Categorias";
import PedidoItens from "../../src/models/PedidoItens";
import ProdutoCores from "../../src/models/ProdutoCores";
import ProdutoFotos from "../../src/models/ProdutoFotos";
import ProdutoGrades from "../../src/models/ProdutoGrades";
import Produtos from "../../src/models/Produtos";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/config/database", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transaction: jest.fn(async (handler: (tx: object) => Promise<unknown>) => handler({})),
  },
}));
jest.mock("../../src/models/Categorias", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/models/AvaliacaoFotos", () => ({
  __esModule: true,
  default: { destroy: jest.fn() },
}));
jest.mock("../../src/models/AvaliacaoProdutos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), destroy: jest.fn() },
}));
jest.mock("../../src/models/CarrinhoItens", () => ({
  __esModule: true,
  default: { destroy: jest.fn() },
}));
jest.mock("../../src/models/PedidoItens", () => ({
  __esModule: true,
  default: { count: jest.fn() },
}));
jest.mock("../../src/models/ProdutoCores", () => ({
  __esModule: true,
  default: { create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
}));
jest.mock("../../src/models/ProdutoFotos", () => ({
  __esModule: true,
  default: { create: jest.fn(), destroy: jest.fn() },
}));
jest.mock("../../src/models/ProdutoGrades", () => ({
  __esModule: true,
  default: { create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
}));
jest.mock("../../src/models/Produtos", () => ({
  __esModule: true,
  default: { findAndCountAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));

const db = sequelize as unknown as { query: jest.Mock; transaction: jest.Mock };
const avaliacaoFotosModel = AvaliacaoFotos as unknown as { destroy: jest.Mock };
const avaliacaoProdutosModel = AvaliacaoProdutos as unknown as { findAll: jest.Mock; destroy: jest.Mock };
const carrinhoItensModel = CarrinhoItens as unknown as { destroy: jest.Mock };
const categoriasModel = Categorias as unknown as { findByPk: jest.Mock };
const pedidoItensModel = PedidoItens as unknown as { count: jest.Mock };
const coresModel = ProdutoCores as unknown as { create: jest.Mock; destroy: jest.Mock; findAll: jest.Mock };
const fotosModel = ProdutoFotos as unknown as { create: jest.Mock; destroy: jest.Mock };
const gradesModel = ProdutoGrades as unknown as { create: jest.Mock; destroy: jest.Mock; findAll: jest.Mock };
const produtosModel = Produtos as unknown as {
  findAndCountAll: jest.Mock;
  findByPk: jest.Mock;
  create: jest.Mock;
};

describe("ProdutosController", () => {
  it("helpers privados cobrem entradas de borda", () => {
    expect((ProdutosController as any).hasCategoryField(null)).toBe(false);
    expect((ProdutosController as any).hasCategoryField({})).toBeUndefined();
    expect((ProdutosController as any).parseCategoryId({ id_categoria: "" })).toBeNull();
    expect((ProdutosController as any).parseCategoryId({})).toBeUndefined();
    expect((ProdutosController as any).parseFotoUrl({ caminho_url: "x.jpg" })).toBe("x.jpg");
    expect((ProdutosController as any).parseFotoUrl({ foo: "bar" })).toBe("");
    expect((ProdutosController as any).parseFotoUrl(1)).toBe("");
  });

  it("findAll e catalog cobrem validacoes e sucesso", async () => {
    const resFindNullCat = mockResponse();
    produtosModel.findAndCountAll.mockResolvedValueOnce({ count: 1, rows: [{ id_produto: 2 }] });
    await ProdutosController.findAll(mockRequest({ query: { id_categoria: "null" } }), resFindNullCat);
    expect(resFindNullCat.status).toHaveBeenCalledWith(200);
    expect(resFindNullCat.json).toHaveBeenCalledWith({
      data: [{ id_produto: 2 }],
      pagination: expect.objectContaining({ page: 1, limit: 10, total: 1 }),
    });

    const resFindBad = mockResponse();
    await ProdutosController.findAll(mockRequest({ query: { id_categoria: "x" } }), resFindBad);
    expect(resFindBad.status).toHaveBeenCalledWith(400);

    const resFindOk = mockResponse();
    produtosModel.findAndCountAll.mockResolvedValueOnce({ count: 1, rows: [{ id_produto: 1 }] });
    await ProdutosController.findAll(mockRequest({ query: { id_categoria: "1", ativo: "true" } }), resFindOk);
    expect(resFindOk.status).toHaveBeenCalledWith(200);

    const resCatalogBad = mockResponse();
    await ProdutosController.catalog(mockRequest({ query: { id_categoria: "x" } }), resCatalogBad);
    expect(resCatalogBad.status).toHaveBeenCalledWith(400);

    const resCatalogOk = mockResponse();
    db.query.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([{ id_produto: 1, imagens_json: "[\"a.jpg\"]" }]);
    await ProdutosController.catalog(mockRequest({ query: { id_categoria: "null", ativo: "false" } }), resCatalogOk);
    expect(resCatalogOk.status).toHaveBeenCalledWith(200);
    expect(resCatalogOk.json).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id_produto: 1, imagens: ["a.jpg"], imagens_json: undefined })],
      pagination: expect.objectContaining({ page: 1, limit: 10, total: 1 }),
    });

    const resCatalogNum = mockResponse();
    db.query.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([{ id_produto: 2, imagens_json: "[]" }]);
    await ProdutosController.catalog(mockRequest({ query: { id_categoria: "2" } }), resCatalogNum);
    expect(resCatalogNum.status).toHaveBeenCalledWith(200);
  });

  it("getById cobre 404 e 200", async () => {
    const res404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutosController.getById(mockRequest({ params: { id: "1" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const produto = buildModelInstance({ id_produto: 1, nome: "A" });
    const res200 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    await ProdutosController.getById(mockRequest({ params: { id: "1" } }), res200);
    expect(res200.status).toHaveBeenCalledWith(200);
  });

  it("create cobre validacoes antes da transacao", async () => {
    const resBad = mockResponse();
    await ProdutosController.create(mockRequest({ body: {} }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const resPrecoBad = mockResponse();
    await ProdutosController.create(
      mockRequest({ body: { nome: "A", preco_base: 10, preco_custo: "x" } }),
      resPrecoBad,
    );
    expect(resPrecoBad.status).toHaveBeenCalledWith(400);

    const resCatBad = mockResponse();
    await ProdutosController.create(
      mockRequest({ body: { nome: "A", preco_base: 10, id_categoria: "abc" } }),
      resCatBad,
    );
    expect(resCatBad.status).toHaveBeenCalledWith(400);

    const resGradesBad = mockResponse();
    await ProdutosController.create(
      mockRequest({ body: { nome: "A", preco_base: 10, grades: "x" } }),
      resGradesBad,
    );
    expect(resGradesBad.status).toHaveBeenCalledWith(400);

    const resCoresBad = mockResponse();
    await ProdutosController.create(
      mockRequest({ body: { nome: "A", preco_base: 10, grades: [], cores: "x" } }),
      resCoresBad,
    );
    expect(resCoresBad.status).toHaveBeenCalledWith(400);

    const resCat404 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await ProdutosController.create(
      mockRequest({ body: { nome: "A", preco_base: 10, id_categoria: 9, grades: [], cores: [] } }),
      resCat404,
    );
    expect(resCat404.status).toHaveBeenCalledWith(404);
  });

  it("create sucesso com grades/cores/fotos e falha com rollback", async () => {
    const produto = buildModelInstance({ id_produto: 10, nome: "A", descricao: null, preco_custo: 1, preco_base: 2, ativo: true });
    produtosModel.create.mockResolvedValueOnce(produto);
    gradesModel.create.mockResolvedValueOnce(buildModelInstance({ id_produto_grade: 1, id_produto: 10, nome: "M", acrescimo: 1 }));
    coresModel.create.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 2, id_produto: 10, nome: "Azul", codigo_rgb: "#00F", acrescimo: 2 }));
    fotosModel.create.mockResolvedValueOnce(buildModelInstance({ id_produto_foto: 3, id_produto: 10, id_produto_cor: 2, caminho_url: "a.jpg" }));

    const resOk = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          preco_custo: 10,
          grades: [{ nome: "M", acrescimo: 1 }],
          cores: [{ nome: "Azul", tonalidade: "#00F", acrescimo: 2, fotos: ["a.jpg"] }],
        },
      }),
      resOk,
    );
    expect(resOk.status).toHaveBeenCalledWith(201);
    expect(resOk.json).toHaveBeenCalledWith(expect.objectContaining({ id_produto: 10 }));

    const resFail = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [{ nome: "" }],
          cores: [],
        },
      }),
      resFail,
    );
    expect(resFail.status).toHaveBeenCalledWith(400);

    const resFailGradeAcrescimo = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [{ nome: "M", acrescimo: "x" }],
          cores: [],
        },
      }),
      resFailGradeAcrescimo,
    );
    expect(resFailGradeAcrescimo.status).toHaveBeenCalledWith(400);

    const resFailCorInvalida = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [],
          cores: [{ nome: "", fotos: [] }],
        },
      }),
      resFailCorInvalida,
    );
    expect(resFailCorInvalida.status).toHaveBeenCalledWith(400);

    const resFailCorAcrescimo = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [],
          cores: [{ nome: "Azul", codigo_rgb: "#00F", acrescimo: "x", fotos: [] }],
        },
      }),
      resFailCorAcrescimo,
    );
    expect(resFailCorAcrescimo.status).toHaveBeenCalledWith(400);

    const produto2 = buildModelInstance({ id_produto: 11, nome: "A", descricao: null, preco_custo: 1, preco_base: 2, ativo: true });
    produtosModel.create.mockResolvedValueOnce(produto2);
    coresModel.create.mockResolvedValueOnce(
      buildModelInstance({ id_produto_cor: 20, id_produto: 11, nome: "Azul", codigo_rgb: "#00F", acrescimo: 1 }),
    );
    const resFailFotosArray = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [],
          cores: [{ nome: "Azul", codigo_rgb: "#00F", acrescimo: 1, fotos: "x" }],
        },
      }),
      resFailFotosArray,
    );
    expect(resFailFotosArray.status).toHaveBeenCalledWith(400);

    const produto3 = buildModelInstance({ id_produto: 12, nome: "A", descricao: null, preco_custo: 1, preco_base: 2, ativo: true });
    produtosModel.create.mockResolvedValueOnce(produto3);
    coresModel.create.mockResolvedValueOnce(
      buildModelInstance({ id_produto_cor: 21, id_produto: 12, nome: "Azul", codigo_rgb: "#00F", acrescimo: 1 }),
    );
    const resFailFotoInvalida = mockResponse();
    await ProdutosController.create(
      mockRequest({
        body: {
          nome: "A",
          preco_base: 20,
          grades: [],
          cores: [{ nome: "Azul", codigo_rgb: "#00F", acrescimo: 1, fotos: [{}] }],
        },
      }),
      resFailFotoInvalida,
    );
    expect(resFailFotoInvalida.status).toHaveBeenCalledWith(400);
  });

  it("update cobre 404, validacao e sucesso", async () => {
    const res404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutosController.update(mockRequest({ params: { id: "1" }, body: {} }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const produto = buildModelInstance({
      id_produto: 1,
      id_categoria: 1,
      nome: "A",
      descricao: "d",
      preco_custo: 1,
      preco_base: 2,
      ativo: true,
    });

    const resBad = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    await ProdutosController.update(
      mockRequest({ params: { id: "1" }, body: { id_categoria: "abc" } }),
      resBad,
    );
    expect(resBad.status).toHaveBeenCalledWith(400);

    const resCat404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await ProdutosController.update(
      mockRequest({ params: { id: "1" }, body: { id_categoria: 9 } }),
      resCat404,
    );
    expect(resCat404.status).toHaveBeenCalledWith(404);

    const res200 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    categoriasModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_categoria: 1 }));
    await ProdutosController.update(
      mockRequest({ params: { id: "1" }, body: { id_categoria: 1, nome: "B", ativo: false } }),
      res200,
    );
    expect(produto.update).toHaveBeenCalled();
    expect(res200.status).toHaveBeenCalledWith(200);
  });

  it("update permite sincronizar grades, cores e fotos", async () => {
    const produto = buildModelInstance({
      id_produto: 1,
      id_categoria: 1,
      nome: "A",
      descricao: "d",
      preco_custo: 1,
      preco_base: 2,
      ativo: true,
    });

    gradesModel.destroy.mockResolvedValueOnce(2);
    fotosModel.destroy.mockResolvedValueOnce(3);
    coresModel.destroy.mockResolvedValueOnce(2);
    gradesModel.create.mockResolvedValueOnce(
      buildModelInstance({ id_produto_grade: 10, id_produto: 1, nome: "M", acrescimo: 1 }),
    );
    coresModel.create.mockResolvedValueOnce(
      buildModelInstance({ id_produto_cor: 20, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 1 }),
    );
    fotosModel.create.mockResolvedValueOnce(
      buildModelInstance({ id_produto_foto: 30, id_produto: 1, id_produto_cor: 20, caminho_url: "a.jpg" }),
    );

    const res200 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    categoriasModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_categoria: 1 }));
    await ProdutosController.update(
      mockRequest({
        params: { id: "1" },
        body: {
          id_categoria: 1,
          nome: "Novo",
          grades: [{ nome: "M", acrescimo: 1 }],
          cores: [{ nome: "Azul", tonalidade: "#00F", acrescimo: 1, fotos: ["a.jpg"] }],
        },
      }),
      res200,
    );

    expect(gradesModel.destroy).toHaveBeenCalled();
    expect(coresModel.destroy).toHaveBeenCalled();
    expect(fotosModel.destroy).toHaveBeenCalled();
    expect(gradesModel.create).toHaveBeenCalled();
    expect(coresModel.create).toHaveBeenCalled();
    expect(fotosModel.create).toHaveBeenCalled();
    expect(res200.status).toHaveBeenCalledWith(200);
  });

  it("remove cobre 404 e 204", async () => {
    const res404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutosController.remove(mockRequest({ params: { id: "1" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const produto = buildModelInstance({ id_produto: 1 });
    const res204 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(produto);
    coresModel.findAll.mockResolvedValueOnce([]);
    gradesModel.findAll.mockResolvedValueOnce([]);
    pedidoItensModel.count.mockResolvedValueOnce(0);
    avaliacaoProdutosModel.findAll.mockResolvedValueOnce([]);
    await ProdutosController.remove(mockRequest({ params: { id: "1" } }), res204);
    expect(produto.destroy).toHaveBeenCalled();
    expect(fotosModel.destroy).toHaveBeenCalled();
    expect(avaliacaoProdutosModel.destroy).toHaveBeenCalled();
    expect(carrinhoItensModel.destroy).not.toHaveBeenCalled();
    expect(avaliacaoFotosModel.destroy).not.toHaveBeenCalled();
    expect(res204.status).toHaveBeenCalledWith(204);
  });
});
