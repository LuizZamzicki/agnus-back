import argon2 from "argon2";
import UsuarioContatosController from "../../src/controllers/usuarioContatos.controller";
import UsuarioEnderecosController from "../../src/controllers/usuarioEnderecos.controller";
import UsuarioSenhasHistoricoController from "../../src/controllers/usuarioSenhasHistorico.controller";
import UsuariosController from "../../src/controllers/usuarios.controller";
import UsuarioContatos from "../../src/models/UsuarioContatos";
import UsuarioEnderecos from "../../src/models/UsuarioEnderecos";
import UsuarioSenhasHistorico from "../../src/models/UsuarioSenhasHistorico";
import Usuarios from "../../src/models/Usuarios";
import { evaluatePasswordStrength } from "../../src/utils/passwordStrength";
import { buildModelInstance, mockRequest, mockResponse } from "../helpers/http";

jest.mock("argon2", () => ({
  __esModule: true,
  default: {
    argon2id: 2,
    hash: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock("../../src/models/UsuarioContatos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/UsuarioEnderecos", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/UsuarioSenhasHistorico", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/models/Usuarios", () => ({
  __esModule: true,
  default: { findAndCountAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));

const usuariosModel = Usuarios as unknown as {
  findAndCountAll: jest.Mock;
  findByPk: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
};
const contatosModel = UsuarioContatos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const enderecosModel = UsuarioEnderecos as unknown as { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
const historicoModel = UsuarioSenhasHistorico as unknown as { findAll: jest.Mock; create: jest.Mock };
const argon2Mock = argon2 as unknown as { hash: jest.Mock; verify: jest.Mock };

describe("UsuariosController", () => {
  it("findAll/getById/create/update/remove/updatePassword", async () => {
    const user = buildModelInstance({ id_usuario: 1, nome: "A", email: "a@a.com", senha: "hash", tipo: "cliente" });

    usuariosModel.findAndCountAll.mockResolvedValueOnce({ count: 1, rows: [user] });
    const resFind = mockResponse();
    await UsuariosController.findAll(mockRequest(), resFind);
    expect(resFind.json).toHaveBeenCalledWith({
      data: [{ id_usuario: 1, nome: "A", email: "a@a.com", tipo: "cliente" }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const resGet404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.getById(mockRequest({ params: { id: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet200 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.getById(mockRequest({ params: { id: "1" } }), resGet200);
    expect(resGet200.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A" } }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreateTipoBad = mockResponse();
    await UsuariosController.create(
      mockRequest({ body: { nome: "A", email: "a@a.com", senha: "123", tipo: "x" } }),
      resCreateTipoBad,
    );
    expect(resCreateTipoBad.status).toHaveBeenCalledWith(400);

    const resCreateWeakPass = mockResponse();
    await UsuariosController.create(
      mockRequest({ body: { nome: "A", email: "a@a.com", senha: "123Abc" } }),
      resCreateWeakPass,
    );
    expect(resCreateWeakPass.status).toHaveBeenCalledWith(400);
    expect(resCreateWeakPass.json).toHaveBeenCalledWith({
      message:
        "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.",
      passwordStrength: evaluatePasswordStrength("123Abc"),
    });

    const resCreateDup = mockResponse();
    usuariosModel.findOne.mockResolvedValueOnce(user);
    await UsuariosController.create(
      mockRequest({ body: { nome: "A", email: "a@a.com", senha: "Senha123!" } }),
      resCreateDup,
    );
    expect(resCreateDup.status).toHaveBeenCalledWith(400);

    const created = buildModelInstance({ id_usuario: 2, nome: "B", email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resCreate201 = mockResponse();
    usuariosModel.findOne.mockResolvedValueOnce(null);
    argon2Mock.hash.mockResolvedValueOnce("hashed");
    usuariosModel.create.mockResolvedValueOnce(created);
    const historicoSpy = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    await UsuariosController.create(
      mockRequest({ body: { nome: "B", email: "b@b.com", senha: "Senha123!" } }),
      resCreate201,
    );
    expect(historicoSpy).toHaveBeenCalled();
    expect(resCreate201.status).toHaveBeenCalledWith(201);
    historicoSpy.mockRestore();

    const resRemove404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.remove(mockRequest({ params: { id: "2" } }), resRemove404);
    expect(resRemove404.status).toHaveBeenCalledWith(404);

    const resRemove204 = mockResponse();
    const userRemove = buildModelInstance({ id_usuario: 2 });
    usuariosModel.findByPk.mockResolvedValueOnce(userRemove);
    await UsuariosController.remove(mockRequest({ params: { id: "2" } }), resRemove204);
    expect(userRemove.destroy).toHaveBeenCalled();
    expect(resRemove204.status).toHaveBeenCalledWith(204);

    const resUpdate404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: {} }), resUpdate404);
    expect(resUpdate404.status).toHaveBeenCalledWith(404);

    const userUpdate = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resUpdateDup = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userUpdate);
    usuariosModel.findOne.mockResolvedValueOnce(buildModelInstance({ id_usuario: 9 }));
    await UsuariosController.update(
      mockRequest({ params: { id: "2" }, body: { email: "x@x.com" } }),
      resUpdateDup,
    );
    expect(resUpdateDup.status).toHaveBeenCalledWith(400);

    const userUpdate2 = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resUpdateTipoBad = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userUpdate2);
    await UsuariosController.update(
      mockRequest({ params: { id: "2" }, body: { tipo: "x" } }),
      resUpdateTipoBad,
    );
    expect(resUpdateTipoBad.status).toHaveBeenCalledWith(400);

    const userUpdateWeakPass = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resUpdateWeakPass = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userUpdateWeakPass);
    await UsuariosController.update(
      mockRequest({ params: { id: "2" }, body: { senha: "abc123" } }),
      resUpdateWeakPass,
    );
    expect(resUpdateWeakPass.status).toHaveBeenCalledWith(400);

    const userUpdate3 = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resUpdate200 = mockResponse();
    const historicoSpy2 = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    usuariosModel.findByPk.mockResolvedValueOnce(userUpdate3);
    usuariosModel.findOne.mockResolvedValueOnce(null);
    argon2Mock.hash.mockResolvedValueOnce("hash3");
    await UsuariosController.update(
      mockRequest({ params: { id: "2" }, body: { email: "new@new.com", senha: "NovaSenha123!", tipo: "administrador" } }),
      resUpdate200,
    );
    expect(userUpdate3.update).toHaveBeenCalled();
    expect(historicoSpy2).toHaveBeenCalled();
    expect(resUpdate200.status).toHaveBeenCalledWith(200);
    historicoSpy2.mockRestore();

    const userUpdate4 = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const resUpdateNoPass = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userUpdate4);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { nome: "C" } }), resUpdateNoPass);
    expect(userUpdate4.update).toHaveBeenCalled();
    expect(resUpdateNoPass.status).toHaveBeenCalledWith(200);

    const resPassBad = mockResponse();
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: {} }), resPassBad);
    expect(resPassBad.status).toHaveBeenCalledWith(400);

    const resPassMismatch = mockResponse();
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "321",
          nova_senha: "Senha456!",
        },
      }),
      resPassMismatch,
    );
    expect(resPassMismatch.status).toHaveBeenCalledWith(400);

    const resPassWeak = mockResponse();
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "456",
        },
      }),
      resPassWeak,
    );
    expect(resPassWeak.status).toHaveBeenCalledWith(400);
    expect(resPassWeak.json).toHaveBeenCalledWith({
      message:
        "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.",
      passwordStrength: evaluatePasswordStrength("456"),
    });

    const resPass404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "Senha456!",
        },
      }),
      resPass404,
    );
    expect(resPass404.status).toHaveBeenCalledWith(404);

    const userPassInvalid = buildModelInstance({ id_usuario: 2, senha: "old" });
    const resPassInvalid = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userPassInvalid);
    argon2Mock.verify.mockResolvedValueOnce(false);
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "Senha456!",
        },
      }),
      resPassInvalid,
    );
    expect(resPassInvalid.status).toHaveBeenCalledWith(400);

    const userPassSame = buildModelInstance({ id_usuario: 2, senha: "old" });
    const resPassSame = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(userPassSame);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "Senha123!",
        },
      }),
      resPassSame,
    );
    expect(resPassSame.status).toHaveBeenCalledWith(400);

    const userPassUsed = buildModelInstance({ id_usuario: 2, senha: "old" });
    const resPassUsed = mockResponse();
    const reusedSpy = jest
      .spyOn(UsuarioSenhasHistoricoController, "findByUserIdAndPassword")
      .mockResolvedValueOnce(new Date("2026-01-01"));
    usuariosModel.findByPk.mockResolvedValueOnce(userPassUsed);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "Senha456!",
        },
      }),
      resPassUsed,
    );
    expect(reusedSpy).toHaveBeenCalledWith(2, "Senha456!");
    expect(resPassUsed.status).toHaveBeenCalledWith(400);
    reusedSpy.mockRestore();

    const userPass = buildModelInstance({ id_usuario: 2, senha: "old" });
    const resPass204 = mockResponse();
    const historicoSpy3 = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    const reusedSpy2 = jest
      .spyOn(UsuarioSenhasHistoricoController, "findByUserIdAndPassword")
      .mockResolvedValueOnce(null);
    usuariosModel.findByPk.mockResolvedValueOnce(userPass);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    argon2Mock.hash.mockResolvedValueOnce("hashN");
    await UsuariosController.updatePassword(
      mockRequest({
        params: { id: "2" },
        body: {
          senha_atual: "123",
          confirmacao_senha_atual: "123",
          nova_senha: "Senha456!",
        },
      }),
      resPass204,
    );
    expect(userPass.update).toHaveBeenCalled();
    expect(reusedSpy2).toHaveBeenCalledWith(2, "Senha456!");
    expect(historicoSpy3).toHaveBeenCalled();
    expect(resPass204.status).toHaveBeenCalledWith(204);
    reusedSpy2.mockRestore();
    historicoSpy3.mockRestore();
  });
});

