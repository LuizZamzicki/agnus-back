import { Request, Response } from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";
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

  static async catalog(req: Request, res: Response) {
    const { id_categoria, ativo } = req.query;
    const whereClauses: string[] = [];
    const replacements: { id_categoria?: number; ativo?: boolean } = {};

    if (id_categoria !== undefined) {
      if (id_categoria === "null") {
        whereClauses.push("p.id_categoria IS NULL");
      } else {
        const parsedCategoriaId = Number(id_categoria);
        if (Number.isNaN(parsedCategoriaId)) {
          return res.status(400).json({ message: "id_categoria inválido." });
        }
        whereClauses.push("p.id_categoria = :id_categoria");
        replacements.id_categoria = parsedCategoriaId;
      }
    }

    if (ativo !== undefined) {
      whereClauses.push("p.ativo = :ativo");
      replacements.ativo = ativo === "true";
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const rows = await sequelize.query(
      `
      SELECT
        p.id_produto,
        p.nome,
        p.preco_base,
        p.ativo,
        p.id_categoria,
        c.nome AS categoria_nome,
        IFNULL(
          CONCAT(
            '[',
            (
              SELECT GROUP_CONCAT(JSON_QUOTE(pf.caminho_url) ORDER BY pf.id_produto_foto ASC SEPARATOR ',')
              FROM produto_fotos pf
              WHERE pf.id_produto = p.id_produto
            ),
            ']'
          ),
          '[]'
        ) AS imagens_json
      FROM produtos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql}
      ORDER BY p.id_produto ASC
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    const parsedRows = (rows as Array<Record<string, unknown>>).map((row) => {
      const imagensJson = typeof row.imagens_json === "string" ? row.imagens_json : "[]";
      return {
        ...row,
        imagens: JSON.parse(imagensJson),
        imagens_json: undefined,
      };
    });

    return res.status(200).json(parsedRows);
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
