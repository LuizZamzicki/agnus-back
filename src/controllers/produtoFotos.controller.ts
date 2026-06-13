import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import Produtos from "../models/Produtos";
import type {
  ProdutoFotoBody,
  ProdutoFotoFiles,
  ProdutoFotoPathInput,
  ProdutoFotoRouteParams,
  ProdutoFotoSourceInput,
  ProdutoFotoUpdateData,
} from "../types/produto-foto.types";
import { saveProdutoFotoBits } from "../utils/produtoFotoStorage";

type ProdutoFotoRequest = Request<ProdutoFotoRouteParams, object, ProdutoFotoBody>;
type ProdutoFotoRequestWithFiles = ProdutoFotoRequest & { files?: ProdutoFotoFiles };

class ProdutoFotoPayload {
  constructor(private readonly body: ProdutoFotoBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get productId() {
    return this.parseId(this.body.id_produto);
  }

  get colorId() {
    return this.parseId(this.body.id_produto_cor);
  }

  get fotoInput() {
    return this.body.caminho_url ?? this.body.caminhoUrl;
  }

  hasProductField() {
    return this.body.id_produto !== undefined;
  }

  hasColorField() {
    return this.body.id_produto_cor !== undefined;
  }

  hasPhotoField() {
    return this.body.caminho_url !== undefined || this.body.caminhoUrl !== undefined;
  }
}

class ProdutoFotosController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getUploadedFiles(req: ProdutoFotoRequestWithFiles) {
    if (!req.files) {
      return [];
    }

    return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  }

  private static getFileKey(payload: ProdutoFotoPayload) {
    return typeof payload.fotoInput === "string" && !payload.fotoInput.startsWith("http")
      ? payload.fotoInput
      : undefined;
  }

  private static findUploadedFile(req: ProdutoFotoRequestWithFiles, fileKey?: string) {
    const files = ProdutoFotosController.getUploadedFiles(req);

    if (!files.length || !fileKey) {
      return files[0];
    }

    return files.find((file) =>
      file.fieldname === fileKey || file.originalname === fileKey
    ) ?? files[0];
  }

  private static parseFotoUrl(foto?: ProdutoFotoSourceInput) {
    if (typeof foto === "string") {
      return foto.trim();
    }

    if (
      !foto ||
      typeof foto !== "object" ||
      Buffer.isBuffer(foto) ||
      Array.isArray(foto) ||
      "fieldname" in foto
    ) {
      return "";
    }

    return "arquivo_base64" in foto ? "" : ProdutoFotosController.parseFotoUrlObject(foto);
  }

  private static parseFotoUrlObject(foto: ProdutoFotoPathInput) {
    return foto.caminho_url?.trim() || foto.caminhoUrl?.trim() || "";
  }

  private static async resolveFotoPath(foto?: ProdutoFotoSourceInput) {
    return (await saveProdutoFotoBits(foto)) ?? ProdutoFotosController.parseFotoUrl(foto);
  }

