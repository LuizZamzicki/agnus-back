const listenMock = jest.fn((port: number, callback: () => void) => {
  callback();
  return {} as any;
});
const syncMock = jest.fn();

jest.mock("../src/app", () => ({
  __esModule: true,
  default: { listen: listenMock },
}));
jest.mock("../src/config/database", () => ({
  __esModule: true,
  default: { sync: syncMock },
}));

describe("server bootstrap", () => {
  it("inicializa sequelize e starta app", async () => {
    process.env.PORT = "3333";
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await import("../src/server");

    expect(syncMock).toHaveBeenCalledWith({ alter: true });
    expect(listenMock).toHaveBeenCalledWith(3333, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Servidor rodando na porta 3333");
    logSpy.mockRestore();
  });
});
