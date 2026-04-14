const listenMock = jest.fn((port: number, callback: () => void) => {
  callback();
  return {} as any;
});
const syncMock = jest.fn();
const initializeProdutoSearchIndexMock = jest.fn(async () => true);
const syncAllProdutosToSearchIndexMock = jest.fn(async () => true);

jest.mock("../src/app", () => ({
  __esModule: true,
  default: { listen: listenMock },
}));
jest.mock("../src/config/database", () => ({
  __esModule: true,
  default: { sync: syncMock },
}));
jest.mock("../src/services/produtoSearchIndex.service", () => ({
  __esModule: true,
  initializeProdutoSearchIndex: initializeProdutoSearchIndexMock,
  syncAllProdutosToSearchIndex: syncAllProdutosToSearchIndexMock,
}));

describe("server bootstrap", () => {
  it("inicializa sequelize e starta app", async () => {
    process.env.PORT = "3333";
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await import("../src/server");
    await new Promise((resolve) => setImmediate(resolve));

    expect(syncMock).toHaveBeenCalledWith({ alter: true });
    expect(initializeProdutoSearchIndexMock).toHaveBeenCalled();
    expect(syncAllProdutosToSearchIndexMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith(3333, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Servidor rodando na porta 3333");
    logSpy.mockRestore();
  });
});