  private static getCreateErrorMessage(payload: ProdutoFotoPayload, photoPath: string) {
    if (!payload.hasProductField() || !payload.hasColorField() || !photoPath) {
      return "id_produto, id_produto_cor e caminho_url (ou bits) sao obrigatorios.";
    }

    if (!payload.productId) {
      return "id_produto invalido.";
    }

    if (!payload.colorId) {
      return "id_produto_cor invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: ProdutoFotoPayload, photoPath?: string) {
    if (payload.hasProductField() && !payload.productId) {
      return "id_produto invalido.";
    }

    if (payload.hasColorField() && !payload.colorId) {
      return "id_produto_cor invalido.";
    }

    if (payload.hasPhotoField() && !photoPath) {
      return "caminho_url invalido.";
    }

    return null;
  }

  private static async findProductError(productId?: number | null) {
    return productId && !(await Produtos.findByPk(productId))
      ? "Produto nao encontrado."
      : null;
  }

  private static async findColor(productId: number, colorId: number) {
    const cor = await ProdutoCores.findByPk(colorId);

    if (!cor) {
      return { message: "Cor do produto nao encontrada.", status: 404 };
    }

    return cor.id_produto === productId
      ? cor
      : {
          message: "A cor informada nao pertence ao produto informado.",
          status: 400,
        };
  }

  private static buildUpdateData(
    foto: ProdutoFotos,
    payload: ProdutoFotoPayload,
    photoPath?: string,
  ): ProdutoFotoUpdateData {
    return {
      id_produto: payload.productId ?? foto.id_produto,
      id_produto_cor: payload.colorId ?? foto.id_produto_cor,
      caminho_url: photoPath ?? foto.caminho_url,
    };
  }

  static async getByIdProduto(req: ProdutoFotoRequest, res: Response) {
    const productId = ProdutoFotosController.parsePositiveId(req.params.id_produto);

    if (!productId) {
      return res.status(400).json({ message: "ID do produto invalido." });
    }

    const fotos = await ProdutoFotos.findAll({ where: { id_produto: productId } });

    if (!fotos) {
      return res.status(404).json({ message: "Foto do produto nao encontrada." });
    }

    return res.status(200).send(fotos);
  }

  static async create(req: ProdutoFotoRequestWithFiles, res: Response) {
    const payload = new ProdutoFotoPayload(req.body);
    const photoPath = await ProdutoFotosController.resolveFotoPath(
      ProdutoFotosController.findUploadedFile(
        req,
        ProdutoFotosController.getFileKey(payload),
      ) ?? payload.fotoInput,
    );
    const message = ProdutoFotosController.getCreateErrorMessage(payload, photoPath);

    if (message) {
      return res.status(400).json({ message });
    }

    const productMessage = await ProdutoFotosController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    const colorResult = await ProdutoFotosController.findColor(
      payload.productId!,
      payload.colorId!,
    );

    if ("message" in colorResult) {
      return res.status(colorResult.status).json({ message: colorResult.message });
    }

    return res.status(201).send(
      await ProdutoFotos.create({
        id_produto: payload.productId!,
        id_produto_cor: payload.colorId!,
        caminho_url: photoPath,
      }),
    );
  }

  static async update(req: ProdutoFotoRequestWithFiles, res: Response) {
    const photoId = ProdutoFotosController.parsePositiveId(req.params.id);
    const payload = new ProdutoFotoPayload(req.body);

    if (!photoId) {
      return res.status(400).json({ message: "ID da foto invalido." });
    }

    const foto = await ProdutoFotos.findByPk(photoId);
    const shouldResolvePhoto =
      payload.hasPhotoField() || ProdutoFotosController.getUploadedFiles(req).length;
    const photoPath = shouldResolvePhoto
      ? await ProdutoFotosController.resolveFotoPath(
          ProdutoFotosController.findUploadedFile(
            req,
            ProdutoFotosController.getFileKey(payload),
          ) ?? payload.fotoInput,
        )
      : undefined;
    const message = ProdutoFotosController.getUpdateErrorMessage(payload, photoPath);

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto nao encontrada." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const productId = payload.productId ?? foto.id_produto;
    const colorId = payload.colorId ?? foto.id_produto_cor;
    const productMessage = await ProdutoFotosController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    const colorResult = await ProdutoFotosController.findColor(productId, colorId);

    if ("message" in colorResult) {
      return res.status(colorResult.status).json({ message: colorResult.message });
    }

    await foto.update(ProdutoFotosController.buildUpdateData(foto, payload, photoPath));
    return res.status(200).send(foto);
  }

  static async remove(req: ProdutoFotoRequest, res: Response) {
    const photoId = ProdutoFotosController.parsePositiveId(req.params.id);

    if (!photoId) {
      return res.status(400).json({ message: "ID da foto invalido." });
    }

    const foto = await ProdutoFotos.findByPk(photoId);

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto nao encontrada." });
    }

    await foto.destroy();
    return res.status(204).send();
  }
}

export default ProdutoFotosController;
