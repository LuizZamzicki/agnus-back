import "dotenv/config";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";
import type {
  ProdutoSearchDocument,
  ProdutoSearchFilterInput,
  ProdutoSearchQueryRow,
  ProdutoSearchRequest,
  ProdutoSearchResult,
} from "../types/produto-search-index.types";

type ProdutoSearchLogError = Error | object | string | null;
type ProdutoSearchTaskResult = { taskUid: number };
type ProdutoSearchResponse<T> = {
  hits: T[];
  estimatedTotalHits?: number;
  totalHits?: number;
};
type ProdutoSearchClient = {
  health: () => Promise<object>;
  createIndex: (uid: string, options: { primaryKey: string }) => Promise<ProdutoSearchTaskResult>;
  index: (uid: string) => ProdutoSearchIndex;
  tasks: {
    waitForTask: (
      taskUid: number,
      options: { timeout: number; interval: number },
    ) => Promise<void>;
  };
};
type ProdutoSearchIndex = {
  updateSettings: (settings: object) => Promise<ProdutoSearchTaskResult>;
  updateSynonyms: (synonyms: object) => Promise<ProdutoSearchTaskResult>;
  addDocuments: (documents: ProdutoSearchDocument[]) => Promise<ProdutoSearchTaskResult>;
  updateDocuments: (documents: ProdutoSearchDocument[]) => Promise<ProdutoSearchTaskResult>;
  deleteDocument: (productId: number) => Promise<ProdutoSearchTaskResult>;
  search: <T>(query: string, params: object) => Promise<ProdutoSearchResponse<T>>;
};
const { Meilisearch } = require("meilisearch") as {
  Meilisearch: new (config: { host: string; apiKey: string }) => ProdutoSearchClient;
};

const INDEX_UID = process.env.MEILISEARCH_INDEX || "produtos";
const DOCUMENT_SQL = `
  SELECT
    p.id_produto,
    p.id_categoria,
    p.nome,
    COALESCE(p.descricao, '') AS descricao,
    p.preco_base,
    p.ativo,
    c.nome AS categoria_nome,
    COALESCE(vendas.quantidade_vendida, 0) AS quantidade_vendida,
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
  LEFT JOIN (
    SELECT
      pc.id_produto,
      SUM(pi.quantidade) AS quantidade_vendida
    FROM pedido_itens pi
    INNER JOIN pedidos pe ON pe.id_pedido = pi.id_pedido
    INNER JOIN produto_cores pc ON pc.id_produto_cor = pi.id_produto_cor
    WHERE pe.status IN ('pago', 'enviado', 'entregue')
    GROUP BY pc.id_produto
  ) vendas ON vendas.id_produto = p.id_produto
  __WHERE__
`;
const SYNONYMS: Record<string, string[]> = {
  camisa: ["camiseta", "baby look", "babylook", "blusa"],
  camiseta: ["camisa", "baby look", "babylook", "blusa"],
  blusa: ["camisa", "camiseta", "baby look", "babylook"],
  "baby look": ["camisa", "camiseta", "blusa", "babylook"],
  babylook: ["camisa", "camiseta", "blusa", "baby look"],
  calca: ["jeans", "denim"],
  jeans: ["calca", "denim"],
  denim: ["calca", "jeans"],
  bermuda: ["short", "shorts"],
  short: ["bermuda", "shorts"],
  shorts: ["bermuda", "short"],
  moletom: ["casaco", "blusao", "jaqueta"],
  casaco: ["moletom", "blusao", "jaqueta"],
  blusao: ["moletom", "casaco", "jaqueta"],
  jaqueta: ["moletom", "casaco", "blusao"],
  tenis: ["sapatilha", "sapato", "calcado"],
  sapatilha: ["tenis", "sapato", "calcado"],
  sapato: ["tenis", "sapatilha", "calcado"],
  calcado: ["tenis", "sapatilha", "sapato"],
};

class ProdutoSearchIndexService {
  private static initPromise: Promise<boolean> | null = null;
  private static initAttempted = false;

  static isConfigured() {
    return Boolean(process.env.MEILISEARCH_URL) && Boolean(process.env.MEILISEARCH_MASTER_KEY);
  }

  static getClient() {
    return new Meilisearch({
      host: process.env.MEILISEARCH_URL || "",
      apiKey: process.env.MEILISEARCH_MASTER_KEY || "",
    });
  }

  static getIndex() {
    return ProdutoSearchIndexService.getClient().index(INDEX_UID);
  }

  static async waitForTask(task: ProdutoSearchTaskResult) {
    await ProdutoSearchIndexService.getClient().tasks.waitForTask(task.taskUid, {
      timeout: 10000,
      interval: 50,
    });
  }

