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

type AvaliacaoFotosModelMock = { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
type AvaliacaoProdutosModelMock = { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
type ProdutosModelMock = { findByPk: jest.Mock };
type UsuariosModelMock = { findByPk: jest.Mock };

const avaliacaoFotosModel = AvaliacaoFotos as typeof AvaliacaoFotos & AvaliacaoFotosModelMock;
const avaliacaoProdutosModel = AvaliacaoProdutos as typeof AvaliacaoProdutos & AvaliacaoProdutosModelMock;
const produtosModel = Produtos as typeof Produtos & ProdutosModelMock;
const usuariosModel = Usuarios as typeof Usuarios & UsuariosModelMock;

describe("AvaliacaoProdutosController", () => {
  it("getByIdProduto retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.getByIdProduto(mockRequest({ params: { id_produto: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID do produto invalido." });
  });

  it("getByIdProduto retorna 404 quando nao encontra avaliacoes", async () => {
    const res = mockResponse();
    avaliacaoProdutosModel.findAll.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Avaliacao de produto nao encontrada." });
  });

  it("getByIdProduto retorna 200 com lista vazia", async () => {
    const res = mockResponse();
    avaliacaoProdutosModel.findAll.mockResolvedValueOnce([]);
    await AvaliacaoProdutosController.getByIdProduto(mockRequest({ params: { id_produto: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 quando faltam campos obrigatorios", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.create(mockRequest({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_produto e id_usuario sao obrigatorios." });
  });

  it("create retorna 400 para id_produto invalido", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: "x", id_usuario: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_produto invalido." });
  });

  it("create retorna 400 para nota invalida", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1, nota: 11 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "nota invalida. Use valor entre 0 e 10." });
  });

  it("create retorna 404 quando o produto nao existe", async () => {
    const res = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("create retorna 404 quando o usuario nao existe", async () => {
    const res = mockResponse();
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.create(mockRequest({ body: { id_produto: 1, id_usuario: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("create retorna 201 com a avaliacao criada", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8 });
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    avaliacaoProdutosModel.create.mockResolvedValueOnce(avaliacao);
    await AvaliacaoProdutosController.create(
      mockRequest({ body: { id_produto: 1, id_usuario: 1, nota: 8, nome: "Ana", comentario: "Boa compra" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(avaliacaoProdutosModel.create).toHaveBeenCalledWith({
      id_produto: 1,
      id_usuario: 1,
      titulo: "Ana",
      comentario: "Boa compra",
      nota: 8,
    });
    expect(res.send).toHaveBeenCalledWith(avaliacao);
  });

  it("update retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "x" }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da avaliacao invalido." });
  });

  it("update retorna 404 quando a avaliacao nao existe", async () => {
    const res = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Avaliacao de produto nao encontrada." });
  });

  it("update retorna 404 quando o produto informado nao existe", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    produtosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Produto nao encontrado." });
  });

  it("update retorna 404 quando o usuario informado nao existe", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("update retorna 400 para nota invalida", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { nota: -1 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "nota invalida. Use valor entre 0 e 10." });
  });

  it("update retorna 400 para id_produto invalido", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    await AvaliacaoProdutosController.update(mockRequest({ params: { id: "1" }, body: { id_produto: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_produto invalido." });
  });

  it("update retorna 200 com a avaliacao atualizada", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1, id_produto: 1, id_usuario: 1, nota: 8, titulo: null, comentario: null });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    produtosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_produto: 1 }));
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await AvaliacaoProdutosController.update(
      mockRequest({ params: { id: "1" }, body: { id_produto: 1, id_usuario: 1, nota: 9, nome: "Bia", comentario: "Atualizada" } }),
      res,
    );
    expect(avaliacao.update).toHaveBeenCalledWith({
      id_produto: 1,
      id_usuario: 1,
      titulo: "Bia",
      comentario: "Atualizada",
      nota: 9,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(avaliacao);
  });

  it("remove retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoProdutosController.remove(mockRequest({ params: { id: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da avaliacao invalido." });
  });

  it("remove retorna 404 quando a avaliacao nao existe", async () => {
    const res = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoProdutosController.remove(mockRequest({ params: { id: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Avaliacao de produto nao encontrada." });
  });

  it("remove retorna 204 quando exclui a avaliacao", async () => {
    const res = mockResponse();
    const avaliacao = buildModelInstance({ id_avaliacao_produto: 1 });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(avaliacao);
    await AvaliacaoProdutosController.remove(mockRequest({ params: { id: "1" } }), res);
    expect(avaliacao.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe("AvaliacaoFotosController", () => {
  it("getByIdReview retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.getByIdReview(mockRequest({ params: { id_review: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da avaliacao invalido." });
  });

  it("getByIdReview retorna 404 quando nao encontra fotos", async () => {
    const res = mockResponse();
    avaliacaoFotosModel.findAll.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.getByIdReview(mockRequest({ params: { id_review: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Foto da avaliacao nao encontrada." });
  });

  it("getByIdReview retorna 200 com lista vazia", async () => {
    const res = mockResponse();
    avaliacaoFotosModel.findAll.mockResolvedValueOnce([]);
    await AvaliacaoFotosController.getByIdReview(mockRequest({ params: { id_review: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 quando id_avaliacao_produto e invalido", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.create(mockRequest({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_avaliacao_produto invalido." });
  });

  it("create retorna 400 para id_avaliacao_produto invalido no body", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.create(mockRequest({ body: { id_avaliacao_produto: "x", fotos_upload: [] } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_avaliacao_produto invalido." });
  });

  it("create retorna 400 quando fotos_upload esta vazio", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.create(mockRequest({ body: { id_avaliacao_produto: 1, fotos_upload: [] } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "fotos_upload deve conter pelo menos uma foto." });
  });

  it("create retorna 404 quando a avaliacao de produto nao existe", async () => {
    const res = mockResponse();
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.create(
      mockRequest({
        body: { id_avaliacao_produto: 1, fotos_upload: [{ upload_index: 0, nome_original: "a.jpg", tipo_arquivo: "image/jpeg", tamanho_bytes: 10, arquivo_base64: Buffer.from("abc").toString("base64") }] },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Avaliacao de produto nao encontrada." });
  });

  it("create retorna 201 ao salvar varias fotos", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "avaliacao_fotos/a.jpg" });
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_avaliacao_produto: 1 }));
    avaliacaoFotosModel.create
      .mockResolvedValueOnce(foto)
      .mockResolvedValueOnce(buildModelInstance({ id_avaliacao_foto: 2, id_avaliacao_produto: 1, caminho_url: "avaliacao_fotos/b.jpg" }));
    await AvaliacaoFotosController.create(
      mockRequest({
        body: {
          id_avaliacao_produto: 1,
          fotos_upload: [
            { upload_index: 0, nome_original: "a.jpg", tipo_arquivo: "image/jpeg", tamanho_bytes: 10, arquivo_base64: Buffer.from("abc").toString("base64") },
            { upload_index: 1, nome_original: "b.png", tipo_arquivo: "image/png", tamanho_bytes: 10, arquivo_base64: Buffer.from("def").toString("base64") },
          ],
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(avaliacaoFotosModel.create).toHaveBeenCalledTimes(2);
  });

  it("update retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "x" }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da foto invalido." });
  });

  it("update retorna 404 quando a foto nao existe", async () => {
    const res = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Foto da avaliacao nao encontrada." });
  });

  it("update retorna 400 para id_avaliacao_produto invalido", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(foto);
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_avaliacao_produto: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "id_avaliacao_produto invalido." });
  });

  it("update retorna 404 quando a avaliacao informada nao existe", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(foto);
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_avaliacao_produto: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Avaliacao de produto nao encontrada." });
  });

  it("update retorna 400 para caminho_url invalido", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(foto);
    await AvaliacaoFotosController.update(
      mockRequest({ params: { id: "1" }, body: { foto_upload: { upload_index: 0, nome_original: "a.jpg", tipo_arquivo: "image/jpeg", tamanho_bytes: 10, arquivo_base64: "" } } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "caminho_url invalido." });
  });

  it("update retorna 200 com a foto atualizada", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1, id_avaliacao_produto: 1, caminho_url: "a.jpg" });
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(foto);
    avaliacaoProdutosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_avaliacao_produto: 1 }));
    await AvaliacaoFotosController.update(mockRequest({ params: { id: "1" }, body: { id_avaliacao_produto: 1, caminho_url: "b.jpg" } }), res);
    expect(foto.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(foto);
  });

  it("remove retorna 400 para id invalido", async () => {
    const res = mockResponse();
    await AvaliacaoFotosController.remove(mockRequest({ params: { id: "x" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ID da foto invalido." });
  });

  it("remove retorna 404 quando a foto nao existe", async () => {
    const res = mockResponse();
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(null);
    await AvaliacaoFotosController.remove(mockRequest({ params: { id: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Foto da avaliacao nao encontrada." });
  });

  it("remove retorna 204 quando exclui a foto", async () => {
    const res = mockResponse();
    const foto = buildModelInstance({ id_avaliacao_foto: 1 });
    avaliacaoFotosModel.findByPk.mockResolvedValueOnce(foto);
    await AvaliacaoFotosController.remove(mockRequest({ params: { id: "1" } }), res);
    expect(foto.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
