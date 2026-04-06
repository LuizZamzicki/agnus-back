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

describe("Produto children controllers", () => {
  it("ProdutoCores CRUD principal", async () => {
    const resGet404 = mockResponse();
    coresModel.findAll.mockResolvedValueOnce(null);
    await ProdutoCoresController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    coresModel.findAll.mockResolvedValueOnce([]);
    await ProdutoCoresController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resBad = mockResponse();
    await ProdutoCoresController.create(mockRequest({ body: {} }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const res404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.create(
      mockRequest({ body: { id_produto: 1, nome: "Azul", codigo_rgb: "#00F" } }),
      res404,
    );
    expect(res404.status).toHaveBeenCalledWith(404);

    const cor = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F" });
    const res201 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.create.mockResolvedValueOnce(cor);
    await ProdutoCoresController.create(
      mockRequest({ body: { id_produto: 1, nome: "Azul", codigo_rgb: "#00F" } }),
      res201,
    );
    expect(res201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const corUp = buildModelInstance({ id_produto_cor: 1, id_produto: 1, nome: "Azul", codigo_rgb: "#00F", acrescimo: 0 });
    const resUpProd404 = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(corUp);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.update(
      mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }),
      resUpProd404,
    );
    expect(resUpProd404.status).toHaveBeenCalledWith(404);

    const resUp200 = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(corUp);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    await ProdutoCoresController.update(
      mockRequest({ params: { id: "1" }, body: { id_produto: 1, nome: "Branco" } }),
      resUp200,
    );
    expect(corUp.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoCoresController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const resDel204 = mockResponse();
    const corDel = buildModelInstance({ id_produto_cor: 1 });
    coresModel.findByPk.mockResolvedValueOnce(corDel);
    await ProdutoCoresController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(corDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });

  it("ProdutoGrades CRUD principal", async () => {
    const resGet404 = mockResponse();
    gradesModel.findAll.mockResolvedValueOnce(null);
    await ProdutoGradesController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    gradesModel.findAll.mockResolvedValueOnce([]);
    await ProdutoGradesController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resBad = mockResponse();
    await ProdutoGradesController.create(mockRequest({ body: {} }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const res404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: 1, nome: "M" } }), res404);
    expect(res404.status).toHaveBeenCalledWith(404);

    const grade = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M" });
    const res201 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    gradesModel.create.mockResolvedValueOnce(grade);
    await ProdutoGradesController.create(mockRequest({ body: { id_produto: 1, nome: "M" } }), res201);
    expect(res201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const gradeUp = buildModelInstance({ id_produto_grade: 1, id_produto: 1, nome: "M", acrescimo: 0 });
    const resUpProd404 = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(gradeUp);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 3 } }), resUpProd404);
    expect(resUpProd404.status).toHaveBeenCalledWith(404);

    const resUp200 = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(gradeUp);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    await ProdutoGradesController.update(mockRequest({ params: { id: "1" }, body: { nome: "G", id_produto: 1 } }), resUp200);
    expect(gradeUp.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoGradesController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const gradeDel = buildModelInstance({ id_produto_grade: 1 });
    const resDel204 = mockResponse();
    gradesModel.findByPk.mockResolvedValueOnce(gradeDel);
    await ProdutoGradesController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(gradeDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });

  it("ProdutoFotos CRUD principal", async () => {
    const resGet404 = mockResponse();
    fotosModel.findAll.mockResolvedValueOnce(null);
    await ProdutoFotosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    fotosModel.findAll.mockResolvedValueOnce([]);
    await ProdutoFotosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resBad = mockResponse();
    await ProdutoFotosController.create(mockRequest({ body: {} }), resBad);
    expect(resBad.status).toHaveBeenCalledWith(400);

    const resProd404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.create(
      mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }),
      resProd404,
    );
    expect(resProd404.status).toHaveBeenCalledWith(404);

    const resCor404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.create(
      mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }),
      resCor404,
    );
    expect(resCor404.status).toHaveBeenCalledWith(404);

    const resMismatch = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 2 }));
    await ProdutoFotosController.create(
      mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }),
      resMismatch,
    );
    expect(resMismatch.status).toHaveBeenCalledWith(400);

    const foto = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    const res201 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 1 }));
    fotosModel.create.mockResolvedValueOnce(foto);
    await ProdutoFotosController.create(
      mockRequest({ body: { id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" } }),
      res201,
    );
    expect(res201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const fotoUp = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    const resUpProd404 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(fotoUp);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }), resUpProd404);
    expect(resUpProd404.status).toHaveBeenCalledWith(404);

    const fotoUp2 = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    const resUpCor404 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(fotoUp2);
    coresModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 99 } }), resUpCor404);
    expect(resUpCor404.status).toHaveBeenCalledWith(404);

    const fotoUp3 = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    const resUpMismatch = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(fotoUp3);
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 99, id_produto: 2 }));
    await ProdutoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_produto_cor: 99 } }), resUpMismatch);
    expect(resUpMismatch.status).toHaveBeenCalledWith(400);

    const fotoUp4 = buildModelInstance({ id_produto_foto: 1, id_produto: 1, id_produto_cor: 10, caminho_url: "a.jpg" });
    const resUp200 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(fotoUp4);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 1 }));
    coresModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto_cor: 10, id_produto: 1 }));
    await ProdutoFotosController.update(
      mockRequest({ params: { id: "1" }, body: { id_produto: 1, id_produto_cor: 10, caminho_url: "b.jpg" } }),
      resUp200,
    );
    expect(fotoUp4.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(null);
    await ProdutoFotosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const fotoDel = buildModelInstance({ id_produto_foto: 1 });
    const resDel204 = mockResponse();
    fotosModel.findByPk.mockResolvedValueOnce(fotoDel);
    await ProdutoFotosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(fotoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});
