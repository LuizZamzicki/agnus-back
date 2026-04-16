import { Request, Response } from "express";
import argon2 from "argon2";
import Usuarios from "../models/Usuarios";
import type {
  UsuarioBody,
  UsuarioModelData,
  UsuarioPasswordBody,
  UsuarioPublicData,
  UsuarioRouteParams,
  UsuarioUpdateData,
  UserRole,
} from "../types/user.types";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";
import { evaluatePasswordStrength } from "../utils/passwordStrength";
import { isValidCpf, isValidEmail } from "../utils/userValidation";
import UsuarioSenhasHistoricoController from "./usuarioSenhasHistorico.controller";

type UsuarioRequest = Request<UsuarioRouteParams, object, UsuarioBody>;
type UsuarioPasswordRequest = Request<UsuarioRouteParams, object, UsuarioPasswordBody>;
type PasswordValidationError = { message: string; passwordStrength: ReturnType<typeof evaluatePasswordStrength> };

class UsuarioPayload {
  constructor(private readonly body: UsuarioBody) {}

  private parseText(value: string | null | undefined) { return typeof value === "string" ? value.trim() || null : null; }
  get nome() { return this.parseText(this.body.nome); }
  get cpf() { return this.parseText(this.body.cpf); }
  get email() { return this.parseText(this.body.email); }
  get senha() { return this.parseText(this.body.senha); }
  get tipo() { return UsuariosController.normalizeRole(this.body.tipo) ?? "cliente"; }
  hasNomeField() { return this.body.nome !== undefined; }
  hasCpfField() { return this.body.cpf !== undefined; }
  hasEmailField() { return this.body.email !== undefined; }
  hasSenhaField() { return this.body.senha !== undefined; }
  hasTipoField() { return this.body.tipo !== undefined; }
  hasValidTipo() { return this.body.tipo === undefined || UsuariosController.normalizeRole(this.body.tipo) !== null; }
}

class UsuarioPasswordPayload {
  constructor(private readonly body: UsuarioPasswordBody) {}

  private parseText(value: string | null | undefined) { return typeof value === "string" ? value.trim() || null : null; }
  get senhaAtual() { return this.parseText(this.body.senha_atual ?? this.body.senhaAtual); }
  get confirmacaoSenhaAtual() { return this.parseText(this.body.confirmacao_senha_atual ?? this.body.confirmacaoSenhaAtual); }
  get novaSenha() { return this.parseText(this.body.nova_senha ?? this.body.novaSenha); }
}

class UsuariosController {
  private static readonly PASSWORD_MESSAGE = "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.";