describe("UsuarioEnderecosController e UsuarioContatosController", () => {
  it("enderecos CRUD", async () => {
    const resGet404 = mockResponse();
    enderecosModel.findAll.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    enderecosModel.findAll.mockResolvedValueOnce([]);
    await UsuarioEnderecosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await UsuarioEnderecosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreate404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.create(
      mockRequest({ body: { id_usuario: 1, cep: "1", logradouro: "Rua" } }),
      resCreate404,
    );
    expect(resCreate404.status).toHaveBeenCalledWith(404);

    const endereco = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua" });
    const resCreate201 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.create.mockResolvedValueOnce(endereco);
    await UsuarioEnderecosController.create(
      mockRequest({ body: { id_usuario: 1, cep: "1", logradouro: "Rua" } }),
      resCreate201,
    );
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const enderecoUp = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua", numero: null, complemento: null, bairro: null, cidade: null, estado: null, pais: "Brasil", principal: false, ativo: true });
    const resUpUser404 = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(enderecoUp);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }),
      resUpUser404,
    );
    expect(resUpUser404.status).toHaveBeenCalledWith(404);

    const enderecoUp2 = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua", numero: null, complemento: null, bairro: null, cidade: null, estado: null, pais: "Brasil", principal: false, ativo: true });
    const resUp200 = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(enderecoUp2);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await UsuarioEnderecosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 1, principal: true } }),
      resUp200,
    );
    expect(enderecoUp2.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const enderecoDel = buildModelInstance({ id_usuario_endereco: 1 });
    const resDel204 = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(enderecoDel);
    await UsuarioEnderecosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(enderecoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });

  it("contatos CRUD", async () => {
    const resGet404 = mockResponse();
    contatosModel.findAll.mockResolvedValueOnce(null);
    await UsuarioContatosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), resGet404);
    expect(resGet404.status).toHaveBeenCalledWith(404);

    const resGet = mockResponse();
    contatosModel.findAll.mockResolvedValueOnce([]);
    await UsuarioContatosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);

    const resCreateBad = mockResponse();
    await UsuarioContatosController.create(mockRequest({ body: {} }), resCreateBad);
    expect(resCreateBad.status).toHaveBeenCalledWith(400);

    const resCreateTipoBad = mockResponse();
    await UsuarioContatosController.create(
      mockRequest({ body: { id_usuario: 1, valor: "v", tipo: "x" } }),
      resCreateTipoBad,
    );
    expect(resCreateTipoBad.status).toHaveBeenCalledWith(400);

    const resCreateUser404 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.create(
      mockRequest({ body: { id_usuario: 1, valor: "v", tipo: "email" } }),
      resCreateUser404,
    );
    expect(resCreateUser404.status).toHaveBeenCalledWith(404);

    const contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    const resCreate201 = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    contatosModel.create.mockResolvedValueOnce(contato);
    await UsuarioContatosController.create(
      mockRequest({ body: { id_usuario: 1, valor: "a@a.com", tipo: "email" } }),
      resCreate201,
    );
    expect(resCreate201.status).toHaveBeenCalledWith(201);

    const resUp404 = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: {} }), resUp404);
    expect(resUp404.status).toHaveBeenCalledWith(404);

    const contatoUp = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    const resUpUser404 = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(contatoUp);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }),
      resUpUser404,
    );
    expect(resUpUser404.status).toHaveBeenCalledWith(404);

    const contatoUp2 = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    const resUpTipoBad = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(contatoUp2);
    await UsuarioContatosController.update(
      mockRequest({ params: { id: "1" }, body: { tipo: "x" } }),
      resUpTipoBad,
    );
    expect(resUpTipoBad.status).toHaveBeenCalledWith(400);

    const contatoUp3 = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    const resUp200 = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(contatoUp3);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await UsuarioContatosController.update(
      mockRequest({ params: { id: "1" }, body: { id_usuario: 1, tipo: "celular", valor: "1199" } }),
      resUp200,
    );
    expect(contatoUp3.update).toHaveBeenCalled();
    expect(resUp200.status).toHaveBeenCalledWith(200);

    const resDel404 = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.remove(mockRequest({ params: { id: "1" } }), resDel404);
    expect(resDel404.status).toHaveBeenCalledWith(404);

    const contatoDel = buildModelInstance({ id_usuario_contato: 1 });
    const resDel204 = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(contatoDel);
    await UsuarioContatosController.remove(mockRequest({ params: { id: "1" } }), resDel204);
    expect(contatoDel.destroy).toHaveBeenCalled();
    expect(resDel204.status).toHaveBeenCalledWith(204);
  });
});

