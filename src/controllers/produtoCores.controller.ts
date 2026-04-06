import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import Produtos from "../models/Produtos";
import { normalizeRgbColor } from "../utils/color";

class ProdutoCoresController {
  static async getByIdProduto(req: Request, res: Response) {
    const { id_produto } = req.params;
    const cor = await ProdutoCores.findAll({ where: { id_produto: Number(id_produto) } });

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada" });
    }

    return res.status(200).send(cor);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, nome, codigo_rgb, tonalidade, acrescimo = 0 } = req.body;
    const rawColor = codigo_rgb ?? tonalidade;
    const rgbCode = normalizeRgbColor(String(rawColor ?? ""));

    if (!id_produto || !nome || !rawColor) {
      return res.status(400).json({
        message: "id_produto, nome e codigo_rgb sao obrigatorios.",
      });
    }

    if (!rgbCode) {
      return res.status(400).json({ message: "codigo_rgb invalido. Use formato RGB valido." });
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }

    const cor = await ProdutoCores.create({
      id_produto: Number(id_produto),
      nome,
      codigo_rgb: rgbCode,
      acrescimo,
    });

    return res.status(201).send(cor);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, nome, codigo_rgb, tonalidade, acrescimo } = req.body;
    const rawColor = codigo_rgb ?? tonalidade;
    const rgbCode =
      rawColor !== undefined ? normalizeRgbColor(String(rawColor ?? "")) : undefined;

    const cor = await ProdutoCores.findByPk(Number(id));
    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada" });
    }

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(Number(id_produto));
      if (!produto) {
        return res.status(404).json({ message: "Produto nao encontrado" });
      }
    }

    if (rawColor !== undefined && !rgbCode) {
      return res.status(400).json({ message: "codigo_rgb invalido. Use formato RGB valido." });
    }

    await cor.update({
      id_produto: id_produto !== undefined ? Number(id_produto) : cor.id_produto,
      nome: nome ?? cor.nome,
      codigo_rgb: rgbCode ?? cor.codigo_rgb,
      acrescimo: acrescimo !== undefined ? acrescimo : cor.acrescimo,
    });

    return res.status(200).send(cor);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const cor = await ProdutoCores.findByPk(Number(id));

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada" });
    }

    await cor.destroy();
    return res.status(204).send();
  }
}

export default ProdutoCoresController;