  static parseBooleanQuery(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    return value === "true";
  }

  static parseCategoryFilter(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    if (value === "null") {
      return null;
    }

    const parsedCategory = Number(value);

    return Number.isNaN(parsedCategory) ? undefined : parsedCategory;
  }

  static buildFilterClauses({ idCategoria, ativo, onlyWithSales }: ProdutoSearchFilterInput) {
    const clauses: string[] = [];
    const parsedCategory = ProdutoSearchIndexService.parseCategoryFilter(idCategoria);
    const parsedAtivo = ProdutoSearchIndexService.parseBooleanQuery(ativo);

    if (parsedCategory === null) {
      clauses.push("sem_categoria = true");
    }

    if (parsedCategory !== null && parsedCategory !== undefined) {
      clauses.push(`id_categoria = ${parsedCategory}`);
    }

    if (parsedAtivo !== undefined) {
      clauses.push(`ativo = ${parsedAtivo}`);
    }

    if (onlyWithSales) {
      clauses.push("quantidade_vendida > 0");
    }

    return clauses;
  }

  static parseImages(value: string | null) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  static buildDocumentRow(row: ProdutoSearchQueryRow): ProdutoSearchDocument {
    return {
      id_produto: Number(row.id_produto),
      id_categoria: row.id_categoria == null ? null : Number(row.id_categoria),
      sem_categoria: row.id_categoria == null,
      nome: row.nome ?? "",
      descricao: row.descricao ?? "",
      preco_base: Number(row.preco_base ?? 0),
      ativo: Boolean(row.ativo),
      categoria_nome: row.categoria_nome,
      quantidade_vendida: Number(row.quantidade_vendida ?? 0),
      imagens: ProdutoSearchIndexService.parseImages(row.imagens_json),
    };
  }

  static buildDocumentSql(productId?: number) {
    return DOCUMENT_SQL.replace(
      "__WHERE__",
      productId === undefined ? "" : "WHERE p.id_produto = :id_produto",
    );
  }

