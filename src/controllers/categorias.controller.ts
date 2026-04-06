import { Request, Response } from "express";
import Categorias from "../models/Categorias";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";

class CategoriasController {
  static async findAll(req: Request, res: Response) {
    const pagination = parsePagination(req.query);
    if (!pagination) return res.status(400).json({ message: "page e limit devem ser inteiros positivos." });

    const { count, rows } = await Categorias.findAndCountAll({
      limit: pagination.limit,
      offset: pagination.offset,
      order: [["id_categoria", "ASC"]],
    });

    return res.status(200).json({
      data: rows,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, count),
    });
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const categoria = await Categorias.findByPk(Number(id));

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    return res.status(200).send(categoria);
  }

  static async create(req: Request, res: Response) {
    const { nome } = req.body ?? {};

    if (!nome) {
      return res.status(400).json({ message: "nome é obrigatório." });
    }

    const categoriaExistente = await Categorias.findOne({ where: { nome } });
    if (categoriaExistente) {
      return res.status(400).json({ message: "Já existe categoria com esse nome." });
    }

    const categoria = await Categorias.create({ nome });
    return res.status(201).send(categoria);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { nome } = req.body ?? {};

    const categoria = await Categorias.findByPk(Number(id));
    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    if (nome !== undefined && nome !== categoria.nome) {
      const categoriaExistente = await Categorias.findOne({ where: { nome } });
      if (categoriaExistente) {
        return res.status(400).json({ message: "Já existe categoria com esse nome." });
      }
    }

    await categoria.update({
      nome: nome ?? categoria.nome,
    });

    return res.status(200).send(categoria);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const categoria = await Categorias.findByPk(Number(id));

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    await categoria.destroy();
    return res.status(204).send();
  }
}

export default CategoriasController;
