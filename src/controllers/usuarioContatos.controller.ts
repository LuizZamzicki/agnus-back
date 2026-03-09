import { Request, Response } from "express";
import UsuarioContatos from "../models/UsuarioContatos";
import Usuarios from "../models/Usuarios";

class UsuarioContatosController {
  private static readonly TIPOS_VALIDOS = ["telefone", "celular", "email", "outro"];

  static async findAll(req: Request, res: Response) {
    const { id_usuario, tipo, principal } = req.query;
    const where: { id_usuario?: number; tipo?: string; principal?: boolean } = {};

    if (id_usuario !== undefined) {
      const parsedUserId = Number(id_usuario);
      if (Number.isNaN(parsedUserId)) {
        return res.status(400).json({ message: "id_usuario inválido." });
      }
      where.id_usuario = parsedUserId;
    }

    if (tipo !== undefined) {
      if (!UsuarioContatosController.TIPOS_VALIDOS.includes(String(tipo))) {
        return res.status(400).json({ message: "tipo inválido." });
      }
      where.tipo = String(tipo);
    }

    if (principal !== undefined) {
      where.principal = principal === "true";
    }

    const contatos = await UsuarioContatos.findAll({ where });
    return res.status(200).send(contatos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const contato = await UsuarioContatos.findByPk(Number(id));

    if (!contato) {
      return res.status(404).json({ message: "Contato não encontrado" });
    }

    return res.status(200).send(contato);
  }

  static async create(req: Request, res: Response) {
    const { id_usuario, tipo = "celular", valor, principal = false } = req.body;

    if (!id_usuario || !valor) {
      return res.status(400).json({ message: "id_usuario e valor são obrigatórios." });
    }

    if (!UsuarioContatosController.TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ message: "tipo inválido." });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const contato = await UsuarioContatos.create({
      id_usuario: Number(id_usuario),
      tipo,
      valor,
      principal: Boolean(principal),
    });

    return res.status(201).send(contato);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_usuario, tipo, valor, principal } = req.body;

    const contato = await UsuarioContatos.findByPk(Number(id));
    if (!contato) {
      return res.status(404).json({ message: "Contato não encontrado" });
    }

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(Number(id_usuario));
      if (!usuario) {
        return res.status(404).json({ message: "Usuario não encontrado" });
      }
    }

    if (tipo !== undefined && !UsuarioContatosController.TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ message: "tipo inválido." });
    }

    await contato.update({
      id_usuario: id_usuario !== undefined ? Number(id_usuario) : contato.id_usuario,
      tipo: tipo ?? contato.tipo,
      valor: valor ?? contato.valor,
      principal: principal !== undefined ? Boolean(principal) : contato.principal,
    });

    return res.status(200).send(contato);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const contato = await UsuarioContatos.findByPk(Number(id));

    if (!contato) {
      return res.status(404).json({ message: "Contato não encontrado" });
    }

    await contato.destroy();
    return res.status(204).send();
  }
}

export default UsuarioContatosController;