  static async fetchDocumentRows(productId?: number) {
    const replacements = productId === undefined ? undefined : { id_produto: productId };
    const rows = await sequelize.query<ProdutoSearchQueryRow>(
      ProdutoSearchIndexService.buildDocumentSql(productId),
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    return rows.map(ProdutoSearchIndexService.buildDocumentRow);
  }

  static async createIndexIfNeeded() {
    try {
      await ProdutoSearchIndexService.waitForTask(
        await ProdutoSearchIndexService.getClient().createIndex(INDEX_UID, {
          primaryKey: "id_produto",
        }),
      );
    } catch {
      return;
    }
  }

  static async updateSettings() {
    await ProdutoSearchIndexService.waitForTask(
      await ProdutoSearchIndexService.getIndex().updateSettings({
        searchableAttributes: ["nome", "descricao", "categoria_nome"],
        filterableAttributes: ["ativo", "id_categoria", "sem_categoria", "quantidade_vendida"],
        sortableAttributes: ["quantidade_vendida", "preco_base", "id_produto"],
        displayedAttributes: [
          "id_produto",
          "id_categoria",
          "nome",
          "descricao",
          "preco_base",
          "ativo",
          "categoria_nome",
          "quantidade_vendida",
          "imagens",
        ],
        rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
      }),
    );
  }

  static async updateSynonyms() {
    await ProdutoSearchIndexService.waitForTask(
      await ProdutoSearchIndexService.getIndex().updateSynonyms(SYNONYMS),
    );
  }

  static async initialize() {
    if (!ProdutoSearchIndexService.isConfigured()) {
      return false;
    }

    if (ProdutoSearchIndexService.initPromise) {
      return ProdutoSearchIndexService.initPromise;
    }

    ProdutoSearchIndexService.initAttempted = true;
    ProdutoSearchIndexService.initPromise = ProdutoSearchIndexService.runInitialization();

    return ProdutoSearchIndexService.initPromise;
  }

  static async runInitialization() {
    try {
      await ProdutoSearchIndexService.getClient().health();
      await ProdutoSearchIndexService.createIndexIfNeeded();
      await ProdutoSearchIndexService.updateSettings();
      await ProdutoSearchIndexService.updateSynonyms();
      return true;
    } catch (error) {
      return ProdutoSearchIndexService.handleInitError(error instanceof Error ? error : String(error));
    }
  }

  static handleInitError(error: ProdutoSearchLogError) {
    console.warn("Meilisearch indisponivel. Busca local sera usada.", error);
    ProdutoSearchIndexService.initPromise = null;
    return false;
  }

  static async isReady() {
    if (!ProdutoSearchIndexService.isConfigured()) {
      return false;
    }

    if (!ProdutoSearchIndexService.initAttempted) {
      return ProdutoSearchIndexService.initialize();
    }

    return (await ProdutoSearchIndexService.initPromise) ?? false;
  }

  static async syncAll() {
    if (!(await ProdutoSearchIndexService.isReady())) {
      return false;
    }

    try {
      return ProdutoSearchIndexService.writeAllDocuments(
        await ProdutoSearchIndexService.fetchDocumentRows(),
      );
    } catch (error) {
      return ProdutoSearchIndexService.handleSyncError(
        "Falha ao sincronizar produtos no Meilisearch.",
        error instanceof Error ? error : String(error),
      );
    }
  }

  static async writeAllDocuments(documents: ProdutoSearchDocument[]) {
    await ProdutoSearchIndexService.waitForTask(
      await ProdutoSearchIndexService.getIndex().addDocuments(documents),
    );

    return true;
  }

  static async syncOne(productId: number) {
    if (!(await ProdutoSearchIndexService.isReady())) {
      return false;
    }

    try {
      return ProdutoSearchIndexService.syncSingleDocument(
        productId,
        await ProdutoSearchIndexService.fetchDocumentRows(productId),
      );
    } catch (error) {
      return ProdutoSearchIndexService.handleSyncError(
        `Falha ao sincronizar produto ${productId} no Meilisearch.`,
        error instanceof Error ? error : String(error),
      );
    }
  }

  static async syncSingleDocument(productId: number, documents: ProdutoSearchDocument[]) {
    if (!documents.length) {
      return ProdutoSearchIndexService.removeOne(productId);
    }

    await ProdutoSearchIndexService.waitForTask(
      await ProdutoSearchIndexService.getIndex().updateDocuments(documents),
    );

    return true;
  }

  static async removeOne(productId: number) {
    if (!(await ProdutoSearchIndexService.isReady())) {
      return false;
    }

    try {
      await ProdutoSearchIndexService.waitForTask(
        await ProdutoSearchIndexService.getIndex().deleteDocument(productId),
      );

      return true;
    } catch (error) {
      return ProdutoSearchIndexService.handleSyncError(
        `Falha ao remover produto ${productId} do Meilisearch.`,
        error instanceof Error ? error : String(error),
      );
    }
  }

  static handleSyncError(message: string, error: ProdutoSearchLogError) {
    console.warn(message, error);
    return false;
  }

  static async search(request: ProdutoSearchRequest): Promise<ProdutoSearchResult | null> {
    if (!(await ProdutoSearchIndexService.isReady())) {
      return null;
    }

    try {
      return ProdutoSearchIndexService.runSearch(request);
    } catch (error) {
      return ProdutoSearchIndexService.handleSearchError(
        error instanceof Error ? error : String(error),
      );
    }
  }

  static async runSearch(request: ProdutoSearchRequest) {
    const response = await ProdutoSearchIndexService.getIndex().search<ProdutoSearchDocument>(
      request.query,
      ProdutoSearchIndexService.buildSearchParams(request),
    );

    return {
      data: response.hits,
      total: ProdutoSearchIndexService.getSearchTotal(response),
    };
  }

  static buildSearchParams(request: ProdutoSearchRequest) {
    const filter = ProdutoSearchIndexService.buildFilterClauses(request);

    return {
      limit: request.limit,
      offset: (request.page - 1) * request.limit,
      filter: filter.length ? filter : undefined,
      sort: request.sort,
    };
  }

  static getSearchTotal(response: ProdutoSearchResponse<ProdutoSearchDocument>) {
    return Number(response.estimatedTotalHits ?? response.totalHits ?? response.hits.length);
  }

  static handleSearchError(error: ProdutoSearchLogError) {
    console.warn("Falha na consulta ao Meilisearch. Busca local sera usada.", error);
    return null;
  }
}

export const initializeProdutoSearchIndex = async () => {
  return ProdutoSearchIndexService.initialize();
};
export const isProdutoSearchIndexReady = async () => {
  return ProdutoSearchIndexService.isReady();
};
export const syncAllProdutosToSearchIndex = async () => {
  return ProdutoSearchIndexService.syncAll();
};
export const syncProdutoToSearchIndex = async (productId: number) => {
  return ProdutoSearchIndexService.syncOne(productId);
};
export const removeProdutoFromSearchIndex = async (productId: number) => {
  return ProdutoSearchIndexService.removeOne(productId);
};
export const searchProdutosInIndex = async (request: ProdutoSearchRequest) => {
  return ProdutoSearchIndexService.search(request);
};
