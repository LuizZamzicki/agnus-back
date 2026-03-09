import { Request, Response } from "express";
import Carrinhos from "../models/Carrinhos";
import Usuarios from "../models/Usuarios";

class CarrinhosController {
  static async findAll(req: Request, res: Response) {
    const { id_usuario } = req.query;
    const where: { id_usuario?: number } = {};

    if (id_usuario !== undefined) {
      const parsedUsuarioId = Number(id_usuario);
      if (Number.isNaN(parsedUsuarioId)) {
        return res.status(400).json({ message: "id_usuario inválido." });
      }
      where.id_usuario = parsedUsuarioId;
    }

    const carrinhos = await Carrinhos.findAll({ where });
    return res.status(200).send(carrinhos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const carrinho = await Carrinhos.findByPk(Number(id));

    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho não encontrado" });
    }

    return res.status(200).send(carrinho);
  }

  static async create(req: Request, res: Response) {
    const { id_usuario } = req.body;

    if (!id_usuario) {
      return res.status(400).json({ message: "id_usuario é obrigatorio." });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "Usuario não encontrado" });
    }

    const carrinho = await Carrinhos.create({
      id_usuario: Number(id_usuario),
    });

    return res.status(201).send(carrinho);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_usuario } = req.body;

    const carrinho = await Carrinhos.findByPk(Number(id));
    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho não encontrado" });
    }

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(Number(id_usuario));
      if (!usuario) {
        return res.status(404).json({ message: "Usuario não encontrado" });
      }
    }

    await carrinho.update({
      id_usuario: id_usuario !== undefined ? Number(id_usuario) : carrinho.id_usuario,
    });

    return res.status(200).send(carrinho);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const carrinho = await Carrinhos.findByPk(Number(id));

    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho não encontrado" });
    }

    await carrinho.destroy();
    return res.status(204).send();
  }
}

export default CarrinhosController;
