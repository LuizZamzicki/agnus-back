import ProdutoCoresController from "../../src/controllers/produtoCores.controller";
import ProdutoFotosController from "../../src/controllers/produtoFotos.controller";
import ProdutoGradesController from "../../src/controllers/produtoGrades.controller";
import ProdutoCores from "../../src/models/ProdutoCores";
import ProdutoFotos from "../../src/models/ProdutoFotos";
import ProdutoGrades from "../../src/models/ProdutoGrades";
import Produtos from "../../src/models/Produtos";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/ProdutoCores", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/ProdutoFotos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/ProdutoGrades", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/Produtos", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));

const coresModel = ProdutoCores as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const fotosModel = ProdutoFotos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const gradesModel = ProdutoGrades as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const produtosModel = Produtos as unknown as { findByPk: jest.Mock };

describe("ProdutoCoresController", () => {
  it("getByIdProduto retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.getByIdProduto(mockRequest({ params: { id_produto: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do produto invalido." });
  });

  it("getByIdProduto retorna 404 quando nao encontra cores", async () => {
    const response = mockResponse();
    coresModel.findAll.mockResolvedValueOnce(null);
    await ProdutoCoresController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("getByIdProduto retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    coresModel.findAll.mockResolvedValueOnce([]);
    await ProdutoCoresController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await ProdutoCoresController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto, nome e codigo_rgb sao obrigatorios." });
  });

  it("create retorna 400 para id_produto invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.create(mockRequest({ body: { id_produto: "x", nome: "Azul", codigo_rgb: "#00F" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto invalido." });
  });

  it("create retorna 400 para nome invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.create(mockRequest({ body: { id_produto: 1, nome: "   ", codigo_rgb: "#00F" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "nome invalido." });
  });

  it("create retorna 400 para codigo_rgb invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.create(mockRequest({ body: { id_produto: 1, nome: "Azul", codigo_rgb: "zzz" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "codigo_rgb invalido. Use formato RGB valido." });
  });

  it("create retorna 404 quando o produto nao existe", async () => {
    const response = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.create(mockRequest({ body: { id_produto: 1, nome: "Azul", codigo_rgb: "#00F" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("create retorna 201 com a cor criada", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F" });
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.create.mockResolvedValueOnce(cor);
    await ProdutoCoresController.create(mockRequest({ body: { id_produto: 1, nome: "Azul", codigo_rgb: "#00F" } }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(coresModel.create).toHaveBeenCalledWith({ id_produto: 1, nome: "Azul", codigo_rgb: "rgb(0,0,255)", acrescimo: 0 });
    expect(response.send).toHaveBeenCalledWith(cor);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da cor invalido." });
  });

  it("update retorna 404 quando a cor nao existe", async () => {
    const response = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("update retorna 404 quando o produto informado nao existe", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 0 });
    coresModel.findByPk.mockResolvedValueOnce(cor);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("update retorna 400 para nome invalido", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 0 });
    coresModel.findByPk.mockResolvedValueOnce(cor);
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: { nome: "   " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "nome invalido." });
  });

  it("update retorna 400 para codigo_rgb invalido", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 0 });
    coresModel.findByPk.mockResolvedValueOnce(cor);
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: { codigo_rgb: "zzz" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "codigo_rgb invalido. Use formato RGB valido." });
  });

  it("update retorna 200 com a cor atualizada", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 0 });
    coresModel.findByPk.mockResolvedValueOnce(cor);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 1, nome: "Branco" } }), response);
    expect(cor.update).toHaveBeenCalledWith({ id_produto: 1, nome: "Branco", codigo_rgb: "#00F", acrescimo: 0 });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(cor);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoCoresController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da cor invalido." });
  });

  it("remove retorna 404 quando a cor nao existe", async () => {
    const response = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("remove retorna 204 quando exclui a cor", async () => {
    const response = mockResponse(), cor = buildModelInstance({ id_produto_cor: 1 });
    coresModel.findByPk.mockResolvedValueOnce(cor);
    await ProdutoCoresController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(cor.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});

describe("ProdutoGradesController", () => {
  it("getByIdProduto retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoGradesController.getByIdProduto(mockRequest({ params: { id_produto: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do produto invalido." });
  });

  it("getByIdProduto retorna 404 quando nao encontra grades", async () => {
    const response = mockResponse();
    gradesModel.findAll.mockResolvedValueOnce(null);
    await ProdutoGradesController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Grade do produto nao encontrada." });
  });

  it("getByIdProduto retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    gradesModel.findAll.mockResolvedValueOnce([]);
    await ProdutoGradesController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await ProdutoGradesController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto e nome sao obrigatorios." });
  });

  it("create retorna 400 para id_produto invalido", async () => {
    const response = mockResponse();
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: "x", nome: "M" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto invalido." });
  });

  it("create retorna 400 para nome invalido", async () => {
    const response = mockResponse();
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: 1, nome: "   " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "nome invalido." });
  });

  it("create retorna 404 quando o produto nao existe", async () => {
    const response = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: 1, nome: "M" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("create retorna 201 com a grade criada", async () => {
    const response = mockResponse(), grade = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M" });
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    gradesModel.create.mockResolvedValueOnce(grade);
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: 1, nome: "M" } }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(gradesModel.create).toHaveBeenCalledWith({ id_produto: 1, nome: "M", acrescimo: 0 });
    expect(response.send).toHaveBeenCalledWith(grade);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoGradesController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da grade invalido." });
  });

  it("update retorna 404 quando a grade nao existe", async () => {
    const response = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Grade do produto nao encontrada." });
  });

  it("update retorna 404 quando o produto informado nao existe", async () => {
    const response = mockResponse(), grade = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M", acrescimo: 0 });
    gradesModel.findByPk.mockResolvedValueOnce(grade);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 3 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("update retorna 400 para nome invalido", async () => {
    const response = mockResponse(), grade = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M", acrescimo: 0 });
    gradesModel.findByPk.mockResolvedValueOnce(grade);
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: { nome: "   " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "nome invalido." });
  });

  it("update retorna 200 com a grade atualizada", async () => {
    const response = mockResponse(), grade = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M", acrescimo: 0 });
    gradesModel.findByPk.mockResolvedValueOnce(grade);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: { nome: "G", id_produto: 1 } }), response);
    expect(grade.update).toHaveBeenCalledWith({ id_produto: 1, nome: "G", acrescimo: 0 });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(grade);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoGradesController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da grade invalido." });
  });

  it("remove retorna 404 quando a grade nao existe", async () => {
    const response = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Grade do produto nao encontrada." });
  });

  it("remove retorna 204 quando exclui a grade", async () => {
    const response = mockResponse(), grade = buildModelInstance({ id_produto_grade: 1 });
    gradesModel.findByPk.mockResolvedValueOnce(grade);
    await ProdutoGradesController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(grade.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});

describe("ProdutoFotosController", () => {
  it("getByIdProduto retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoFotosController.getByIdProduto(mockRequest({ params: { id_produto: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do produto invalido." });
  });

  it("getByIdProduto retorna 404 quando nao encontra fotos", async () => {
    const response = mockResponse();
    fotosModel.findAll.mockResolvedValueOnce(null);
    await ProdutoFotosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Foto do produto nao encontrada." });
  });

  it("getByIdProduto retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    fotosModel.findAll.mockResolvedValueOnce([]);
    await ProdutoFotosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await ProdutoFotosController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto, id_produto_cor e caminho_url (ou bits) sao obrigatorios." });
  });

  it("create retorna 400 para id_produto invalido", async () => {
    const response = mockResponse();
    await ProdutoFotosController.create(mockRequest({ body: { id_produto: "x", id_produto_cor: 10, caminho_url: "a.jpg" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_produto invalido." });
  });

  it("create retorna 404 quando o produto nao existe", async () => {
    const response = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.create(mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("create retorna 404 quando a cor nao existe", async () => {
    const response = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.create(mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("create retorna 400 quando a cor nao pertence ao produto", async () => {
    const response = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 2 }));
    await ProdutoFotosController.create(mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "A cor informada nao pertence ao produto informado." });
  });

  it("create retorna 201 com a foto criada", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 1 }));
    fotosModel.create.mockResolvedValueOnce(foto);
    await ProdutoFotosController.create(mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(fotosModel.create).toHaveBeenCalledWith({ id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    expect(response.send).toHaveBeenCalledWith(foto);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoFotosController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da foto invalido." });
  });

  it("update retorna 404 quando a foto nao existe", async () => {
    const response = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Foto do produto nao encontrada." });
  });

  it("update retorna 404 quando o produto informado nao existe", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("update retorna 404 quando a cor informada nao existe", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 99 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Cor do produto nao encontrada." });
  });

  it("update retorna 400 quando a cor nao pertence ao produto", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 99, id_produto: 2 }));
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 99 } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "A cor informada nao pertence ao produto informado." });
  });

  it("update retorna 400 para caminho_url invalido", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { caminho_url: "" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "caminho_url invalido." });
  });

  it("update retorna 200 com a foto atualizada", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 1 }));
    await ProdutoFotosController.update(
      mockRequest({ params: { id: "1" }, body: { id_produto: 1, id_produto_cor: 10, caminho_url: "b.jpg" } }),
      response,
    );
    expect(foto.update).toHaveBeenCalledWith({ id_produto: 1, id_produto_cor: 10, caminho_url: "b.jpg" });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(foto);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await ProdutoFotosController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID da foto invalido." });
  });

  it("remove retorna 404 quando a foto nao existe", async () => {
    const response = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Foto do produto nao encontrada." });
  });

  it("remove retorna 204 quando exclui a foto", async () => {
    const response = mockResponse(), foto = buildModelInstance({ id_produto_foto: 1 });
    fotosModel.findByPk.mockResolvedValueOnce(foto);
    await ProdutoFotosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(foto.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});
