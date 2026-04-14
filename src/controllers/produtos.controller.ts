import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import AvaliacaoFotos from "../models/AvaliacaoFotos";
import AvaliacaoProdutos from "../models/AvaliacaoProdutos";
import CarrinhoItens from "../models/CarrinhoItens";
import sequelize from "../config/database";
import Categorias from "../models/Categorias";
import PedidoItens from "../models/PedidoItens";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import ProdutoGrades from "../models/ProdutoGrades";
import Produtos from "../models/Produtos";
import { normalizeRgbColor } from "../utils/color";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";
import { saveProdutoFotoBits } from "../utils/produtoFotoStorage";
import {
  removeProdutoFromSearchIndex,
  searchProdutosInIndex,
  syncProdutoToSearchIndex,
} from "../services/produtoSearchIndex.service";

type CatalogFilters = {
  pagination: {
    page: number;
    limit: number;
    offset: number;
  };
  whereSql: string;
  replacements: Record<string, unknown>;
};

type ControllerError = {
  message: string;
  status?: number;
};

type SearchCatalogRow = Record<string, unknown> & {
  id_produto: number;
  nome: string;
  descricao?: string | null;
  categoria_nome?: string | null;
  ativo?: boolean;
  quantidade_vendida?: number | null;
};

class ProdutosController {
  private static readonly SALES_ORDER_STATUSES = ["pago", "enviado", "entregue"] as const;

  private static hasCategoryField(body: any) {
    if (!body || typeof body !== "object") {
      return false;
    }

    const hasFlatCategory = Object.prototype.hasOwnProperty.call(body, "id_categoria");
    const hasNestedCategory =
      body.categoria &&
      typeof body.categoria === "object" &&
      Object.prototype.hasOwnProperty.call(body.categoria, "id_categoria");

    return hasFlatCategory || hasNestedCategory;
  }

  private static parseCategoryId(body: any): number | null | undefined {
    const rawIdCategoria = body?.id_categoria ?? body?.categoria?.id_categoria;

    if (rawIdCategoria === null || rawIdCategoria === "") {
      return null;
    }

    if (rawIdCategoria === undefined) {
      return undefined;
    }

    const parsedIdCategoria = Number(rawIdCategoria);
    if (Number.isNaN(parsedIdCategoria)) {
      return undefined;
    }

    return parsedIdCategoria;
  }

