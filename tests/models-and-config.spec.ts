describe("models e config bootstrap", () => {
  it("carrega config.js", () => {
    const configJs = require("../src/config/config.js");
    expect(configJs.development).toBeDefined();
    expect(configJs.development.dialect).toBe("mysql");
  });

  it("carrega config.json", () => {
    const dbConfigJson = require("../src/config/config.json");
    expect(dbConfigJson.development.database).toBe("agnus");
  });

  it("carrega sequelize", async () => {
    const sequelize = (await import("../src/config/database")).default;
    expect(sequelize).toBeDefined();
  });

  it("carrega os modelos TypeScript", async () => {
    expect((await import("../src/models/AvaliacaoFotos")).default).toBeDefined();
    expect((await import("../src/models/AvaliacaoProdutos")).default).toBeDefined();
    expect((await import("../src/models/CarrinhoItens")).default).toBeDefined();
    expect((await import("../src/models/Carrinhos")).default).toBeDefined();
    expect((await import("../src/models/Categorias")).default).toBeDefined();
    expect((await import("../src/models/PedidoItens")).default).toBeDefined();
    expect((await import("../src/models/Pedidos")).default).toBeDefined();
    expect((await import("../src/models/ProdutoCores")).default).toBeDefined();
    expect((await import("../src/models/ProdutoFotos")).default).toBeDefined();
    expect((await import("../src/models/ProdutoGrades")).default).toBeDefined();
    expect((await import("../src/models/Produtos")).default).toBeDefined();
    expect((await import("../src/models/UsuarioContatos")).default).toBeDefined();
    expect((await import("../src/models/UsuarioEnderecos")).default).toBeDefined();
    expect((await import("../src/models/Usuarios")).default).toBeDefined();
    expect((await import("../src/models/UsuarioSenhasHistorico")).default).toBeDefined();
  });

  it("carrega models/index.js com bootstrap do sequelize-cli", () => {
    jest.resetModules();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.DB_URL = process.env.DB_URL || "mysql://root@localhost/agnus";
    const db = require("../src/models/index.js");
    expect(db).toBeDefined();
    expect(db.sequelize).toBeDefined();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("models/index.js usa use_env_variable", () => {
    jest.resetModules();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    process.env.DB_URL = "mysql://root@localhost/agnus";
    const db = require("../src/models/index.js");
    expect(db).toBeDefined();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("models/index.js carrega model dinamico e executa associate", () => {
    jest.resetModules();
    const previousNodeEnv = process.env.NODE_ENV, fsMock = { readdirSync: jest.fn(() => ["dummy.js"]) }, sequelizeCtor = jest.fn(() => ({ mocked: true })), associateMock = jest.fn(), path = require("path"), dummyAbsPath = path.join(process.cwd(), "src", "models", "dummy.js");
    jest.doMock("fs", () => fsMock);
    jest.doMock("sequelize", () => sequelizeCtor);
    jest.doMock(dummyAbsPath, () => () => ({ name: "DummyModel", associate: associateMock }), { virtual: true });
    process.env.NODE_ENV = "test";
    process.env.DB_URL = "mysql://root@localhost/agnus";
    const db = require("../src/models/index.js");
    expect(db.DummyModel).toBeDefined();
    expect(associateMock).toHaveBeenCalledWith(db);
    process.env.NODE_ENV = previousNodeEnv;
  });
});
