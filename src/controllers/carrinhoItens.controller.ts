import { Request, Response } from "express";
import CarrinhoItens from "../models/CarrinhoItens";
import Carrinhos from "../models/Carrinhos";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoGrades from "../models/ProdutoGrades";
import {
  enrichItemsWithProductData,
  normalizeItemQuantity,
  resolveProdutoContext,
} from "../utils/itemDetails";

class CarrinhoItensController {
  static async getByIdCart(req: Request, res: Response) {
    const { id_cart } = req.params;
    const item = await CarrinhoItens.findAll({ where: { id_carrinho: Number(id_cart) } });
    const enrichedItems = await enrichItemsWithProductData(item);

    return res.status(200).send(enrichedItems);
  }

  static async create(req: Request, res: Response) {
    const { id_carrinho, id_produto_cor, id_produto_grade, quantidade = 1 } = req.body;

    if (!id_carrinho || !id_produto_cor || !id_produto_grade) {
      return res.status(400).json({
        message: "id_carrinho, id_produto_cor e id_produto_grade são obrigatórios.",
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

    const produtoContext = await resolveProdutoContext(Number(id_produto_cor), Number(id_produto_grade));
    if (!produtoContext) {
      return res.status(404).json({ message: "Produto vinculado ao item não encontrado" });
    }

    const item = await CarrinhoItens.create({
      id_carrinho: Number(id_carrinho),
      id_produto_cor: Number(id_produto_cor),
      id_produto_grade: Number(id_produto_grade),
      quantidade: normalizeItemQuantity(quantidade),
      preco_unitario: produtoContext.precoUnitario,
    });

    const [enrichedItem] = await enrichItemsWithProductData([item]);
    return res.status(201).send(enrichedItem);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_carrinho, id_produto_cor, id_produto_grade, quantidade } = req.body;

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

    const produtoContext = await resolveProdutoContext(nextIdCor, nextIdGrade);
    if (!produtoContext) {
      return res.status(404).json({ message: "Produto vinculado ao item não encontrado" });
    }

    await item.update({
      id_carrinho: id_carrinho !== undefined ? Number(id_carrinho) : item.id_carrinho,
      id_produto_cor: nextIdCor,
      id_produto_grade: nextIdGrade,
      quantidade: quantidade !== undefined ? normalizeItemQuantity(quantidade) : item.quantidade,
      preco_unitario: produtoContext.precoUnitario,
    });

    const [enrichedItem] = await enrichItemsWithProductData([item]);
    return res.status(200).send(enrichedItem);
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
