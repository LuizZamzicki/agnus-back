import { Request, Response } from "express";
import argon2 from "argon2";
import User from "../models/Usuarios";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";
import { evaluatePasswordStrength } from "../utils/passwordStrength";
import UsuarioSenhasHistoricoController from "./usuarioSenhasHistorico.controller";

class UsuariosController {
  private static async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  private static getUserId(user: any) {
    const rawUserId = typeof user?.get === "function" ? user.get("id_usuario") : user?.id_usuario;
    return Number(rawUserId);
  }

  private static sanitizeUser(user: any) {
    const userData = user.toJSON();
    delete userData.senha;
    return userData;
  }

  private static validatePasswordOrRespond(password: string, res: Response) {
    const passwordStrength = evaluatePasswordStrength(password);
    if (passwordStrength.isValid) return null;

    return res.status(400).json({
      message: "Senha fraca. Ela deve ter pelo menos 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.",
      passwordStrength,
    });
  }

  static async findAll(req: Request, res: Response) {
    const pagination = parsePagination(req.query);
    if (!pagination) return res.status(400).json({ message: "page e limit devem ser inteiros positivos." });

    const { count, rows } = await User.findAndCountAll({
      limit: pagination.limit,
      offset: pagination.offset,
      order: [["id_usuario", "ASC"]],
    });
    const data = rows.map((user) => UsuariosController.sanitizeUser(user));
    return res.status(200).json({
      data,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, count),
    });
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const user = await User.findByPk(Number(id));

    if (!user) {
      return res.status(404).json({ messsage: "Usuário não encontrado" });
    }

    return res.status(200).send(UsuariosController.sanitizeUser(user));
  }

  static async create(req: Request, res: Response) {
    const { nome, cpf = null, email, senha, tipo = "cliente" } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios!" });
    }

    if (tipo !== "cliente" && tipo !== "administrador") {
      return res.status(400).json({ message: "Tipo deve ser cliente ou administrador." });
    }

    const invalidPasswordResponse = UsuariosController.validatePasswordOrRespond(senha, res);
    if (invalidPasswordResponse) return invalidPasswordResponse;

    const savedUser = await User.findOne({ where: { email } });
    if (savedUser) {
      return res.status(400).json({ message: "Usuário já existe com esse email!" });
    }

    const hashedPassword = await UsuariosController.hashPassword(senha);
    const user = await User.create({ nome, cpf, email, senha: hashedPassword, tipo });
    await UsuarioSenhasHistoricoController.create(UsuariosController.getUserId(user), hashedPassword);
    return res.status(201).send(UsuariosController.sanitizeUser(user));
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const user = await User.findByPk(Number(id));

    if (!user) {
      return res.status(404).json({ messsage: "Usuário não encontrado" });
    }

    await user.destroy();
    return res.status(204).send();
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { nome, cpf, email, senha, tipo } = req.body;

    const user = await User.findByPk(Number(id));
    if (!user) {
      return res.status(404).json({ messsage: "Usuário não encontrado" });
    }

    if (email && email !== user.get("email")) {
      const duplicatedEmail = await User.findOne({ where: { email } });
      if (duplicatedEmail) {
        return res.status(400).json({ message: "Usuário já existe com esse email!" });
      }
    }

    if (tipo && tipo !== "cliente" && tipo !== "administrador") {
      return res.status(400).json({ message: "Tipo deve ser cliente ou administrador." });
    }

    if (senha != null) {
      const invalidPasswordResponse = UsuariosController.validatePasswordOrRespond(senha, res);
      if (invalidPasswordResponse) return invalidPasswordResponse;
    }

    const updatedSenha = senha
      ? await UsuariosController.hashPassword(senha)
      : user.get("senha");

    if (senha != null) {
      await UsuarioSenhasHistoricoController.create(UsuariosController.getUserId(user), updatedSenha);
    }

    await user.update({
      nome: nome ?? user.get("nome"),
      cpf: cpf !== undefined ? cpf : user.get("cpf"),
      email: email ?? user.get("email"),
      senha: updatedSenha,
      tipo: tipo ?? user.get("tipo"),
    });

    return res.status(200).send(UsuariosController.sanitizeUser(user));
  }

  static async updatePassword(req: Request, res: Response) {
    const { id } = req.params;
    const senhaAtual = req.body.senha_atual ?? req.body.senhaAtual;
    const confirmacaoSenhaAtual =
      req.body.confirmacao_senha_atual ?? req.body.confirmacaoSenhaAtual;
    const novaSenha = req.body.nova_senha ?? req.body.novaSenha;

    if (!senhaAtual || !confirmacaoSenhaAtual || !novaSenha) {
      return res.status(400).json({
        message: "Senha atual, confirmacao da senha atual e nova senha sao obrigatorias.",
      });
    }

    if (senhaAtual !== confirmacaoSenhaAtual) {
      return res.status(400).json({
        message: "As duas informacoes da senha atual devem ser iguais.",
      });
    }

    const invalidPasswordResponse = UsuariosController.validatePasswordOrRespond(novaSenha, res);
    if (invalidPasswordResponse) return invalidPasswordResponse;

    const user = await User.findByPk(Number(id));
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const senhaAtualHash = String(user.get("senha"));
    const senhaAtualValida = await argon2.verify(senhaAtualHash, senhaAtual);
    if (!senhaAtualValida) {
      return res.status(400).json({ message: "Senha atual invalida." });
    }

    const novaSenhaJaEhAtual = await argon2.verify(senhaAtualHash, novaSenha);
    if (novaSenhaJaEhAtual) {
      return res.status(400).json({
        message: "A nova senha nao pode ser igual a senha atual.",
      });
    }

    const senhaJaUsada = await UsuarioSenhasHistoricoController.findByUserIdAndPassword(
      UsuariosController.getUserId(user),
      novaSenha,
    );
    if (senhaJaUsada) {
      return res.status(400).json({
        message: "A nova senha ja foi utilizada anteriormente.",
      });
    }

    const hashedPassword = await UsuariosController.hashPassword(novaSenha);
    await user.update({ senha: hashedPassword });
    await UsuarioSenhasHistoricoController.create(UsuariosController.getUserId(user), hashedPassword);

    return res.status(204).send();
  }
}

export default UsuariosController;
