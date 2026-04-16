type MockTask = { taskUid: number };
type MockIndex = {
  updateSettings: jest.Mock<Promise<MockTask>>;
  updateSynonyms: jest.Mock<Promise<MockTask>>;
  addDocuments: jest.Mock<Promise<MockTask>>;
  updateDocuments: jest.Mock<Promise<MockTask>>;
  deleteDocument: jest.Mock<Promise<MockTask>>;
  search: jest.Mock<Promise<object>>;
};
type MockClient = {
  health: jest.Mock<Promise<boolean>>;
  createIndex: jest.Mock<Promise<MockTask>>;
  index: jest.Mock<MockIndex, [string]>;
  tasks: { waitForTask: jest.Mock<Promise<void>, [number, { timeout: number; interval: number }]> };
};
type MockDatabase = { query: jest.Mock<Promise<object[]>> };

const buildIndex = (): MockIndex => ({
  updateSettings: jest.fn(),
  updateSynonyms: jest.fn(),
  addDocuments: jest.fn(),
  updateDocuments: jest.fn(),
  deleteDocument: jest.fn(),
  search: jest.fn(),
});

const buildClient = (index: MockIndex): MockClient => ({
  health: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn((_: string) => index),
  tasks: { waitForTask: jest.fn() },
});

const buildDatabase = (): MockDatabase => ({ query: jest.fn() });

describe("produtoSearchIndex.service", () => {
  const originalEnv = process.env;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("retorna false quando o Meilisearch nao esta configurado", async () => {
    delete process.env.MEILISEARCH_URL;
    delete process.env.MEILISEARCH_MASTER_KEY;
    const index = buildIndex(), client = buildClient(index), database = buildDatabase();
    jest.doMock("meilisearch", () => ({ __esModule: true, Meilisearch: jest.fn(() => client) }));
    jest.doMock("../../src/config/database", () => ({ __esModule: true, default: database }));
    const service = await import("../../src/services/produtoSearchIndex.service");
    await expect(service.initializeProdutoSearchIndex()).resolves.toBe(false);
    await expect(service.isProdutoSearchIndexReady()).resolves.toBe(false);
  });

  it("inicializa o indice com configuracao e sinonimos", async () => {
    process.env.MEILISEARCH_URL = "http://localhost:7700";
    process.env.MEILISEARCH_MASTER_KEY = "master-key";
    const index = buildIndex(), client = buildClient(index), database = buildDatabase();
    client.health.mockResolvedValue(true), client.createIndex.mockResolvedValue({ taskUid: 1 });
    index.updateSettings.mockResolvedValue({ taskUid: 2 }), index.updateSynonyms.mockResolvedValue({ taskUid: 3 });
    jest.doMock("meilisearch", () => ({ __esModule: true, Meilisearch: jest.fn(() => client) }));
    jest.doMock("../../src/config/database", () => ({ __esModule: true, default: database }));
    const service = await import("../../src/services/produtoSearchIndex.service");

    await expect(service.initializeProdutoSearchIndex()).resolves.toBe(true);
    expect(client.createIndex).toHaveBeenCalledWith("produtos", { primaryKey: "id_produto" });
    expect(index.updateSettings).toHaveBeenCalled();
    expect(index.updateSynonyms).toHaveBeenCalled();
    expect(client.tasks.waitForTask).toHaveBeenCalledTimes(3);
  });

  it("remove do indice quando o produto nao existe mais no banco", async () => {
    process.env.MEILISEARCH_URL = "http://localhost:7700";
    process.env.MEILISEARCH_MASTER_KEY = "master-key";
    const index = buildIndex(), client = buildClient(index), database = buildDatabase();
    client.health.mockResolvedValue(true), client.createIndex.mockResolvedValue({ taskUid: 1 });
    index.updateSettings.mockResolvedValue({ taskUid: 2 }), index.updateSynonyms.mockResolvedValue({ taskUid: 3 });
    index.deleteDocument.mockResolvedValue({ taskUid: 4 }), database.query.mockResolvedValue([]);
    jest.doMock("meilisearch", () => ({ __esModule: true, Meilisearch: jest.fn(() => client) }));
    jest.doMock("../../src/config/database", () => ({ __esModule: true, default: database }));
    const service = await import("../../src/services/produtoSearchIndex.service");

    await expect(service.syncProdutoToSearchIndex(9)).resolves.toBe(true);
    expect(database.query).toHaveBeenCalled();
    expect(index.deleteDocument).toHaveBeenCalledWith(9);
    expect(index.updateDocuments).not.toHaveBeenCalled();
  });

  it("consulta o indice com filtros e devolve o total encontrado", async () => {
    process.env.MEILISEARCH_URL = "http://localhost:7700";
    process.env.MEILISEARCH_MASTER_KEY = "master-key";
    const index = buildIndex(), client = buildClient(index), database = buildDatabase();
    client.health.mockResolvedValue(true), client.createIndex.mockRejectedValue(new Error("exists"));
    index.updateSettings.mockResolvedValue({ taskUid: 2 }), index.updateSynonyms.mockResolvedValue({ taskUid: 3 });
    index.search.mockResolvedValue({ hits: [{ id_produto: 1, id_categoria: 3, sem_categoria: false, nome: "Camisa", descricao: "", preco_base: 10, ativo: true, categoria_nome: "Moda", quantidade_vendida: 5, imagens: [] }], estimatedTotalHits: 7 });
    jest.doMock("meilisearch", () => ({ __esModule: true, Meilisearch: jest.fn(() => client) }));
    jest.doMock("../../src/config/database", () => ({ __esModule: true, default: database }));
    const service = await import("../../src/services/produtoSearchIndex.service");

    await expect(service.searchProdutosInIndex({ query: "camisa", page: 2, limit: 5, idCategoria: "3", ativo: "true", onlyWithSales: true, sort: ["preco_base:asc"] })).resolves.toEqual({
      data: [{ id_produto: 1, id_categoria: 3, sem_categoria: false, nome: "Camisa", descricao: "", preco_base: 10, ativo: true, categoria_nome: "Moda", quantidade_vendida: 5, imagens: [] }],
      total: 7,
    });
    expect(index.search).toHaveBeenCalledWith("camisa", {
      limit: 5,
      offset: 5,
      filter: ["id_categoria = 3", "ativo = true", "quantidade_vendida > 0"],
      sort: ["preco_base:asc"],
    });
  });
});
