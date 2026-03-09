import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import Produtos from "../models/Produtos";

class ProdutoFotosController {
  static async findAll(req: Request, res: Response) {
    const { id_produto, id_produto_cor } = req.query;
    const where: { id_produto?: number; id_produto_cor?: number } = {};

    if (id_produto !== undefined) {
      const parsedProdutoId = Number(id_produto);
      if (Number.isNaN(parsedProdutoId)) {
        return res.status(400).json({ message: "id_produto inválido." });
      }
      where.id_produto = parsedProdutoId;
    }

    if (id_produto_cor !== undefined) {
      const parsedCorId = Number(id_produto_cor);
      if (Number.isNaN(parsedCorId)) {
        return res.status(400).json({ message: "id_produto_cor inválido." });
      }
      where.id_produto_cor = parsedCorId;
    }

    const fotos = await ProdutoFotos.findAll({ where });
    return res.status(200).send(fotos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await ProdutoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto não encontrada" });
    }

    return res.status(200).send(foto);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, id_produto_cor, caminho_url } = req.body;

    if (!id_produto || !id_produto_cor || !caminho_url) {
      return res.status(400).json({
        message: "id_produto, id_produto_cor e caminho_url são obrigatórios.",
      });
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const cor = await ProdutoCores.findByPk(Number(id_produto_cor));
    if (!cor) {
      return res.status(404).json({ message: "Cor do produto não encontrada" });
    }

    if (cor.id_produto !== Number(id_produto)) {
      return res.status(400).json({
        message: "A cor informada não pertence ao produto informado.",
      });
    }

    const foto = await ProdutoFotos.create({
      id_produto: Number(id_produto),
      id_produto_cor: Number(id_produto_cor),
      caminho_url,
    });

    return res.status(201).send(foto);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, id_produto_cor, caminho_url } = req.body;

    const foto = await ProdutoFotos.findByPk(Number(id));
    if (!foto) {
      return res.status(404).json({ message: "Foto do produto não encontrada" });
    }

    const nextIdProduto = id_produto !== undefined ? Number(id_produto) : foto.id_produto;
    const nextIdProdutoCor =
      id_produto_cor !== undefined ? Number(id_produto_cor) : foto.id_produto_cor;

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(nextIdProduto);
      if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
    }

    if (id_produto_cor !== undefined) {
      const cor = await ProdutoCores.findByPk(nextIdProdutoCor);
      if (!cor) {
        return res.status(404).json({ message: "Cor do produto não encontrada" });
      }
    }

    const corFinal = await ProdutoCores.findByPk(nextIdProdutoCor);
    if (!corFinal || corFinal.id_produto !== nextIdProduto) {
      return res.status(400).json({
        message: "A cor informada não pertence ao produto informado.",
      });
    }

    await foto.update({
      id_produto: nextIdProduto,
      id_produto_cor: nextIdProdutoCor,
      caminho_url: caminho_url ?? foto.caminho_url,
    });

    return res.status(200).send(foto);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await ProdutoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto não encontrada" });
    }

    await foto.destroy();
    return res.status(204).send();
  }
}

export default ProdutoFotosController;
