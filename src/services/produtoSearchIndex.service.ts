import "dotenv/config";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";

const { Meilisearch } = require("meilisearch");

export type ProdutoSearchDocument = {
  id_produto: number;
  id_categoria: number | null;
  sem_categoria: boolean;
  nome: string;
  descricao: string;
  preco_base: number;
  ativo: boolean;
  categoria_nome: string | null;
  quantidade_vendida: number;
  imagens: string[];
};

type SearchIndexFilters = {
  idCategoria?: unknown;
  ativo?: unknown;
  onlyWithSales?: boolean;
};

type SearchIndexRequest = SearchIndexFilters & {
  query: string;
  page: number;
  limit: number;
  sort?: string[];
};

const INDEX_UID = process.env.MEILISEARCH_INDEX || "produtos";

const SYNONYMS = {
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

let initPromise: Promise<boolean> | null = null;
let initAttempted = false;

const isConfigured = () =>
  Boolean(process.env.MEILISEARCH_URL) && Boolean(process.env.MEILISEARCH_MASTER_KEY);

const getClient = () =>
  new Meilisearch({
    host: process.env.MEILISEARCH_URL || "",
    apiKey: process.env.MEILISEARCH_MASTER_KEY || "",
  });

const waitForTask = async (taskUid: number) => {
  const client = getClient();
  await client.tasks.waitForTask(taskUid, { timeout: 10000, interval: 50 });
};

const parseBooleanQuery = (value: unknown) => {
  if (value === undefined || Array.isArray(value) || typeof value !== "string") {
    return undefined;
  }

  return value === "true";
};

const parseCategoryFilter = (value: unknown) => {
  if (value === undefined || Array.isArray(value) || typeof value !== "string") {
    return undefined;
  }

  if (value === "null") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildFilterClauses = ({ idCategoria, ativo, onlyWithSales }: SearchIndexFilters) => {
  const clauses: string[] = [];
  const parsedCategory = parseCategoryFilter(idCategoria);
  const parsedAtivo = parseBooleanQuery(ativo);

  if (parsedCategory === null) {
    clauses.push("sem_categoria = true");
  } else if (parsedCategory !== undefined) {
    clauses.push(`id_categoria = ${parsedCategory}`);
  }

  if (parsedAtivo !== undefined) {
    clauses.push(`ativo = ${parsedAtivo}`);
  }

  if (onlyWithSales) {
    clauses.push("quantidade_vendida > 0");
  }

  return clauses;
};

const parseImages = (value: unknown) => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const buildDocumentRow = (row: Record<string, unknown>): ProdutoSearchDocument => ({
  id_produto: Number(row.id_produto),
  id_categoria: row.id_categoria == null ? null : Number(row.id_categoria),
  sem_categoria: row.id_categoria == null,
  nome: String(row.nome ?? ""),
  descricao: String(row.descricao ?? ""),
  preco_base: Number(row.preco_base ?? 0),
  ativo: Boolean(row.ativo),
  categoria_nome: row.categoria_nome == null ? null : String(row.categoria_nome),
  quantidade_vendida: Number(row.quantidade_vendida ?? 0),
  imagens: parseImages(row.imagens_json),
});

const fetchDocumentRows = async (productId?: number) => {
  const whereSql = productId !== undefined ? "WHERE p.id_produto = :id_produto" : "";
  const rows = await sequelize.query(
    `
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
    ${whereSql}
    `,
    {
      replacements: productId !== undefined ? { id_produto: productId } : undefined,
      type: QueryTypes.SELECT,
    },
  );

  return (rows as Array<Record<string, unknown>>).map(buildDocumentRow);
};

export const initializeProdutoSearchIndex = async () => {
  if (!isConfigured()) {
    return false;
  }

  if (initPromise) {
    return initPromise;
  }

  initAttempted = true;
  initPromise = (async () => {
    const client = getClient();
    const index = client.index(INDEX_UID);

    try {
      await client.health();
      try {
        const createTask = await client.createIndex(INDEX_UID, { primaryKey: "id_produto" });
        await waitForTask(createTask.taskUid);
      } catch {
        // Index may already exist.
      }

      const settingsTask = await index.updateSettings({
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
        rankingRules: [
          "words",
          "typo",
          "proximity",
          "attribute",
          "sort",
          "exactness",
        ],
      });
      await waitForTask(settingsTask.taskUid);

      const synonymTask = await index.updateSynonyms(SYNONYMS);
      await waitForTask(synonymTask.taskUid);

      return true;
    } catch (error) {
      console.warn("Meilisearch indisponivel. Busca local sera usada.", error);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
};

export const isProdutoSearchIndexReady = async () => {
  if (!isConfigured()) {
    return false;
  }

  if (!initAttempted) {
    return initializeProdutoSearchIndex();
  }

  return (await initPromise) ?? false;
};

export const syncAllProdutosToSearchIndex = async () => {
  if (!(await isProdutoSearchIndexReady())) {
    return false;
  }

  try {
    const documents = await fetchDocumentRows();
    const index = getClient().index(INDEX_UID);
    const task = await index.addDocuments(documents);
    await waitForTask(task.taskUid);
    return true;
  } catch (error) {
    console.warn("Falha ao sincronizar produtos no Meilisearch.", error);
    return false;
  }
};

export const syncProdutoToSearchIndex = async (productId: number) => {
  if (!(await isProdutoSearchIndexReady())) {
    return false;
  }

  try {
    const documents = await fetchDocumentRows(productId);
    if (documents.length === 0) {
      await removeProdutoFromSearchIndex(productId);
      return true;
    }

    const index = getClient().index(INDEX_UID);
    const task = await index.updateDocuments(documents);
    await waitForTask(task.taskUid);
    return true;
  } catch (error) {
    console.warn(`Falha ao sincronizar produto ${productId} no Meilisearch.`, error);
    return false;
  }
};

export const removeProdutoFromSearchIndex = async (productId: number) => {
  if (!(await isProdutoSearchIndexReady())) {
    return false;
  }

  try {
    const index = getClient().index(INDEX_UID);
    const task = await index.deleteDocument(productId);
    await waitForTask(task.taskUid);
    return true;
  } catch (error) {
    console.warn(`Falha ao remover produto ${productId} do Meilisearch.`, error);
    return false;
  }
};

export const searchProdutosInIndex = async ({
  query,
  page,
  limit,
  idCategoria,
  ativo,
  onlyWithSales = false,
  sort,
}: SearchIndexRequest) => {
  if (!(await isProdutoSearchIndexReady())) {
    return null;
  }

  try {
    const index = getClient().index(INDEX_UID);
    const filterClauses = buildFilterClauses({ idCategoria, ativo, onlyWithSales });
    const result = await index.search(query, {
      limit,
      offset: (page - 1) * limit,
      filter: filterClauses.length > 0 ? filterClauses : undefined,
      sort,
    });

    return {
      data: result.hits,
      total: Number(result.estimatedTotalHits ?? result.totalHits ?? result.hits.length),
    };
  } catch (error) {
    console.warn("Falha na consulta ao Meilisearch. Busca local sera usada.", error);
    return null;
  }
};
