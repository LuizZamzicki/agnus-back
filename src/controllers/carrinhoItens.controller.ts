import { Request, Response } from "express";
import CarrinhoItens from "../models/CarrinhoItens";
import Carrinhos from "../models/Carrinhos";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoGrades from "../models/ProdutoGrades";

class CarrinhoItensController {
  static async findAll(req: Request, res: Response) {
    const { id_carrinho } = req.query;
    const where: { id_carrinho?: number } = {};

    if (id_carrinho !== undefined) {
      const parsedCarrinhoId = Number(id_carrinho);
      if (Number.isNaN(parsedCarrinhoId)) {
        return res.status(400).json({ message: "id_carrinho inválido." });
      }
      where.id_carrinho = parsedCarrinhoId;
    }

    const itens = await CarrinhoItens.findAll({ where });
    return res.status(200).send(itens);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const item = await CarrinhoItens.findByPk(Number(id));

    if (!item) {
      return res.status(404).json({ message: "Item do carrinho não encontrado" });
    }

    return res.status(200).send(item);
  }

  static async create(req: Request, res: Response) {
    const { id_carrinho, id_produto_cor, id_produto_grade, quantidade = 1, preco_unitario } =
      req.body;

    if (!id_carrinho || !id_produto_cor || !id_produto_grade || preco_unitario === undefined) {
      return res.status(400).json({
        message: "id_carrinho, id_produto_cor, id_produto_grade e preco_unitario são obrigatórios.",
      });
    }

    const carrinho = await Carrinhos.findByPk(Number(id_carrinho));
    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho não encontrado" });
    }

    const cor = await ProdutoCores.findByPk(Number(id_produto_cor));
    if (!cor) {
      return res.status(404).json({ message: "Cor do produto não encontrada" });
    }

    const grade = await ProdutoGrades.findByPk(Number(id_produto_grade));
    if (!grade) {
      return res.status(404).json({ message: "Grade do produto não encontrada" });
    }

    if (cor.id_produto !== grade.id_produto) {
      return res.status(400).json({
        message: "A cor e a grade informadas não pertencem ao mesmo produto.",
      });
    }

    const item = await CarrinhoItens.create({
      id_carrinho: Number(id_carrinho),
      id_produto_cor: Number(id_produto_cor),
      id_produto_grade: Number(id_produto_grade),
      quantidade,
      preco_unitario,
    });

    return res.status(201).send(item);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_carrinho, id_produto_cor, id_produto_grade, quantidade, preco_unitario } = req.body;

    const item = await CarrinhoItens.findByPk(Number(id));
    if (!item) {
      return res.status(404).json({ message: "Item do carrinho não encontrado" });
    }

    if (id_carrinho !== undefined) {
      const carrinho = await Carrinhos.findByPk(Number(id_carrinho));
      if (!carrinho) {
        return res.status(404).json({ message: "Carrinho não encontrado" });
      }
    }

    const nextIdCor = id_produto_cor !== undefined ? Number(id_produto_cor) : item.id_produto_cor;
    const nextIdGrade =
      id_produto_grade !== undefined ? Number(id_produto_grade) : item.id_produto_grade;

    if (id_produto_cor !== undefined) {
      const cor = await ProdutoCores.findByPk(nextIdCor);
      if (!cor) {
        return res.status(404).json({ message: "Cor do produto não encontrada" });
      }
    }

    if (id_produto_grade !== undefined) {
      const grade = await ProdutoGrades.findByPk(nextIdGrade);
      if (!grade) {
        return res.status(404).json({ message: "Grade do produto não encontrada" });
      }
    }

    const corFinal = await ProdutoCores.findByPk(nextIdCor);
    const gradeFinal = await ProdutoGrades.findByPk(nextIdGrade);
    if (!corFinal || !gradeFinal || corFinal.id_produto !== gradeFinal.id_produto) {
      return res.status(400).json({
        message: "A cor e a grade informadas não pertencem ao mesmo produto.",
      });
    }

    await item.update({
      id_carrinho: id_carrinho !== undefined ? Number(id_carrinho) : item.id_carrinho,
      id_produto_cor: nextIdCor,
      id_produto_grade: nextIdGrade,
      quantidade: quantidade !== undefined ? quantidade : item.quantidade,
      preco_unitario: preco_unitario !== undefined ? preco_unitario : item.preco_unitario,
    });

    return res.status(200).send(item);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const item = await CarrinhoItens.findByPk(Number(id));

    if (!item) {
      return res.status(404).json({ message: "Item do carrinho não encontrado" });
    }

    await item.destroy();
    return res.status(204).send();
  }
}

export default CarrinhoItensController;
