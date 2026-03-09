import { Request, Response } from "express";
import AvaliacaoFotos from "../models/AvaliacaoFotos";
import AvaliacaoProdutos from "../models/AvaliacaoProdutos";

class AvaliacaoFotosController {
  static async findAll(req: Request, res: Response) {
    const { id_avaliacao_produto } = req.query;
    const where: { id_avaliacao_produto?: number } = {};

    if (id_avaliacao_produto !== undefined) {
      const parsedAvaliacaoId = Number(id_avaliacao_produto);
      if (Number.isNaN(parsedAvaliacaoId)) {
        return res.status(400).json({ message: "id_avaliacao_produto inválido." });
      }
      where.id_avaliacao_produto = parsedAvaliacaoId;
    }

    const fotos = await AvaliacaoFotos.findAll({ where });
    return res.status(200).send(fotos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await AvaliacaoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliação não encontrada" });
    }

    return res.status(200).send(foto);
  }

  static async create(req: Request, res: Response) {
    const { id_avaliacao_produto, caminho_url = null } = req.body;

    if (!id_avaliacao_produto) {
      return res.status(400).json({ message: "id_avaliacao_produto é obrigatorio." });
    }

    const avaliacao = await AvaliacaoProdutos.findByPk(Number(id_avaliacao_produto));
    if (!avaliacao) {
      return res.status(404).json({ message: "Avaliação de produto não encontrada" });
    }

    const foto = await AvaliacaoFotos.create({
      id_avaliacao_produto: Number(id_avaliacao_produto),
      caminho_url,
    });

    return res.status(201).send(foto);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_avaliacao_produto, caminho_url } = req.body;

    const foto = await AvaliacaoFotos.findByPk(Number(id));
    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliação não encontrada" });
    }

    if (id_avaliacao_produto !== undefined) {
      const avaliacao = await AvaliacaoProdutos.findByPk(Number(id_avaliacao_produto));
      if (!avaliacao) {
        return res.status(404).json({ message: "Avaliação de produto não encontrada" });
      }
    }

    await foto.update({
      id_avaliacao_produto:
        id_avaliacao_produto !== undefined
          ? Number(id_avaliacao_produto)
          : foto.id_avaliacao_produto,
      caminho_url: caminho_url !== undefined ? caminho_url : foto.caminho_url,
    });

    return res.status(200).send(foto);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await AvaliacaoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliação não encontrada" });
    }

    await foto.destroy();
    return res.status(204).send();
  }
}

export default AvaliacaoFotosController;
