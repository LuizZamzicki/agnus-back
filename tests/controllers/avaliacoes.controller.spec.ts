import AvaliacaoFotosController from "../../src/controllers/avaliacaoFotos.controller";
import AvaliacaoProdutosController from "../../src/controllers/avaliacaoProdutos.controller";
import AvaliacaoFotos from "../../src/models/AvaliacaoFotos";
import AvaliacaoProdutos from "../../src/models/AvaliacaoProdutos";
import Produtos from "../../src/models/Produtos";
import Usuarios from "../../src/models/Usuarios";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("../../src/models/AvaliacaoFotos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/AvaliacaoProdutos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/Produtos", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() },
}));

const avaliacaoFotosModel = AvaliacaoFotos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const avaliacaoProdutosModel = AvaliacaoProdutos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const produtosModel = Produtos as unknown as { findByPk: jest.Mock };
const usuariosModel = Usuarios as unknown as { findByPk: jest.Mock };

describe("AvaliacaoProdutosController", () => {
  it("cobre todos os fluxos principais", async () => {
    const resGet404 = mockResponse();
    avaliacaoProdutosModel.findAll.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.getByIdProduto(
      mockRequest({ params: { id_produto: "1" } }),
      resGet404,
    );
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    avaliacaoProdutosModel.findAll.mockResolvedValueOnce([]);
    await AvaliacaoProdutosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await AvaliacaoProdutosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resNotaBad = mockResponse();
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1, nota: 11 } }), resNotaBad);
    expect(resNotaBad.status).toHaveBeenCalledWith(400);

    const resProd404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1 } }), resProd404);
    expect(resProd404.status).toHaveBeenCalledWith(404);

    const resUser404 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1 } }), resUser404);
    expect(resUser404.status).toHaveBeenCalledWith(404);

    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8 });
    const resCreate201 = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    avaliacaoProdutosModel.create.mockResolvedValueOnce(avaliacao);
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1, nota: 8 } }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const avUp = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    const resUpProd404 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avUp);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }), resUpProd404);
    expect(resUpProd404.status).toHaveBeenCalledWith(404);

    const avUp2 = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    const resUpUser404 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avUp2);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), resUpUser404);
    expect(resUpUser404.status).toHaveBeenCalledWith(404);

    const avUp3 = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    const resUpNotaBad = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avUp3);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { nota: -1 } }), resUpNotaBad);
    expect(resUpNotaBad.status).toHaveBeenCalledWith(400);

    const avUp4 = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    const resUp200 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avUp4);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 1, id_usuario: 1, nota: 9 } }), resUp200);
    expect(avUp4.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const avDel = buildModelInstance({ id_avaliacao_produto: 1 });
    const resDel204 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avDel);
    await AvaliacaoProdutosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(avDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});

describe("AvaliacaoFotosController", () => {
  it("cobre todos os fluxos principais", async () => {
    const resGet404 = mockResponse();
    avaliacaoFotosModel.findAll.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.getByIdReview(
      mockRequest({ params: { id_review: "1" } }),
      resGet404,
    );
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    avaliacaoFotosModel.findAll.mockResolvedValueOnce([]);
    await AvaliacaoFotosController.getByIdReview(mockRequest({ params: { id_review: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await AvaliacaoFotosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreate404 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.create(mockRequest({ body: { id_avaliacao_produto: 1 } }), resCreate404);
    expect(resCreate404.status).toHaveBeenCalledWith(404);

    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    const resCreate201 = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_avaliacao_produto: 1 }));
    avaliacaoFotosModel.create.mockResolvedValueOnce(foto);
    await AvaliacaoFotosController.create(mockRequest({ body: { id_avaliacao_produto: 1, caminho_url: "a.jpg" } }), resCreate201);
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const fotoUp = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    const resUpReview404 = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(fotoUp);
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_avaliacao_produto: 2 } }), resUpReview404);
    expect(resUpReview404.status).toHaveBeenCalledWith(404);

    const fotoUp2 = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    const resUp200 = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(fotoUp2);
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_avaliacao_produto: 1 }));
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_avaliacao_produto: 1, caminho_url: "b.jpg" } }), resUp200);
    expect(fotoUp2.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const fotoDel = buildModelInstance({ id_avaliacao_foto: 1 });
    const resDel204 = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(fotoDel);
    await AvaliacaoFotosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(fotoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});
