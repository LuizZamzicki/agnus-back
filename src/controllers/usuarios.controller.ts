import { Request, Response } from "express";
import argon2 from "argon2";
import User from "../models/Usuarios";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";
import UsuarioSenhasHistoricoController from "./usuarioSenhasHistorico.controller";

class UsuariosController {
  private static async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  private static sanitizeUser(user: any) {
    const userData = user.toJSON();
    delete userData.senha;
    return userData;
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

    const savedUser = await User.findOne({ where: { email } });
    if (savedUser) {
      return res.status(400).json({ message: "Usuário já existe com esse email!" });
    }

    const hashedPassword = await UsuariosController.hashPassword(senha);
    const user = await User.create({ nome, cpf, email, senha: hashedPassword, tipo });
    await UsuarioSenhasHistoricoController.create(user.id_usuario, hashedPassword);
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

    const updatedSenha = senha
      ? await UsuariosController.hashPassword(senha)
      : user.get("senha");

    if (senha != null) await UsuarioSenhasHistoricoController.create(user.id_usuario, updatedSenha);

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
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({ message: "Senha é obrigatoria." });
    }

    const user = await User.findByPk(Number(id));
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const hashedPassword = await UsuariosController.hashPassword(senha);
    await user.update({ senha: hashedPassword });
    await UsuarioSenhasHistoricoController.create(user.id_usuario, hashedPassword);

    return res.status(204).send();
  }
}

export default UsuariosController;
