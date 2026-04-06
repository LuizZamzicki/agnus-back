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

  it("getById trata 404 e 200", async () => {
    const res404 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.getById(mockRequest({ params: { id: "1" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const categoria = buildModelInstance({ id_categoria: 2, nome: "cat" });
    const res200 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(categoria);
    await CategoriasController.getById(mockRequest({ params: { id: "2" } }), res200);
    expect(res200.status).toHaveBeenCalledWith(200);
    expect(res200.send).toHaveBeenCalledWith(categoria);
  });

  it("create valida campos, duplicidade e sucesso", async () => {
    const res400 = mockResponse();
    await CategoriasController.create(mockRequest({ body: {} }), res400);
    expect(res400.status).toHaveBeenCalledWith(400);

    const resDup = mockResponse();
    categoriasModel.findOne.mockResolvedValueOnce(buildModelInstance({ id_categoria: 7 }));
    await CategoriasController.create(mockRequest({ body: { nome: "cat" } }), resDup);
    expect(resDup.status).toHaveBeenCalledWith(400);

    const criada = buildModelInstance({ id_categoria: 3, nome: "nova" });
    const res201 = mockResponse();
    categoriasModel.findOne.mockResolvedValueOnce(null);
    categoriasModel.create.mockResolvedValueOnce(criada);
    await CategoriasController.create(mockRequest({ body: { nome: "nova" } }), res201);
    expect(res201.status).toHaveBeenCalledWith(201);
    expect(res201.send).toHaveBeenCalledWith(criada);
  });

  it("update cobre 404, duplicada e sucesso", async () => {
    const res404 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "x" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const atual = buildModelInstance({ id_categoria: 1, nome: "A" });
    const resDup = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(atual);
    categoriasModel.findOne.mockResolvedValueOnce(buildModelInstance({ id_categoria: 2, nome: "B" }));
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "B" } }), resDup);
    expect(resDup.status).toHaveBeenCalledWith(400);

    const res200 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(atual);
    categoriasModel.findOne.mockResolvedValueOnce(null);
    await CategoriasController.update(mockRequest({ params: { id: "1" }, body: { nome: "C" } }), res200);
    expect(atual.update).toHaveBeenCalled();
    expect(res200.status).toHaveBeenCalledWith(200);
  });

  it("remove cobre 404 e 204", async () => {
    const res404 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(null);
    await CategoriasController.remove(mockRequest({ params: { id: "5" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const entidade = buildModelInstance({ id_categoria: 5 });
    const res204 = mockResponse();
    categoriasModel.findByPk.mockResolvedValueOnce(entidade);
    await CategoriasController.remove(mockRequest({ params: { id: "5" } }), res204);
    expect(entidade.destroy).toHaveBeenCalled();
    expect(res204.status).toHaveBeenCalledWith(204);
  });
});
