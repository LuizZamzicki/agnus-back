jest.mock("crypto", () => ({
  __esModule: true,
  randomUUID: jest.fn(() => "uuid"),
}));

jest.mock("fs", () => ({
  __esModule: true,
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

import { promises as fs } from "fs";
import { normalizeFotoPath, saveAvaliacaoFotoUpload } from "../../src/utils/avaliacaoFotoStorage";

type FsPromisesMock = { mkdir: jest.Mock; writeFile: jest.Mock };

const fsMock = fs as typeof fs & FsPromisesMock;

describe("avaliacaoFotoStorage", () => {
  const originalNow = Date.now;

  beforeEach(() => {
    jest.clearAllMocks();
    Date.now = jest.fn(() => 1700000000000);
  });

  afterAll(() => {
    Date.now = originalNow;
  });

  it("normalizeFotoPath remove espacos", () => {
    expect(normalizeFotoPath(" foto.jpg ")).toBe("foto.jpg");
    expect(normalizeFotoPath(undefined)).toBe("");
  });

  it("saveAvaliacaoFotoUpload retorna null para base64 invalido", async () => {
    const upload = { upload_index: 0, nome_original: "foto.jpg", tipo_arquivo: "image/jpeg", tamanho_bytes: 0, arquivo_base64: "" };
    await expect(saveAvaliacaoFotoUpload(upload)).resolves.toBeNull();
    expect(fsMock.mkdir).not.toHaveBeenCalled();
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("saveAvaliacaoFotoUpload salva data URL e base64 bruto", async () => {
    const dataUrlUpload = {
      upload_index: 0, nome_original: "foto.jpg", tipo_arquivo: "image/jpeg", tamanho_bytes: 10,
      arquivo_base64: `data:image/jpeg;base64,${Buffer.from("abc").toString("base64")}`,
    };
    await expect(saveAvaliacaoFotoUpload(dataUrlUpload)).resolves.toBe("avaliacao_fotos/1700000000000-uuid.jpg");
    expect(fsMock.mkdir).toHaveBeenCalled();
    expect(fsMock.writeFile).toHaveBeenCalled();

    const rawBase64Upload = {
      upload_index: 1, nome_original: "foto.png", tipo_arquivo: "image/png", tamanho_bytes: 10,
      arquivo_base64: Buffer.from("def").toString("base64"),
    };
    await expect(saveAvaliacaoFotoUpload(rawBase64Upload)).resolves.toBe("avaliacao_fotos/1700000000000-uuid.png");
  });
});