  static parsePositiveId(value: string | undefined) {
    const userId = Number(value);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  static normalizeRole(value: UsuarioBody["tipo"]) {
    return value === "cliente" || value === "administrador" ? value : null;
  }

  private static sanitizeUser(user: Usuarios): UsuarioPublicData {
    const userData: UsuarioModelData = { id_usuario: user.id_usuario, nome: user.nome, cpf: user.cpf, email: user.email, senha: user.senha, google_id: user.google_id, tipo: user.tipo, data_criacao: user.data_criacao, data_alteracao: user.data_alteracao };
    const { senha: _senha, ...publicUser } = userData;
    return publicUser;
  }

  private static async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  private static getPasswordError(password: string): PasswordValidationError | null {
    const passwordStrength = evaluatePasswordStrength(password);
    return passwordStrength.isValid ? null : { message: UsuariosController.PASSWORD_MESSAGE, passwordStrength };
  }

  private static getCpfMessage(payload: UsuarioPayload) {
    if (!payload.hasCpfField() || !payload.cpf) return payload.hasCpfField() ? "cpf invalido." : null;
    return isValidCpf(payload.cpf) ? null : "cpf invalido.";
  }

  private static getEmailMessage(email?: string | null) {
    return email && isValidEmail(email) ? null : "email invalido.";
  }

  private static getEmailUpdateMessage(payload: UsuarioPayload, currentEmail: string) {
    if (!payload.hasEmailField() || !payload.email) return payload.hasEmailField() ? "email invalido." : null;
    if (!isValidEmail(payload.email)) return "email invalido.";
    return payload.email === currentEmail ? null : "email nao pode ser alterado.";
  }

  private static getCreateErrorMessage(payload: UsuarioPayload) {
    if (!payload.nome || !payload.cpf || !payload.email || !payload.senha) return "Nome, cpf, email e senha sao obrigatorios.";
    if (UsuariosController.getCpfMessage(payload)) return UsuariosController.getCpfMessage(payload);
    if (UsuariosController.getEmailMessage(payload.email)) return UsuariosController.getEmailMessage(payload.email);
    if (!payload.hasValidTipo()) return "Tipo deve ser cliente ou administrador.";
    return null;
  }

  private static getUpdateErrorMessage(payload: UsuarioPayload, currentEmail: string) {
    if (payload.hasNomeField() && !payload.nome) return "nome invalido.";
    if (payload.hasSenhaField() && !payload.senha) return "senha invalida.";
    if (UsuariosController.getCpfMessage(payload)) return UsuariosController.getCpfMessage(payload);
    if (UsuariosController.getEmailUpdateMessage(payload, currentEmail)) return UsuariosController.getEmailUpdateMessage(payload, currentEmail);
    if (!payload.hasValidTipo()) return "Tipo deve ser cliente ou administrador.";
    return null;
  }

  private static buildUpdateData(user: Usuarios, payload: UsuarioPayload, passwordHash: string): UsuarioUpdateData {
    return { nome: payload.nome ?? user.nome, cpf: payload.hasCpfField() ? payload.cpf : user.cpf, email: user.email, senha: passwordHash, tipo: payload.hasTipoField() ? payload.tipo : user.tipo };
  }

  private static async findDuplicateEmailMessage(email: string) {
    return (await Usuarios.findOne({ where: { email } })) ? "Usuario ja existe com esse email!" : null;
  }

  private static getPasswordBodyMessage(payload: UsuarioPasswordPayload) {
    if (!payload.senhaAtual || !payload.confirmacaoSenhaAtual || !payload.novaSenha) return "Senha atual, confirmacao da senha atual e nova senha sao obrigatorias.";
    if (payload.senhaAtual !== payload.confirmacaoSenhaAtual) return "As duas informacoes da senha atual devem ser iguais.";
    return null;
  }

  private static async getCurrentPasswordMessage(user: Usuarios, payload: UsuarioPasswordPayload) {
    if (!(await argon2.verify(user.senha, payload.senhaAtual!))) return "Senha atual invalida.";
    return await argon2.verify(user.senha, payload.novaSenha!) ? "A nova senha nao pode ser igual a senha atual." : null;
  }

  private static async updateStoredPassword(user: Usuarios, newPassword: string, res: Response) {
    if (await UsuarioSenhasHistoricoController.findByUserIdAndPassword(user.id_usuario, newPassword)) return res.status(400).json({ message: "A nova senha ja foi utilizada anteriormente." });
    const passwordHash = await UsuariosController.hashPassword(newPassword);
    await user.update({ senha: passwordHash });
    await UsuarioSenhasHistoricoController.create(user.id_usuario, passwordHash);
    return res.status(204).send();
  }

  static async findAll(req: Request, res: Response) {
    const pagination = parsePagination(req.query);
    if (!pagination) return res.status(400).json({ message: "page e limit devem ser inteiros positivos." });
    const { count, rows } = await Usuarios.findAndCountAll({ limit: pagination.limit, offset: pagination.offset, order: [["id_usuario", "ASC"]] });
    return res.status(200).json({ data: rows.map((user) => UsuariosController.sanitizeUser(user)), pagination: buildPaginationMeta(pagination.page, pagination.limit, count) });
  }

  static async getById(req: UsuarioRequest, res: Response) {
    const userId = UsuariosController.parsePositiveId(req.params.id);
    if (!userId) return res.status(400).json({ message: "ID do usuario invalido." });
    const user = await Usuarios.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario nao encontrado." });
    return res.status(200).send(UsuariosController.sanitizeUser(user));
  }

  static async create(req: UsuarioRequest, res: Response) {
    const payload = new UsuarioPayload(req.body), message = UsuariosController.getCreateErrorMessage(payload);
    if (message) return res.status(400).json({ message });
    const passwordError = UsuariosController.getPasswordError(payload.senha!);
    if (passwordError) return res.status(400).json(passwordError);
    const duplicateMessage = await UsuariosController.findDuplicateEmailMessage(payload.email!);
    if (duplicateMessage) return res.status(400).json({ message: duplicateMessage });
    const passwordHash = await UsuariosController.hashPassword(payload.senha!), user = await Usuarios.create({ nome: payload.nome!, cpf: payload.cpf, email: payload.email!, senha: passwordHash, tipo: payload.tipo });
    await UsuarioSenhasHistoricoController.create(user.id_usuario, passwordHash);
    return res.status(201).send(UsuariosController.sanitizeUser(user));
  }

  static async remove(req: UsuarioRequest, res: Response) {
    const userId = UsuariosController.parsePositiveId(req.params.id);
    if (!userId) return res.status(400).json({ message: "ID do usuario invalido." });
    const user = await Usuarios.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario nao encontrado." });
    await user.destroy();
    return res.status(204).send();
  }

  static async update(req: UsuarioRequest, res: Response) {
    const userId = UsuariosController.parsePositiveId(req.params.id), payload = new UsuarioPayload(req.body);
    if (!userId) return res.status(400).json({ message: "ID do usuario invalido." });
    const user = await Usuarios.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario nao encontrado." });
    const message = UsuariosController.getUpdateErrorMessage(payload, user.email), passwordError = payload.senha ? UsuariosController.getPasswordError(payload.senha) : null;
    if (message) return res.status(400).json({ message });
    if (passwordError) return res.status(400).json(passwordError);
    const passwordHash = payload.senha ? await UsuariosController.hashPassword(payload.senha) : user.senha;
    if (payload.senha) await UsuarioSenhasHistoricoController.create(user.id_usuario, passwordHash);
    await user.update(UsuariosController.buildUpdateData(user, payload, passwordHash));
    return res.status(200).send(UsuariosController.sanitizeUser(user));
  }

  static async updatePassword(req: UsuarioPasswordRequest, res: Response) {
    const userId = UsuariosController.parsePositiveId(req.params.id), payload = new UsuarioPasswordPayload(req.body);
    if (!userId) return res.status(400).json({ message: "ID do usuario invalido." });
    const bodyMessage = UsuariosController.getPasswordBodyMessage(payload), passwordError = payload.novaSenha ? UsuariosController.getPasswordError(payload.novaSenha) : null;
    if (bodyMessage) return res.status(400).json({ message: bodyMessage });
    if (passwordError) return res.status(400).json(passwordError);
    const user = await Usuarios.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuario nao encontrado." });
    const currentPasswordMessage = await UsuariosController.getCurrentPasswordMessage(user, payload);
    if (currentPasswordMessage) return res.status(400).json({ message: currentPasswordMessage });
    return UsuariosController.updateStoredPassword(user, payload.novaSenha!, res);
  }
}

export default UsuariosController;
