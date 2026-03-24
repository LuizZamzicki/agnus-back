import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import Produtos from "../models/Produtos";

class ProdutoCoresController {

  static async getByIdProduto(req: Request, res: Response) {
    const { id_produto } = req.params;
    const cor = await ProdutoCores.findAll({ where: { id_produto: Number(id_produto) } });

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto não encontrada" });
    }

    return res.status(200).send(cor);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, nome, codigo_rgb, acrescimo = 0 } = req.body;

    if (!id_produto || !nome || !codigo_rgb) {
      return res.status(400).json({
        message: "id_produto, nome e codigo_rgb são obrigatórios.",
      });
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const cor = await ProdutoCores.create({
      id_produto: Number(id_produto),
      nome,
      codigo_rgb,
      acrescimo,
    });

    return res.status(201).send(cor);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, nome, codigo_rgb, acrescimo } = req.body;

    const cor = await ProdutoCores.findByPk(Number(id));
    if (!cor) {
      return res.status(404).json({ message: "Cor do produto não encontrada" });
    }

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(Number(id_produto));
      if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
    }

    await cor.update({
      id_produto: id_produto !== undefined ? Number(id_produto) : cor.id_produto,
      nome: nome ?? cor.nome,
      codigo_rgb: codigo_rgb ?? cor.codigo_rgb,
      acrescimo: acrescimo !== undefined ? acrescimo : cor.acrescimo,
    });

    return res.status(200).send(cor);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const cor = await ProdutoCores.findByPk(Number(id));

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto não encontrada" });
    }

    await cor.destroy();
    return res.status(204).send();
  }
}

export default ProdutoCoresController;
