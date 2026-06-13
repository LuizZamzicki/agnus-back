import { QueryTypes } from "sequelize";
import sequelize from "../config/database";
import Produtos from "../models/Produtos";
import type {
  CatalogFilters,
  CatalogQueryRow,
  ProdutoCatalogResponse,
  ProdutoControllerError,
  ProdutoIndexSearchInput,
  ProdutoIndexSearchResult,
  ProdutoQuery,
  ProdutoSalesStatus,
  SearchCatalogRow,
  SqlReplacement,
} from "../types/produto.types";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";
import { searchProdutosInIndex } from "./produtoSearchIndex.service";

class ProdutoCatalogService {
  static readonly SALES_ORDER_STATUSES: ProdutoSalesStatus[] = ["pago", "enviado", "entregue"];

  static parseSearchTerms(query: ProdutoQuery) {
    return ProdutoCatalogService.getRawSearchValue(query)
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
  }

  static getRawSearchValue(query: ProdutoQuery) {
    return (query.q ?? query.search ?? query.busca ?? query.descricao ?? "").trim();
  }

  static buildBaseFilters(query: ProdutoQuery): CatalogFilters | ProdutoControllerError {
    const pagination = parsePagination(query);
    const replacements: Record<string, SqlReplacement> = {};
    const whereClauses: string[] = [];

    if (!pagination) {
      return { message: "page e limit devem ser inteiros positivos." };
    }

    const categoryMessage = ProdutoCatalogService.applyCategoryFilter(
      query.id_categoria,
      whereClauses,
      replacements,
    );
    const activeMessage = ProdutoCatalogService.applyActiveFilter(
      query.ativo,
      whereClauses,
      replacements,
    );

    if (categoryMessage || activeMessage) {
      return { message: categoryMessage ?? activeMessage ?? "" };
    }

    return {
      pagination,
      whereSql: whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "",
      replacements,
    };
  }

  static applyCategoryFilter(
    category: string | undefined,
    whereClauses: string[],
    replacements: Record<string, SqlReplacement>,
  ) {
    if (category === undefined) {
      return null;
    }

    if (category === "null") {
      whereClauses.push("p.id_categoria IS NULL");
      return null;
    }

    const parsedCategoryId = Number(category);

    if (Number.isNaN(parsedCategoryId)) {
      return "id_categoria invalido.";
    }

    whereClauses.push("p.id_categoria = :id_categoria");
    replacements.id_categoria = parsedCategoryId;
    return null;
  }

  static applyActiveFilter(
    active: string | undefined,
    whereClauses: string[],
    replacements: Record<string, SqlReplacement>,
  ) {
    if (active === undefined) {
      return null;
    }

    whereClauses.push("p.ativo = :ativo");
    replacements.ativo = active === "true";
    return null;
  }

  static buildFindAllWhere(query: ProdutoQuery) {
    const pagination = parsePagination(query);
    const where: Record<string, boolean | number | null> = {};

    if (!pagination) {
      return { message: "page e limit devem ser inteiros positivos." };
    }

    const categoryMessage = ProdutoCatalogService.applyFindAllCategory(query.id_categoria, where);

    if (categoryMessage) {
      return { message: categoryMessage };
    }

    if (query.ativo !== undefined) {
      where.ativo = query.ativo === "true";
    }

    return { pagination, where };
  }

  static applyFindAllCategory(
    category: string | undefined,
    where: Record<string, boolean | number | null>,
  ) {
    if (category === undefined) {
      return null;
    }

    if (category === "null") {
      where.id_categoria = null;
      return null;
    }

    const parsedCategoryId = Number(category);

    if (Number.isNaN(parsedCategoryId)) {
      return "id_categoria invalido.";
    }

    where.id_categoria = parsedCategoryId;
    return null;
  }

