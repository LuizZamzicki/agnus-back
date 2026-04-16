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

type UsuariosModelMock = { findAndCountAll: jest.Mock; findByPk: jest.Mock; findOne: jest.Mock; create: jest.Mock };
type UsuarioContatosModelMock = { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
type UsuarioEnderecosModelMock = { findAll: jest.Mock; findByPk: jest.Mock; create: jest.Mock };
type UsuarioSenhasHistoricoModelMock = { findAll: jest.Mock; create: jest.Mock };
type Argon2Mock = { hash: jest.Mock; verify: jest.Mock };

const usuariosModel = Usuarios as typeof Usuarios & UsuariosModelMock;
const contatosModel = UsuarioContatos as typeof UsuarioContatos & UsuarioContatosModelMock;
const enderecosModel = UsuarioEnderecos as typeof UsuarioEnderecos & UsuarioEnderecosModelMock;
const historicoModel = UsuarioSenhasHistorico as typeof UsuarioSenhasHistorico & UsuarioSenhasHistoricoModelMock;
const argon2Mock = argon2 as typeof argon2 & Argon2Mock;

describe("UsuariosController", () => {
  it("findAll retorna usuarios paginados", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 1, nome: "A", email: "a@a.com", senha: "hash", tipo: "cliente" });
    usuariosModel.findAndCountAll.mockResolvedValueOnce({ count: 1, rows: [user] });
    await UsuariosController.findAll(mockRequest(), response);
    expect(response.json).toHaveBeenCalledWith({
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
  });

  it("getById retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuariosController.getById(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("getById retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.getById(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("getById retorna 200 com o usuario", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 1, nome: "A", email: "a@a.com", senha: "hash", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.getById(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("create retorna 400 para tipo invalido", async () => {
    const response = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A", cpf: "529.982.247-25", email: "a@a.com", senha: "123", tipo: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("create retorna 400 para cpf invalido", async () => {
    const response = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A", cpf: "111.111.111-11", email: "a@a.com", senha: "Senha123!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "cpf invalido." });
  });

  it("create retorna 400 para email invalido", async () => {
    const response = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A", cpf: "529.982.247-25", email: "aaa", senha: "Senha123!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "email invalido." });
  });

  it("create retorna 400 para senha fraca", async () => {
    const response = mockResponse();
    await UsuariosController.create(mockRequest({ body: { nome: "A", cpf: "529.982.247-25", email: "a@a.com", senha: "123Abc" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.",
      passwordStrength: evaluatePasswordStrength("123Abc"),
    });
  });

  it("create retorna 400 para email duplicado", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 1, nome: "A", email: "a@a.com", senha: "hash", tipo: "cliente" });
    usuariosModel.findOne.mockResolvedValueOnce(user);
    await UsuariosController.create(mockRequest({ body: { nome: "A", cpf: "529.982.247-25", email: "a@a.com", senha: "Senha123!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("create retorna 201 com o usuario criado", async () => {
    const response = mockResponse(), created = buildModelInstance({ id_usuario: 2, nome: "B", cpf: "529.982.247-25", email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findOne.mockResolvedValueOnce(null);
    argon2Mock.hash.mockResolvedValueOnce("hashed");
    usuariosModel.create.mockResolvedValueOnce(created);
    const historicoSpy = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    await UsuariosController.create(mockRequest({ body: { nome: "B", cpf: "529.982.247-25", email: "b@b.com", senha: "Senha123!" } }), response);
    expect(historicoSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(201);
    historicoSpy.mockRestore();
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuariosController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("remove retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.remove(mockRequest({ params: { id: "2" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it("remove retorna 204 quando exclui o usuario", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2 });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.remove(mockRequest({ params: { id: "2" } }), response);
    expect(user.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuariosController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("update retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("update retorna 400 para cpf invalido", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { cpf: "111.111.111-11" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "cpf invalido." });
  });

  it("update retorna 400 para email invalido", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { email: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "email invalido." });
  });

  it("update retorna 400 quando tenta alterar o email", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { email: "x@x.com" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "email nao pode ser alterado." });
  });

  it("update retorna 400 para tipo invalido", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { tipo: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("update retorna 400 para senha fraca", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: null, email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { senha: "abc123" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("update retorna 200 quando atualiza com senha", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: "529.982.247-25", email: "b@b.com", senha: "hash2", tipo: "cliente" });
    const historicoSpy = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    argon2Mock.hash.mockResolvedValueOnce("hash3");
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { cpf: "529.982.247-25", senha: "NovaSenha123!", tipo: "administrador" } }), response);
    expect(user.update).toHaveBeenCalled();
    expect(historicoSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    historicoSpy.mockRestore();
  });

  it("update retorna 200 quando atualiza sem senha", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, nome: "B", cpf: "529.982.247-25", email: "b@b.com", senha: "hash2", tipo: "cliente" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    await UsuariosController.update(mockRequest({ params: { id: "2" }, body: { nome: "C", cpf: "111.444.777-35" } }), response);
    expect(user.update).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("updatePassword retorna 400 sem corpo valido", async () => {
    const response = mockResponse();
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("updatePassword retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuariosController.updatePassword(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("updatePassword retorna 400 quando a confirmacao diverge", async () => {
    const response = mockResponse();
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "321", nova_senha: "Senha456!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("updatePassword retorna 400 para nova senha fraca", async () => {
    const response = mockResponse();
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "456" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.",
      passwordStrength: evaluatePasswordStrength("456"),
    });
  });

  it("updatePassword retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "Senha456!" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("updatePassword retorna 400 quando a senha atual e invalida", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, senha: "old" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(false);
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "Senha456!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("updatePassword retorna 400 quando a nova senha e igual a atual", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, senha: "old" });
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "Senha123!" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("updatePassword retorna 400 quando a nova senha ja foi usada", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, senha: "old" });
    const reusedSpy = jest.spyOn(UsuarioSenhasHistoricoController, "findByUserIdAndPassword").mockResolvedValueOnce(new Date("2026-01-01"));
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "Senha456!" } }), response);
    expect(reusedSpy).toHaveBeenCalledWith(2, "Senha456!");
    expect(response.status).toHaveBeenCalledWith(400);
    reusedSpy.mockRestore();
  });

  it("updatePassword retorna 204 quando atualiza a senha", async () => {
    const response = mockResponse(), user = buildModelInstance({ id_usuario: 2, senha: "old" });
    const historicoSpy = jest.spyOn(UsuarioSenhasHistoricoController, "create").mockResolvedValueOnce(true);
    const reusedSpy = jest.spyOn(UsuarioSenhasHistoricoController, "findByUserIdAndPassword").mockResolvedValueOnce(null);
    usuariosModel.findByPk.mockResolvedValueOnce(user);
    argon2Mock.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    argon2Mock.hash.mockResolvedValueOnce("hashN");
    await UsuariosController.updatePassword(mockRequest({ params: { id: "2" }, body: { senha_atual: "123", confirmacao_senha_atual: "123", nova_senha: "Senha456!" } }), response);
    expect(user.update).toHaveBeenCalled();
    expect(reusedSpy).toHaveBeenCalledWith(2, "Senha456!");
    expect(historicoSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
    reusedSpy.mockRestore();
    historicoSpy.mockRestore();
  });
});

