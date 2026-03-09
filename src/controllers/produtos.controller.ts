import { Request, Response } from "express";
import Produtos from "../models/Produtos";
import Categorias from "../models/Categorias";

class ProdutosController {
  static async findAll(req: Request, res: Response) {
    const { id_categoria, ativo } = req.query;
    const where: { id_categoria?: number | null; ativo?: boolean } = {};

    if (id_categoria !== undefined) {
      if (id_categoria === "null") {
        where.id_categoria = null;
      } else {
        const parsedCategoriaId = Number(id_categoria);
        if (Number.isNaN(parsedCategoriaId)) {
          return res.status(400).json({ message: "id_categoria inválido." });
        }
        where.id_categoria = parsedCategoriaId;
      }
    }

    if (ativo !== undefined) {
      where.ativo = ativo === "true";
    }

    const produtos = await Produtos.findAll({ where });
    return res.status(200).send(produtos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const produto = await Produtos.findByPk(Number(id));

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    return res.status(200).send(produto);
  }

  static async create(req: Request, res: Response) {
    const {
      id_categoria = null,
      nome,
      descricao = null,
      preco_custo = 0,
      preco_base,
      ativo = true,
    } = req.body;

    if (!nome || preco_base === undefined) {
      return res.status(400).json({ message: "nome e preco_base são obrigatórios." });
    }

    if (id_categoria !== null && id_categoria !== undefined) {
      const categoria = await Categorias.findByPk(Number(id_categoria));
      if (!categoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
    }

    const produto = await Produtos.create({
      id_categoria: id_categoria !== undefined ? id_categoria : null,
      nome,
      descricao,
      preco_custo,
      preco_base,
      ativo: Boolean(ativo),
    });

    return res.status(201).send(produto);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_categoria, nome, descricao, preco_custo, preco_base, ativo } = req.body;

    const produto = await Produtos.findByPk(Number(id));
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    if (id_categoria !== undefined && id_categoria !== null) {
      const categoria = await Categorias.findByPk(Number(id_categoria));
      if (!categoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
    }

    await produto.update({
      id_categoria: id_categoria !== undefined ? id_categoria : produto.id_categoria,
      nome: nome ?? produto.nome,
      descricao: descricao !== undefined ? descricao : produto.descricao,
      preco_custo: preco_custo !== undefined ? preco_custo : produto.preco_custo,
      preco_base: preco_base !== undefined ? preco_base : produto.preco_base,
      ativo: ativo !== undefined ? Boolean(ativo) : produto.ativo,
    });

    return res.status(200).send(produto);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const produto = await Produtos.findByPk(Number(id));

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    await produto.destroy();
    return res.status(204).send();
  }
}

export default ProdutosController;
