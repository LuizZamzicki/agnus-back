import { Request, Response } from "express";
import PedidoItens from "../models/PedidoItens";
import Pedidos from "../models/Pedidos";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoGrades from "../models/ProdutoGrades";

class PedidoItensController {
  static async findAll(req: Request, res: Response) {
    const { id_pedido } = req.query;
    const where: { id_pedido?: number } = {};

    if (id_pedido !== undefined) {
      const parsedPedidoId = Number(id_pedido);
      if (Number.isNaN(parsedPedidoId)) {
        return res.status(400).json({ message: "id_pedido inválido." });
      }
      where.id_pedido = parsedPedidoId;
    }

    const itens = await PedidoItens.findAll({ where });
    return res.status(200).send(itens);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const item = await PedidoItens.findByPk(Number(id));

    if (!item) {
      return res.status(404).json({ message: "Item do pedido não encontrado" });
    }

    return res.status(200).send(item);
  }

  static async create(req: Request, res: Response) {
    const { id_pedido, id_produto_cor, id_produto_grade, quantidade, preco_unitario } = req.body;

    if (!id_pedido || !id_produto_cor || !id_produto_grade || !quantidade || preco_unitario === undefined) {
      return res.status(400).json({
        message: "id_pedido, id_produto_cor, id_produto_grade, quantidade e preco_unitario são obrigatorios.",
      });
    }

    const pedido = await Pedidos.findByPk(Number(id_pedido));
    if (!pedido) {
      return res.status(404).json({ message: "Pedido não encontrado" });
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

    const item = await PedidoItens.create({
      id_pedido: Number(id_pedido),
      id_produto_cor: Number(id_produto_cor),
      id_produto_grade: Number(id_produto_grade),
      quantidade: Number(quantidade),
      preco_unitario,
    });

    return res.status(201).send(item);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_pedido, id_produto_cor, id_produto_grade, quantidade, preco_unitario } = req.body;

    const item = await PedidoItens.findByPk(Number(id));
    if (!item) {
      return res.status(404).json({ message: "Item do pedido não encontrado" });
    }

    if (id_pedido !== undefined) {
      const pedido = await Pedidos.findByPk(Number(id_pedido));
      if (!pedido) {
        return res.status(404).json({ message: "Pedido não encontrado" });
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
      id_pedido: id_pedido !== undefined ? Number(id_pedido) : item.id_pedido,
      id_produto_cor: nextIdCor,
      id_produto_grade: nextIdGrade,
      quantidade: quantidade !== undefined ? Number(quantidade) : item.quantidade,
      preco_unitario: preco_unitario !== undefined ? preco_unitario : item.preco_unitario,
    });

    return res.status(200).send(item);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const item = await PedidoItens.findByPk(Number(id));

    if (!item) {
      return res.status(404).json({ message: "Item do pedido não encontrado" });
    }

    await item.destroy();
    return res.status(204).send();
  }
}

export default PedidoItensController;