describe("UsuarioEnderecosController", () => {
  it("getByIdUser retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.getByIdUser(mockRequest({ params: { id_user: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("getByIdUser retorna 404 quando nao encontra enderecos", async () => {
    const response = mockResponse();
    enderecosModel.findAll.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Endereco nao encontrado." });
  });

  it("getByIdUser retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    enderecosModel.findAll.mockResolvedValueOnce([]);
    await UsuarioEnderecosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario, cep e logradouro sao obrigatorios." });
  });

  it("create retorna 400 para id_usuario invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.create(mockRequest({ body: { id_usuario: "x", cep: "1", logradouro: "Rua" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario invalido." });
  });

  it("create retorna 400 para cep invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.create(mockRequest({ body: { id_usuario: 1, cep: " ", logradouro: "Rua" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "cep invalido." });
  });

  it("create retorna 400 para logradouro invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.create(mockRequest({ body: { id_usuario: 1, cep: "1", logradouro: " " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "logradouro invalido." });
  });

  it("create retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.create(mockRequest({ body: { id_usuario: 1, cep: "1", logradouro: "Rua" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("create retorna 201 com o endereco criado", async () => {
    const response = mockResponse(), endereco = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua" });
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    enderecosModel.create.mockResolvedValueOnce(endereco);
    await UsuarioEnderecosController.create(mockRequest({ body: { id_usuario: 1, cep: "1", logradouro: "Rua" } }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(enderecosModel.create).toHaveBeenCalledWith({
      id_usuario: 1,
      cep: "1",
      logradouro: "Rua",
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      pais: "Brasil",
      principal: false,
      ativo: true,
    });
    expect(response.send).toHaveBeenCalledWith(endereco);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do endereco invalido." });
  });

  it("update retorna 404 quando o endereco nao existe", async () => {
    const response = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Endereco nao encontrado." });
  });

  it("update retorna 404 quando o usuario informado nao existe", async () => {
    const response = mockResponse(), endereco = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua", numero: null, complemento: null, bairro: null, cidade: null, estado: null, pais: "Brasil", principal: false, ativo: true });
    enderecosModel.findByPk.mockResolvedValueOnce(endereco);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("update retorna 400 para cep invalido", async () => {
    const response = mockResponse(), endereco = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua", numero: null, complemento: null, bairro: null, cidade: null, estado: null, pais: "Brasil", principal: false, ativo: true });
    enderecosModel.findByPk.mockResolvedValueOnce(endereco);
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "1" }, body: { cep: " " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "cep invalido." });
  });

  it("update retorna 200 com o endereco atualizado", async () => {
    const response = mockResponse(), endereco = buildModelInstance({ id_usuario_endereco: 1, id_usuario: 1, cep: "1", logradouro: "Rua", numero: null, complemento: null, bairro: null, cidade: null, estado: null, pais: "Brasil", principal: false, ativo: true });
    enderecosModel.findByPk.mockResolvedValueOnce(endereco);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await UsuarioEnderecosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 1, principal: true } }), response);
    expect(endereco.update).toHaveBeenCalledWith({
      id_usuario: 1,
      cep: "1",
      logradouro: "Rua",
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      pais: "Brasil",
      principal: true,
      ativo: true,
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(endereco);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioEnderecosController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do endereco invalido." });
  });

  it("remove retorna 404 quando o endereco nao existe", async () => {
    const response = mockResponse();
    enderecosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioEnderecosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Endereco nao encontrado." });
  });

  it("remove retorna 204 quando exclui o endereco", async () => {
    const response = mockResponse(), endereco = buildModelInstance({ id_usuario_endereco: 1 });
    enderecosModel.findByPk.mockResolvedValueOnce(endereco);
    await UsuarioEnderecosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(endereco.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});

describe("UsuarioContatosController", () => {
  it("getByIdUser retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.getByIdUser(mockRequest({ params: { id_user: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do usuario invalido." });
  });

  it("getByIdUser retorna 404 quando nao encontra contatos", async () => {
    const response = mockResponse();
    contatosModel.findAll.mockResolvedValueOnce(null);
    await UsuarioContatosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Contato nao encontrado." });
  });

  it("getByIdUser retorna 200 com lista vazia", async () => {
    const response = mockResponse();
    contatosModel.findAll.mockResolvedValueOnce([]);
    await UsuarioContatosController.getByIdUser(mockRequest({ params: { id_user: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith([]);
  });

  it("create retorna 400 sem campos obrigatorios", async () => {
    const response = mockResponse();
    await UsuarioContatosController.create(mockRequest({ body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario e valor sao obrigatorios." });
  });

  it("create retorna 400 para id_usuario invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.create(mockRequest({ body: { id_usuario: "x", valor: "v", tipo: "email" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "id_usuario invalido." });
  });

  it("create retorna 400 para tipo invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.create(mockRequest({ body: { id_usuario: 1, valor: "v", tipo: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "tipo invalido." });
  });

  it("create retorna 400 para valor invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.create(mockRequest({ body: { id_usuario: 1, valor: "   ", tipo: "email" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "valor invalido." });
  });

  it("create retorna 404 quando o usuario nao existe", async () => {
    const response = mockResponse();
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.create(mockRequest({ body: { id_usuario: 1, valor: "v", tipo: "email" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("create retorna 201 com o contato criado", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    contatosModel.create.mockResolvedValueOnce(contato);
    await UsuarioContatosController.create(mockRequest({ body: { id_usuario: 1, valor: "a@a.com", tipo: "email" } }), response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(contatosModel.create).toHaveBeenCalledWith({ id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    expect(response.send).toHaveBeenCalledWith(contato);
  });

  it("update retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.update(mockRequest({ params: { id: "x" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do contato invalido." });
  });

  it("update retorna 404 quando o contato nao existe", async () => {
    const response = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: {} }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Contato nao encontrado." });
  });

  it("update retorna 404 quando o usuario informado nao existe", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    contatosModel.findByPk.mockResolvedValueOnce(contato);
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 2 } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Usuario nao encontrado." });
  });

  it("update retorna 400 para tipo invalido", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    contatosModel.findByPk.mockResolvedValueOnce(contato);
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: { tipo: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "tipo invalido." });
  });

  it("update retorna 400 para valor invalido", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    contatosModel.findByPk.mockResolvedValueOnce(contato);
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: { valor: "   " } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "valor invalido." });
  });

  it("update retorna 200 com o contato atualizado", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1, id_usuario: 1, tipo: "email", valor: "a@a.com", principal: false });
    contatosModel.findByPk.mockResolvedValueOnce(contato);
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 1 }));
    await UsuarioContatosController.update(mockRequest({ params: { id: "1" }, body: { id_usuario: 1, tipo: "celular", valor: "1199" } }), response);
    expect(contato.update).toHaveBeenCalledWith({ id_usuario: 1, tipo: "celular", valor: "1199", principal: false });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(contato);
  });

  it("remove retorna 400 para id invalido", async () => {
    const response = mockResponse();
    await UsuarioContatosController.remove(mockRequest({ params: { id: "x" } }), response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "ID do contato invalido." });
  });

  it("remove retorna 404 quando o contato nao existe", async () => {
    const response = mockResponse();
    contatosModel.findByPk.mockResolvedValueOnce(null);
    await UsuarioContatosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "Contato nao encontrado." });
  });

  it("remove retorna 204 quando exclui o contato", async () => {
    const response = mockResponse(), contato = buildModelInstance({ id_usuario_contato: 1 });
    contatosModel.findByPk.mockResolvedValueOnce(contato);
    await UsuarioContatosController.remove(mockRequest({ params: { id: "1" } }), response);
    expect(contato.destroy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});

describe("UsuarioSenhasHistoricoController", () => {
  it("findByUserIdAndPassword retorna data da senha encontrada", async () => {
    historicoModel.findAll.mockResolvedValueOnce([
      { senha: "h1", data_criacao: new Date("2026-01-01") },
      { senha: "h2", data_criacao: new Date("2026-01-02") },
    ]);
    argon2Mock.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(UsuarioSenhasHistoricoController.findByUserIdAndPassword(1, "abc")).resolves.toEqual(new Date("2026-01-02"));
  });

  it("findByPasswordHash retorna null quando nao encontra usuario", async () => {
    usuariosModel.findOne.mockResolvedValueOnce(null);
    await expect(UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "x")).resolves.toBeNull();
  });

  it("findByPasswordHash retorna data quando encontra historico", async () => {
    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com" });
    usuariosModel.findOne.mockResolvedValueOnce(user);
    historicoModel.findAll.mockResolvedValueOnce([
      { senha: "h1", data_criacao: new Date("2026-01-01") },
      { senha: "h2", data_criacao: new Date("2026-01-02") },
    ]);
    argon2Mock.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "abc")).resolves.toEqual(new Date("2026-01-02"));
  });

  it("findByPasswordHash retorna null quando nenhuma senha bate", async () => {
    const user = buildModelInstance({ id_usuario: 1, email: "a@a.com" });
    usuariosModel.findOne.mockResolvedValueOnce(user);
    historicoModel.findAll.mockResolvedValueOnce([{ senha: "h1", data_criacao: new Date("2026-01-03") }]);
    argon2Mock.verify.mockResolvedValueOnce(false);
    await expect(UsuarioSenhasHistoricoController.findByPasswordHash("a@a.com", "nope")).resolves.toBeNull();
  });

  it("create retorna false quando o usuario nao existe", async () => {
    usuariosModel.findByPk.mockResolvedValueOnce(null);
    await expect(UsuarioSenhasHistoricoController.create(10, "hash")).resolves.toBe(false);
  });

  it("create retorna true quando salva no historico", async () => {
    usuariosModel.findByPk.mockResolvedValueOnce(buildModelInstance({ id_usuario: 10 }));
    historicoModel.create.mockResolvedValueOnce(buildModelInstance({ id_usuario: 10 }));
    await expect(UsuarioSenhasHistoricoController.create(10, "hash")).resolves.toBe(true);
  });
});
