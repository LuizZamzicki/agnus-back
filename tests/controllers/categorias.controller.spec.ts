import CategoriasController from "../../src/controllers/categorias.controller";
import Categorias from "../../src/models/Categorias";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/Categorias", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const categoriasModel = Categorias as unknown as {
  findAndCountAll: jest.Mock;
  findByPk: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
};

describe("CategoriasController", () => {
  it("findAll retorna lista", async () => {
    const res = mockResponse();
    categoriasModel.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id_categoria: 1 }] });
    await CategoriasController.findAll(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id_categoria: 1 }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it("getById retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await CategoriasController.getById(mockRequest({ params: { id: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da categoria invalido." });
  });

  it("getById retorna 404 quando nao encontra categoria", async () => {
    const res = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.getById(mockRequest({ params: { id: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Categoria nao encontrada." });
  });

  it("getById retorna 200 com a categoria", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 2, nome: "cat" });
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    await CategoriasController.getById(mockRequest({ params: { id: "2" } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(categoria);
  });

  it("create retorna 400 sem nome", async () => {
    const res = mockResponse();
    await CategoriasController.create(mockRequest({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "nome e obrigatorio." });
  });

  it("create retorna 400 para nome invalido", async () => {
    const res = mockResponse();
    await CategoriasController.create(mockRequest({ body: { nome: "   " } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "nome e obrigatorio." });
  });

  it("create retorna 400 para nome duplicado", async () => {
    const res = mockResponse();
    categoriasModel.findOne.mockResolvedValueOnce(buildModelInstance({ id_categoria: 7 }));
    await CategoriasController.create(mockRequest({ body: { nome: "cat" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Ja existe categoria com esse nome." });
  });

  it("create retorna 201 com a categoria criada", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 3, nome: "nova" });
    categoriasModel.findOne.mockResolvedValueOnce(null);
    categoriasModel.create.mockResolvedValueOnce(categoria);
    await CategoriasController.create(mockRequest({ body: { nome: "nova" } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(categoriasModel.create).toHaveBeenCalledWith({ nome: "nova" });
    expect(res.send).toHaveBeenCalledWith(categoria);
  });

  it("update retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await CategoriasController.update(mockRequest({ params: { id: "x" }, body: { nome: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da categoria invalido." });
  });

  it("update retorna 404 quando a categoria nao existe", async () => {
    const res = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Categoria nao encontrada." });
  });

  it("update retorna 400 para nome invalido", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 1, nome: "A" });
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "   " } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "nome invalido." });
  });

  it("update retorna 400 para nome duplicado", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 1, nome: "A" });
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    categoriasModel.findOne.mockResolvedValueOnce(buildModelInstance({ id_categoria: 2, nome: "B" }));
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "B" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Ja existe categoria com esse nome." });
  });

  it("update retorna 200 com a categoria atualizada", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 1, nome: "A" });
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    categoriasModel.findOne.mockResolvedValueOnce(null);
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "C" } }), res);
    expect(categoria.update).toHaveBeenCalledWith({ nome: "C" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(categoria);
  });

  it("remove retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await CategoriasController.remove(mockRequest({ params: { id: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da categoria invalido." });
  });

  it("remove retorna 404 quando a categoria nao existe", async () => {
    const res = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.remove(mockRequest({ params: { id: "5" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Categoria nao encontrada." });
  });

  it("remove retorna 204 quando exclui a categoria", async () => {
    const res = mockResponse(), categoria = buildModelInstance({ id_categoria: 5 });
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    await CategoriasController.remove(mockRequest({ params: { id: "5" } }), res);
    expect(categoria.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