describe("UsuarioSenhasHistoricoController", () => {
  it("findByPasswordHash cobre fluxos e create cobre true/false", async () => {
    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com" });

    historicoModel.findAll.mockResolvedValueOnce([
      { senha: "h1", data_criacao: new Date("2026-01-01") },
      { senha: "h2", data_criacao: new Date("2026-01-02") },
    ]);
    argon2Mock.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const foundByUserId = await UsuarioSenhasHistoricoController.findByUserIdAndPassword(1, "abc");
    expect(foundByUserId).toEqual(new Date("2026-01-02"));

    usuariosModel.findOne.mockResolvedValueOnce(null);
    const notFound = await UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "x");
    expect(notFound).toBeNull();

    usuariosModel.findOne.mockResolvedValueOnce(user);
    historicoModel.findAll.mockResolvedValueOnce([
      { senha: "h1", data_criacao: new Date("2026-01-01") },
      { senha: "h2", data_criacao: new Date("2026-01-02") },
    ]);
    argon2Mock.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const foundDate = await UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "abc");
    expect(foundDate).toEqual(new Date("2026-01-02"));

    usuariosModel.findOne.mockResolvedValueOnce(user);
    historicoModel.findAll.mockResolvedValueOnce([{ senha: "h1", data_criacao: new Date("2026-01-03") }]);
    argon2Mock.verify.mockResolvedValueOnce(false);
    const notMatched = await UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "nope");
    expect(notMatched).toBeNull();

    usuariosModel.findByPk.mockResolvedValueOnce(null);
    const createdFalse = await UsuarioSenhasHistoricoController.create(10, "hash");
    expect(createdFalse).toBe(false);

    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 10 }));
    historicoModel.create.mockResolvedValueOnce(buildModelInstance({ id_usuario: 10 }));
    const createdTrue = await UsuarioSenhasHistoricoController.create(10, "hash");
    expect(createdTrue).toBe(true);
  });
});
