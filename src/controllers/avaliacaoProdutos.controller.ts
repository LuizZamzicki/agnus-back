import { Request, Response } from "express";
import AvaliacaoProdutos from "../models/AvaliacaoProdutos";
import Produtos from "../models/Produtos";
import Usuarios from "../models/Usuarios";

class AvaliacaoProdutosController {
 

  static async getByIdProduto(req: Request, res: Response) {
    const { id_produto } = req.params;
    const avaliacao = await AvaliacaoProdutos.findAll({ where: { id_produto: Number(id_produto) } });

    if (!avaliacao) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    return res.status(200).send(avaliacao);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, id_usuario, titulo = null, comentario = null, nota = null } = req.body;

    if (!id_produto || !id_usuario) {
      return res.status(400).json({ message: "id_produto e id_usuario são obrigatorios." });
    }

    if (nota !== null && nota !== undefined) {
      const parsedNota = Number(nota);
      if (Number.isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10) {
        return res.status(400).json({ message: "nota inválida. Use valor entre 0 e 10." });
      }
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const avaliacao = await AvaliacaoProdutos.create({
      id_produto: Number(id_produto),
      id_usuario: Number(id_usuario),
      titulo,
      comentario,
      nota: nota !== undefined ? nota : null,
    });

    return res.status(201).send(avaliacao);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, id_usuario, titulo, comentario, nota } = req.body;

    const avaliacao = await AvaliacaoProdutos.findByPk(Number(id));
    if (!avaliacao) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(Number(id_produto));
      if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
    }

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(Number(id_usuario));
      if (!usuario) {
        return res.status(404).json({ message: "Usuario não encontrado" });
      }
    }

    if (nota !== undefined && nota !== null) {
      const parsedNota = Number(nota);
      if (Number.isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10) {
        return res.status(400).json({ message: "nota inválida. Use valor entre 0 e 10." });
      }
    }

    await avaliacao.update({
      id_produto: id_produto !== undefined ? Number(id_produto) : avaliacao.id_produto,
      id_usuario: id_usuario !== undefined ? Number(id_usuario) : avaliacao.id_usuario,
      titulo: titulo !== undefined ? titulo : avaliacao.titulo,
      comentario: comentario !== undefined ? comentario : avaliacao.comentario,
      nota: nota !== undefined ? nota : avaliacao.nota,
    });

    return res.status(200).send(avaliacao);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const avaliacao = await AvaliacaoProdutos.findByPk(Number(id));

    if (!avaliacao) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    await avaliacao.destroy();
    return res.status(204).send();
  }
}

export default AvaliacaoProdutosController;