  private static parseMoneyValue(value: unknown, fallback = 0) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) {
      return undefined;
    }

    return parsedValue;
  }

  private static parseSearchTerms(query: Request["query"]) {
    const rawSearch =
      query.q ??
      query.search ??
      query.busca ??
      query.descricao;

    if (typeof rawSearch !== "string") {
      return [];
    }

    return rawSearch
      .trim()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
  }

  private static getRawSearchValue(query: Request["query"]) {
    const rawSearch =
      query.q ??
      query.search ??
      query.busca ??
      query.descricao;

    return typeof rawSearch === "string" ? rawSearch.trim() : "";
  }

  private static buildBaseCatalogFilters(query: Request["query"]): CatalogFilters | ControllerError {
    const { id_categoria, ativo } = query;
    const pagination = parsePagination(query);
    const whereClauses: string[] = [];
    const replacements: CatalogFilters["replacements"] = {};

    if (!pagination) {
      return { message: "page e limit devem ser inteiros positivos." };
    }

    if (id_categoria !== undefined) {
      if (id_categoria === "null") {
        whereClauses.push("p.id_categoria IS NULL");
      } else {
        const parsedCategoriaId = Number(id_categoria);
        if (Number.isNaN(parsedCategoriaId)) {
          return { message: "id_categoria invalido." };
        }
        whereClauses.push("p.id_categoria = :id_categoria");
        replacements.id_categoria = parsedCategoriaId;
      }
    }

    if (ativo !== undefined) {
      whereClauses.push("p.ativo = :ativo");
      replacements.ativo = ativo === "true";
    }

    return {
      pagination,
      whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "",
      replacements,
    };
  }

  private static parseFotoUrl(foto: unknown) {
    if (typeof foto === "string") {
      return foto.trim();
    }

    if (foto && typeof foto === "object") {
      const source = foto as Record<string, unknown>;
      const rawUrl =
        source.caminho_url ??
        source.caminhoUrl ??
        source.caminho ??
        source.url ??
        source.src ??
        source.link ??
        source.path ??
        source.preview;
      if (typeof rawUrl === "string") {
        return rawUrl.trim();
      }
    }

    return "";
  }

  private static parseArrayField(value: unknown): unknown[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private static normalizeExistingFotoPaths(value: unknown, nomeCor: string) {
    const fotos = value ?? [];
    if (!Array.isArray(fotos)) {
      throw new Error(`Fotos da cor "${nomeCor}" deve ser um array.`);
    }

    return fotos.map((foto) => {
      const caminhoUrl = ProdutosController.parseFotoUrl(foto);
      if (!caminhoUrl) {
        throw new Error(`Foto existente invalida na cor "${nomeCor}".`);
      }

      return caminhoUrl;
    });
  }

  private static async saveNewFotoUploads(value: unknown, nomeCor: string) {
    const fotosUpload = value ?? [];
    if (!Array.isArray(fotosUpload)) {
      throw new Error(`Fotos_upload da cor "${nomeCor}" deve ser um array.`);
    }
    const savedPaths: string[] = [];
    for (const fotoUpload of fotosUpload) {
      const savedFilePath = await saveProdutoFotoBits(fotoUpload);
      if (!savedFilePath) {
        throw new Error(`Foto nova invalida em fotos_upload na cor "${nomeCor}".`);
      }

      savedPaths.push(savedFilePath);
    }

    return savedPaths;
  }

  private static buildCatalogFilters(query: Request["query"]): CatalogFilters | ControllerError {
    return ProdutosController.buildBaseCatalogFilters(query);
  }

  private static stripSearchDecorators(row: SearchCatalogRow) {
    const {
      categoria_nome,
      quantidade_vendida,
      imagens,
      imagens_json,
      ...product
    } = row;

    return product;
  }

  private static async searchFindAll(query: Request["query"]) {
    const filters = ProdutosController.buildBaseCatalogFilters(query);
    if ("message" in filters) {
      return filters;
    }

    const indexedResult = await searchProdutosInIndex({
      query: ProdutosController.getRawSearchValue(query),
      page: filters.pagination.page,
      limit: filters.pagination.limit,
      idCategoria: query.id_categoria,
      ativo: query.ativo,
    });
    if (!indexedResult) {
      return { message: "Busca indisponivel no momento.", status: 503 };
    }

    return {
      data: indexedResult.data.map(ProdutosController.stripSearchDecorators),
      pagination: buildPaginationMeta(filters.pagination.page, filters.pagination.limit, indexedResult.total),
    };
  }

  private static async searchCatalog(
    query: Request["query"],
    options: { onlyWithSales?: boolean; preferSales?: boolean } = {},
  ) {
    const filters = ProdutosController.buildBaseCatalogFilters(query);
    if ("message" in filters) {
      return filters;
    }

    const indexedResult = await searchProdutosInIndex({
      query: ProdutosController.getRawSearchValue(query),
      page: filters.pagination.page,
      limit: filters.pagination.limit,
      idCategoria: query.id_categoria,
      ativo: query.ativo,
      onlyWithSales: options.onlyWithSales,
      sort: options.preferSales ? ["quantidade_vendida:desc", "id_produto:asc"] : undefined,
    });
    if (!indexedResult) {
      return { message: "Busca indisponivel no momento.", status: 503 };
    }

    return {
      data: indexedResult.data,
      pagination: buildPaginationMeta(filters.pagination.page, filters.pagination.limit, indexedResult.total),
    };
  }

  private static parseCatalogRows(rows: Array<Record<string, unknown>>) {
    return rows.map((row) => {
      const imagensJson = typeof row.imagens_json === "string" ? row.imagens_json : "[]";
      return {
        ...row,
        imagens: JSON.parse(imagensJson),
        imagens_json: undefined,
      };
    });
  }

  static async findAll(req: Request, res: Response) {
    if (ProdutosController.parseSearchTerms(req.query).length > 0) {
      const searchResult = await ProdutosController.searchFindAll(req.query);
      if ("message" in searchResult) {
        return res.status(searchResult.status ?? 400).json({ message: searchResult.message });
      }

      return res.status(200).json(searchResult);
    }

    const { id_categoria, ativo } = req.query;
    const pagination = parsePagination(req.query);
    const where: Record<string | symbol, unknown> = {};

    if (!pagination) {
      return res.status(400).json({ message: "page e limit devem ser inteiros positivos." });
    }

    if (id_categoria !== undefined) {
      if (id_categoria === "null") {
        where.id_categoria = null;
      } else {
        const parsedCategoriaId = Number(id_categoria);
        if (Number.isNaN(parsedCategoriaId)) {
          return res.status(400).json({ message: "id_categoria invalido." });
        }
        where.id_categoria = parsedCategoriaId;
      }
    }

    if (ativo !== undefined) {
      where.ativo = ativo === "true";
    }

    const { count, rows } = await Produtos.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [["id_produto", "ASC"]],
    });
    return res.status(200).json({
      data: rows,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, count),
    });
  }

  static async catalog(req: Request, res: Response) {
    if (ProdutosController.parseSearchTerms(req.query).length > 0) {
      const searchResult = await ProdutosController.searchCatalog(req.query);
      if ("message" in searchResult) {
        return res.status(searchResult.status ?? 400).json({ message: searchResult.message });
      }

      return res.status(200).json(searchResult);
    }

    const filters = ProdutosController.buildCatalogFilters(req.query);
    if ("message" in filters) {
      return res.status(400).json({ message: filters.message });
    }

    const { pagination, whereSql, replacements } = filters;
    const countRows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM produtos p ${whereSql}`,
      { replacements, type: QueryTypes.SELECT },
    );
    const total = Number((countRows[0] as Record<string, unknown>)?.total ?? 0);
    const queryReplacements = {
      ...replacements,
      limit: pagination.limit,
      offset: pagination.offset,
    };

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
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: queryReplacements,
        type: QueryTypes.SELECT,
      },
    );

    const parsedRows = ProdutosController.parseCatalogRows(rows as Array<Record<string, unknown>>);

    return res.status(200).json({
      data: parsedRows,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
    });
  }

  static async bestSellers(req: Request, res: Response) {
    if (ProdutosController.parseSearchTerms(req.query).length > 0) {
      const searchResult = await ProdutosController.searchCatalog(req.query, {
        onlyWithSales: true,
        preferSales: true,
      });
      if ("message" in searchResult) {
        return res.status(searchResult.status ?? 400).json({ message: searchResult.message });
      }

      return res.status(200).json(searchResult);
    }

    const filters = ProdutosController.buildCatalogFilters(req.query);
    if ("message" in filters) {
      return res.status(400).json({ message: filters.message });
    }

    const { pagination, whereSql, replacements } = filters;
    const salesStatusSql = ProdutosController.SALES_ORDER_STATUSES.map((status) => `'${status}'`).join(", ");
    const countRows = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM (
        SELECT p.id_produto
        FROM produtos p
        INNER JOIN produto_cores pc ON pc.id_produto = p.id_produto
        INNER JOIN pedido_itens pi ON pi.id_produto_cor = pc.id_produto_cor
        INNER JOIN pedidos pe ON pe.id_pedido = pi.id_pedido
        ${whereSql ? `${whereSql} AND pe.status IN (${salesStatusSql})` : `WHERE pe.status IN (${salesStatusSql})`}
        GROUP BY p.id_produto
      ) AS produtos_mais_vendidos
      `,
      { replacements, type: QueryTypes.SELECT },
    );
    const total = Number((countRows[0] as Record<string, unknown>)?.total ?? 0);
    const queryReplacements = {
      ...replacements,
      limit: pagination.limit,
      offset: pagination.offset,
    };

    const rows = await sequelize.query(
      `
      SELECT
        p.id_produto,
        p.nome,
        p.preco_base,
        p.ativo,
        p.id_categoria,
        c.nome AS categoria_nome,
        vendas.quantidade_vendida,
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
      INNER JOIN (
        SELECT
          pc.id_produto,
          SUM(pi.quantidade) AS quantidade_vendida
        FROM pedido_itens pi
        INNER JOIN pedidos pe ON pe.id_pedido = pi.id_pedido
        INNER JOIN produto_cores pc ON pc.id_produto_cor = pi.id_produto_cor
        WHERE pe.status IN (${salesStatusSql})
        GROUP BY pc.id_produto
      ) vendas ON vendas.id_produto = p.id_produto
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql}
      ORDER BY vendas.quantidade_vendida DESC, p.id_produto ASC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: queryReplacements,
        type: QueryTypes.SELECT,
      },
    );

    return res.status(200).json({
      data: ProdutosController.parseCatalogRows(rows as Array<Record<string, unknown>>),
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
    });
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const produto = await Produtos.findByPk(Number(id));

    if (!produto) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }

    return res.status(200).send(produto);
  }

  static async create(req: Request, res: Response) {
    const body = req.body ?? {};
    const hasCategoryField = ProdutosController.hasCategoryField(body);
    const parsedCategoryId = ProdutosController.parseCategoryId(body);
    const id_categoria = hasCategoryField ? parsedCategoryId : null;
    const { nome, descricao = null, preco_base, ativo = true } = body;
    const preco_custo = ProdutosController.parseMoneyValue(body.preco_custo, 0);
    const parsedGradesField = ProdutosController.parseArrayField(body.grades);
    const parsedCoresField = ProdutosController.parseArrayField(body.cores);
    const gradesInput = parsedGradesField ?? [];
    const coresInput = parsedCoresField ?? [];

    if (!nome || preco_base === undefined) {
      return res.status(400).json({ message: "nome e preco_base sao obrigatorios." });
    }

    if (preco_custo === undefined) {
      return res.status(400).json({ message: "preco_custo invalido." });
    }

    if (hasCategoryField && id_categoria === undefined) {
      return res.status(400).json({ message: "id_categoria invalido." });
    }

    if (body.grades !== undefined && parsedGradesField === undefined) {
      return res.status(400).json({ message: "grades deve ser um array." });
    }

    if (body.cores !== undefined && parsedCoresField === undefined) {
      return res.status(400).json({ message: "cores deve ser um array." });
    }

    if (id_categoria !== null) {
      const categoria = await Categorias.findByPk(id_categoria);
      if (!categoria) {
        return res.status(404).json({ message: "Categoria nao encontrada" });
      }
    }

    try {
      const result = await sequelize.transaction(async (transaction) => {
        const produto = await Produtos.create(
          {
            id_categoria,
            nome,
            descricao,
            preco_custo,
            preco_base,
            ativo: Boolean(ativo),
          },
          { transaction },
        );

        const gradesCriadas: ProdutoGrades[] = [];
        for (const grade of gradesInput) {
          const gradeData = (grade as Record<string, unknown>) ?? {};
          const nomeGrade = String(gradeData.nome ?? "").trim();
          if (!nomeGrade) {
            throw new Error("Cada grade precisa de nome.");
          }

          const acrescimoGrade = ProdutosController.parseMoneyValue(gradeData.acrescimo, 0);
          if (acrescimoGrade === undefined) {
            throw new Error(`Acrescimo invalido para a grade "${nomeGrade}".`);
          }

          const gradeCriada = await ProdutoGrades.create(
            {
              id_produto: produto.id_produto,
              nome: nomeGrade,
              acrescimo: acrescimoGrade,
            },
            { transaction },
          );
          gradesCriadas.push(gradeCriada);
        }

        const coresCriadas: ProdutoCores[] = [];
        const fotosCriadas: ProdutoFotos[] = [];

        for (const cor of coresInput) {
          const corData = (cor as Record<string, unknown>) ?? {};
          const nomeCor = String(corData.nome ?? "").trim();
          const codigoRgb = normalizeRgbColor(String(corData.codigo_rgb ?? corData.tonalidade ?? ""));
          if (!nomeCor || !codigoRgb) {
            throw new Error("Cada cor precisa de nome e codigo_rgb (ou tonalidade).");
          }

          const acrescimoCor = ProdutosController.parseMoneyValue(corData.acrescimo, 0);
          if (acrescimoCor === undefined) {
            throw new Error(`Acrescimo invalido para a cor "${nomeCor}".`);
          }

          const corCriada = await ProdutoCores.create(
            {
              id_produto: produto.id_produto,
              nome: nomeCor,
              codigo_rgb: codigoRgb,
              acrescimo: acrescimoCor,
            },
            { transaction },
          );
          coresCriadas.push(corCriada);

          const fotosExistentes = ProdutosController.normalizeExistingFotoPaths(
            corData.fotos,
            nomeCor,
          );
          const fotosUpload = await ProdutosController.saveNewFotoUploads(
            corData.fotos_upload,
            nomeCor,
          );

          for (const caminhoUrl of [...fotosExistentes, ...fotosUpload]) {
            const fotoCriada = await ProdutoFotos.create(
              {
                id_produto: produto.id_produto,
                id_produto_cor: corCriada.id_produto_cor,
                caminho_url: caminhoUrl,
              },
              { transaction },
            );
            fotosCriadas.push(fotoCriada);
          }
        }

        return {
          produto,
          grades: gradesCriadas,
          cores: coresCriadas,
          fotos: fotosCriadas,
        };
      });

      await syncProdutoToSearchIndex(result.produto.id_produto);

      return res.status(201).json({
        ...(result.produto.toJSON() as Record<string, unknown>),
        grades: result.grades,
        cores: result.cores,
        fotos: result.fotos,
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Falha ao criar produto com itens.",
      });
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const productId = Number(id);
    const body = req.body ?? {};
    const hasCategoryField = ProdutosController.hasCategoryField(body);
    const id_categoria = ProdutosController.parseCategoryId(body);
    const hasGradesField = Object.prototype.hasOwnProperty.call(body, "grades");
    const hasCoresField = Object.prototype.hasOwnProperty.call(body, "cores");
    const parsedGradesField = hasGradesField
      ? ProdutosController.parseArrayField(body.grades)
      : undefined;
    const parsedCoresField = hasCoresField
      ? ProdutosController.parseArrayField(body.cores)
      : undefined;
    const gradesInput = parsedGradesField;
    const coresInput = parsedCoresField;
    const { nome, descricao, preco_custo, preco_base, ativo } = body;
    const parsedPrecoCusto =
      preco_custo !== undefined
        ? ProdutosController.parseMoneyValue(preco_custo, 0)
        : undefined;


    if (!Number.isInteger(productId)) {
      return res.status(400).json({ message: "id do produto invalido." });
    }

    const produto = await Produtos.findByPk(productId);
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    if (preco_custo !== undefined && parsedPrecoCusto === undefined) {
      return res.status(400).json({ message: "preco_custo inválido." });
    }

    if (hasCategoryField && id_categoria === undefined) {
      return res.status(400).json({ message: "id_categoria inválido." });
    }

    if (hasGradesField && parsedGradesField === undefined) {
      return res.status(400).json({ message: "grades devem ser um array." });
    }

    if (hasCoresField && parsedCoresField === undefined) {
      return res.status(400).json({ message: "cores devem ser um array." });
    }

    if (hasCategoryField && id_categoria !== null) {
      const categoria = await Categorias.findByPk(id_categoria);
      if (!categoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
    }

    try {
      await sequelize.transaction(async (transaction) => {
        await produto.update(
          {
            id_categoria: hasCategoryField ? id_categoria : produto.id_categoria,
            nome: nome ?? produto.nome,
            descricao: descricao !== undefined ? descricao : produto.descricao,
            preco_custo: parsedPrecoCusto !== undefined ? parsedPrecoCusto : produto.preco_custo,
            preco_base: preco_base !== undefined ? preco_base : produto.preco_base,
            ativo: ativo !== undefined ? Boolean(ativo) : produto.ativo,
          },
          { transaction },
        );

        if (hasGradesField) {
          await ProdutoGrades.destroy({
            where: { id_produto: productId },
            transaction,
          });

          for (const grade of (gradesInput ?? []) as Array<Record<string, unknown>>) {
            const gradeData = grade ?? {};
            const nomeGrade = String(gradeData.nome ?? "").trim();
            if (!nomeGrade) {
              throw new Error("Cada grade precisa de nome.");
            }

            const acrescimoGrade = ProdutosController.parseMoneyValue(gradeData.acrescimo, 0);
            if (acrescimoGrade === undefined) {
              throw new Error(`Acrescimo invalido para a grade "${nomeGrade}".`);
            }

            await ProdutoGrades.create(
              {
                id_produto: productId,
                nome: nomeGrade,
                acrescimo: acrescimoGrade,
              },
              { transaction },
            );
          }
        }

        if (hasCoresField) {
          await ProdutoFotos.destroy({
            where: { id_produto: productId },
            transaction,
          });
          await ProdutoCores.destroy({
            where: { id_produto: productId },
            transaction,
          });

          for (const cor of (coresInput ?? []) as Array<Record<string, unknown>>) {
            const corData = cor ?? {};
            const nomeCor = String(corData.nome ?? "").trim();
            const codigoRgb = normalizeRgbColor(String(corData.codigo_rgb ?? corData.tonalidade ?? ""));
            if (!nomeCor || !codigoRgb) {
              throw new Error("Cada cor precisa de nome e codigo_rgb (ou tonalidade).");
            }

            const acrescimoCor = ProdutosController.parseMoneyValue(corData.acrescimo, 0);
            if (acrescimoCor === undefined) {
              throw new Error(`Acrescimo invalido para a cor "${nomeCor}".`);
            }

            const corCriada = await ProdutoCores.create(
              {
                id_produto: productId,
                nome: nomeCor,
                codigo_rgb: codigoRgb,
                acrescimo: acrescimoCor,
              },
              { transaction },
            );

            const fotosExistentes = ProdutosController.normalizeExistingFotoPaths(
              corData.fotos,
              nomeCor,
            );
            const fotosUpload = await ProdutosController.saveNewFotoUploads(
              corData.fotos_upload,
              nomeCor,
            );

            for (const caminhoUrl of [...fotosExistentes, ...fotosUpload]) {
              await ProdutoFotos.create(
                {
                  id_produto: productId,
                  id_produto_cor: corCriada.id_produto_cor,
                  caminho_url: caminhoUrl,
                },
                { transaction },
              );
            }
          }
        }
      });

      await syncProdutoToSearchIndex(productId);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Falha ao atualizar produto com itens.",
      });
    }

    return res.status(200).send(produto);
  }

  static async remove(req: Request, res: Response) {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({ message: "id do produto invalido." });
    }

    const produto = await Produtos.findByPk(productId);

    if (!produto) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }

    const cores = await ProdutoCores.findAll({
      where: { id_produto: productId },
      attributes: ["id_produto_cor"],
    });
    const grades = await ProdutoGrades.findAll({
      where: { id_produto: productId },
      attributes: ["id_produto_grade"],
    });

    const colorIds = cores.map((cor) => cor.id_produto_cor);
    const gradeIds = grades.map((grade) => grade.id_produto_grade);

    const orderFilters = [
      ...(colorIds.length ? [{ id_produto_cor: { [Op.in]: colorIds } }] : []),
      ...(gradeIds.length ? [{ id_produto_grade: { [Op.in]: gradeIds } }] : []),
    ];
    const orderItemCount = orderFilters.length
      ? await PedidoItens.count({
        where: {
          [Op.or]: orderFilters,
        },
      })
      : 0;

    if (orderItemCount > 0) {
      return res.status(409).json({
        message: "Produto vinculado a pedidos nao pode ser removido. Desative-o em vez de excluir.",
      });
    }

    await sequelize.transaction(async (transaction) => {
      if (orderFilters.length) {
        await CarrinhoItens.destroy({
          where: {
            [Op.or]: orderFilters,
          },
          transaction,
        });
      }

      const reviews = await AvaliacaoProdutos.findAll({
        where: { id_produto: productId },
        attributes: ["id_avaliacao_produto"],
        transaction,
      });
      const reviewIds = reviews.map((review) => review.id_avaliacao_produto);

      if (reviewIds.length) {
        await AvaliacaoFotos.destroy({
          where: { id_avaliacao_produto: { [Op.in]: reviewIds } },
          transaction,
        });
      }

      await AvaliacaoProdutos.destroy({
        where: { id_produto: productId },
        transaction,
      });

      await ProdutoFotos.destroy({
        where: { id_produto: productId },
        transaction,
      });

      await ProdutoCores.destroy({
        where: { id_produto: productId },
        transaction,
      });

      await ProdutoGrades.destroy({
        where: { id_produto: productId },
        transaction,
      });

      await produto.destroy({ transaction });
    });

    await removeProdutoFromSearchIndex(productId);

    return res.status(204).send();
  }
}

export default ProdutosController;