  static async findAll(query: ProdutoQuery): Promise<ProdutoCatalogResponse | ProdutoControllerError> {
    if (ProdutoCatalogService.parseSearchTerms(query).length) {
      return ProdutoCatalogService.searchFindAll(query);
    }

    const filters = ProdutoCatalogService.buildFindAllWhere(query);

    if ("message" in filters && filters.message) {
      return { message: filters.message };
    }

    const where = filters.where;
    const pagination = filters.pagination!;
    const result = await Produtos.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [["id_produto", "ASC"]],
    });

    return {
      data: result.rows as object[],
      pagination: buildPaginationMeta(pagination.page, pagination.limit, result.count),
    };
  }

  static async catalog(query: ProdutoQuery): Promise<ProdutoCatalogResponse | ProdutoControllerError> {
    if (ProdutoCatalogService.parseSearchTerms(query).length) {
      return ProdutoCatalogService.searchCatalog(query);
    }

    const filters = ProdutoCatalogService.buildBaseFilters(query);

    if ("message" in filters) {
      return filters;
    }

    return ProdutoCatalogService.runCatalogQuery(filters);
  }

  static async bestSellers(query: ProdutoQuery): Promise<ProdutoCatalogResponse | ProdutoControllerError> {
    if (ProdutoCatalogService.parseSearchTerms(query).length) {
      return ProdutoCatalogService.searchCatalog(query, {
        onlyWithSales: true,
        preferSales: true,
      });
    }

    const filters = ProdutoCatalogService.buildBaseFilters(query);

    if ("message" in filters) {
      return filters;
    }

    return ProdutoCatalogService.runBestSellerQuery(filters);
  }

  static async findById(productId: number) {
    const produto = await Produtos.findByPk(productId);

    return produto
      ? { data: produto }
      : { message: "Produto nao encontrado", status: 404 };
  }

  static async searchFindAll(query: ProdutoQuery): Promise<ProdutoCatalogResponse | ProdutoControllerError> {
    const filters = ProdutoCatalogService.buildBaseFilters(query);

    if ("message" in filters) {
      return filters;
    }

    const result = await ProdutoCatalogService.searchIndex({
      query: ProdutoCatalogService.getRawSearchValue(query),
      page: filters.pagination.page,
      limit: filters.pagination.limit,
      idCategoria: query.id_categoria,
      ativo: query.ativo,
    });

    return result ?? { message: "Busca indisponivel no momento.", status: 503 };
  }

  static async searchCatalog(
    query: ProdutoQuery,
    options: { onlyWithSales?: boolean; preferSales?: boolean } = {},
  ): Promise<ProdutoCatalogResponse | ProdutoControllerError> {
    const filters = ProdutoCatalogService.buildBaseFilters(query);

    if ("message" in filters) {
      return filters;
    }

    const result = await ProdutoCatalogService.searchIndex(
      {
        query: ProdutoCatalogService.getRawSearchValue(query),
        page: filters.pagination.page,
        limit: filters.pagination.limit,
        idCategoria: query.id_categoria,
        ativo: query.ativo,
        onlyWithSales: options.onlyWithSales,
        sort: options.preferSales ? ["quantidade_vendida:desc", "id_produto:asc"] : undefined,
      },
      options.preferSales,
    );

    return result ?? { message: "Busca indisponivel no momento.", status: 503 };
  }

  static async searchIndex(input: ProdutoIndexSearchInput, stripDecorators = false) {
    const result = await searchProdutosInIndex(input) as ProdutoIndexSearchResult | null;

    if (!result) {
      return null;
    }

    return {
      data: stripDecorators
        ? result.data.map(ProdutoCatalogService.stripSearchDecorators)
        : result.data,
      pagination: buildPaginationMeta(input.page, input.limit, result.total),
    };
  }

  static stripSearchDecorators(row: SearchCatalogRow) {
    const { categoria_nome, quantidade_vendida, imagens, imagens_json, ...produto } = row;
    return produto as SearchCatalogRow;
  }

  static async runCatalogQuery(filters: CatalogFilters): Promise<ProdutoCatalogResponse> {
    const total = await ProdutoCatalogService.queryCatalogCount(
      filters.whereSql,
      filters.replacements,
    );
    const rows = await ProdutoCatalogService.queryCatalogRows(filters);

    return {
      data: ProdutoCatalogService.parseCatalogRows(rows),
      pagination: buildPaginationMeta(filters.pagination.page, filters.pagination.limit, total),
    };
  }

  static async runBestSellerQuery(filters: CatalogFilters): Promise<ProdutoCatalogResponse> {
    const total = await ProdutoCatalogService.queryBestSellerCount(filters);
    const rows = await ProdutoCatalogService.queryBestSellerRows(filters);

    return {
      data: ProdutoCatalogService.parseCatalogRows(rows),
      pagination: buildPaginationMeta(filters.pagination.page, filters.pagination.limit, total),
    };
  }

  static async queryCatalogCount(whereSql: string, replacements: Record<string, SqlReplacement>) {
    const countRows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM produtos p ${whereSql}`,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    ) as Array<{ total?: number | string }>;

    return Number(countRows[0]?.total ?? 0);
  }

  static async queryCatalogRows(filters: CatalogFilters) {
    return sequelize.query(
      ProdutoCatalogService.buildCatalogSql(filters.whereSql),
      {
        replacements: ProdutoCatalogService.withPagination(filters),
        type: QueryTypes.SELECT,
      },
    ) as Promise<CatalogQueryRow[]>;
  }

  static async queryBestSellerCount(filters: CatalogFilters) {
    const sql = ProdutoCatalogService.buildBestSellerCountSql(filters.whereSql);
    const rows = await sequelize.query(
      sql,
      {
        replacements: filters.replacements,
        type: QueryTypes.SELECT,
      },
    ) as Array<{ total?: number | string }>;

    return Number(rows[0]?.total ?? 0);
  }

  static async queryBestSellerRows(filters: CatalogFilters) {
    return sequelize.query(
      ProdutoCatalogService.buildBestSellerSql(filters.whereSql),
      {
        replacements: ProdutoCatalogService.withPagination(filters),
        type: QueryTypes.SELECT,
      },
    ) as Promise<CatalogQueryRow[]>;
  }

  static withPagination(filters: CatalogFilters) {
    return {
      ...filters.replacements,
      limit: filters.pagination.limit,
      offset: filters.pagination.offset,
    };
  }

  static parseCatalogRows(rows: CatalogQueryRow[]) {
    return rows.map((row) => ({
      ...row,
      imagens: ProdutoCatalogService.parseImages(row.imagens_json),
      imagens_json: undefined,
    }));
  }

  static parseImages(value: string) {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  static buildCatalogSql(whereSql: string) {
    return `
      SELECT p.id_produto, p.nome, p.preco_base, p.ativo, p.id_categoria, c.nome AS categoria_nome,
      IFNULL(CONCAT('[',(SELECT GROUP_CONCAT(JSON_QUOTE(pf.caminho_url) ORDER BY pf.id_produto_foto ASC SEPARATOR ',') FROM produto_fotos pf WHERE pf.id_produto = p.id_produto),']'),'[]') AS imagens_json
      FROM produtos p LEFT JOIN categorias c ON c.id_categoria = p.id_categoria ${whereSql}
      ORDER BY p.id_produto ASC LIMIT :limit OFFSET :offset
    `;
  }

  static buildBestSellerCountSql(whereSql: string) {
    const statuses = ProdutoCatalogService.salesStatusesSql();
    return `
      SELECT COUNT(*) AS total FROM (
        SELECT p.id_produto FROM produtos p INNER JOIN produto_cores pc ON pc.id_produto = p.id_produto
        INNER JOIN pedido_itens pi ON pi.id_produto_cor = pc.id_produto_cor INNER JOIN pedidos pe ON pe.id_pedido = pi.id_pedido
        ${whereSql ? `${whereSql} AND pe.status IN (${statuses})` : `WHERE pe.status IN (${statuses})`} GROUP BY p.id_produto
      ) AS produtos_mais_vendidos
    `;
  }

  static buildBestSellerSql(whereSql: string) {
    const statuses = ProdutoCatalogService.salesStatusesSql();
    return `
      SELECT p.id_produto, p.nome, p.preco_base, p.ativo, p.id_categoria, c.nome AS categoria_nome, vendas.quantidade_vendida,
      IFNULL(CONCAT('[',(SELECT GROUP_CONCAT(JSON_QUOTE(pf.caminho_url) ORDER BY pf.id_produto_foto ASC SEPARATOR ',') FROM produto_fotos pf WHERE pf.id_produto = p.id_produto),']'),'[]') AS imagens_json
      FROM produtos p INNER JOIN (
        SELECT pc.id_produto, SUM(pi.quantidade) AS quantidade_vendida FROM pedido_itens pi
        INNER JOIN pedidos pe ON pe.id_pedido = pi.id_pedido INNER JOIN produto_cores pc ON pc.id_produto_cor = pi.id_produto_cor
        WHERE pe.status IN (${statuses}) GROUP BY pc.id_produto
      ) vendas ON vendas.id_produto = p.id_produto LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql} ORDER BY vendas.quantidade_vendida DESC, p.id_produto ASC LIMIT :limit OFFSET :offset
    `;
  }

  static salesStatusesSql() {
    return ProdutoCatalogService.SALES_ORDER_STATUSES.map((status) => `'${status}'`).join(", ");
  }
}

export default ProdutoCatalogService;
