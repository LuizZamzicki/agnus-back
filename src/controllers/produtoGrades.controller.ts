import { Request, Response } from "express";
import ProdutoGrades from "../models/ProdutoGrades";
import Produtos from "../models/Produtos";

class ProdutoGradesController {
  static async findAll(req: Request, res: Response) {
    const { id_produto } = req.query;
    const where: { id_produto?: number } = {};

    if (id_produto !== undefined) {
      const parsedProdutoId = Number(id_produto);
      if (Number.isNaN(parsedProdutoId)) {
        return res.status(400).json({ message: "id_produto inválido." });
      }
      where.id_produto = parsedProdutoId;
    }

    const grades = await ProdutoGrades.findAll({ where });
    return res.status(200).send(grades);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const grade = await ProdutoGrades.findByPk(Number(id));

    if (!grade) {
      return res.status(404).json({ message: "Grade do produto não encontrada" });
    }

    return res.status(200).send(grade);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, nome, acrescimo = 0 } = req.body;

    if (!id_produto || !nome) {
      return res.status(400).json({
        message: "id_produto e nome são obrigatorios.",
      });
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const grade = await ProdutoGrades.create({
      id_produto: Number(id_produto),
      nome,
      acrescimo,
    });

    return res.status(201).send(grade);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, nome, acrescimo } = req.body;

    const grade = await ProdutoGrades.findByPk(Number(id));
    if (!grade) {
      return res.status(404).json({ message: "Grade do produto não encontrada" });
    }

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(Number(id_produto));
      if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
    }

    await grade.update({
      id_produto: id_produto !== undefined ? Number(id_produto) : grade.id_produto,
      nome: nome ?? grade.nome,
      acrescimo: acrescimo !== undefined ? acrescimo : grade.acrescimo,
    });

    return res.status(200).send(grade);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const grade = await ProdutoGrades.findByPk(Number(id));

    if (!grade) {
      return res.status(404).json({ message: "Grade do produto não encontrada" });
    }

    await grade.destroy();
    return res.status(204).send();
  }
}

export default ProdutoGradesController;
