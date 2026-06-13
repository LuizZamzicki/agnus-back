import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import Produtos from "../models/Produtos";
import type {
  ProdutoCorBody,
  ProdutoCorRouteParams,
  ProdutoCorUpdateData,
} from "../types/produto-cor.types";
import { normalizeRgbColor } from "../utils/color";

type ProdutoCorRequest = Request<ProdutoCorRouteParams, object, ProdutoCorBody>;

class ProdutoCorPayload {
  constructor(private readonly body: ProdutoCorBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get productId() {
    return this.parseId(this.body.id_produto);
  }

  get nome() {
    return this.body.nome?.trim() || null;
  }

  get rawColor() {
    return this.body.codigo_rgb ?? this.body.tonalidade;
  }

  get rgbCode() {
    return this.rawColor === undefined
      ? undefined
      : normalizeRgbColor(String(this.rawColor ?? ""));
  }

  get acrescimo() {
    return this.body.acrescimo ?? 0;
  }

  hasProductField() {
    return this.body.id_produto !== undefined;
  }

  hasNameField() {
    return this.body.nome !== undefined;
  }

  hasColorField() {
    return this.body.codigo_rgb !== undefined || this.body.tonalidade !== undefined;
  }

  hasAcrescimoField() {
    return this.body.acrescimo !== undefined;
  }
}

class ProdutoCoresController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: ProdutoCorPayload) {
    if (!payload.hasProductField() || !payload.hasNameField() || !payload.hasColorField()) {
      return "id_produto, nome e codigo_rgb sao obrigatorios.";
    }

    if (!payload.productId) {
      return "id_produto invalido.";
    }

    if (!payload.nome) {
      return "nome invalido.";
    }

    if (!payload.rgbCode) {
      return "codigo_rgb invalido. Use formato RGB valido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: ProdutoCorPayload) {
    if (payload.hasProductField() && !payload.productId) {
      return "id_produto invalido.";
    }

    if (payload.hasNameField() && !payload.nome) {
      return "nome invalido.";
    }

    if (payload.hasColorField() && !payload.rgbCode) {
      return "codigo_rgb invalido. Use formato RGB valido.";
    }

    return null;
  }

  private static async findProductError(productId?: number | null) {
    return productId && !(await Produtos.findByPk(productId))
      ? "Produto nao encontrado."
      : null;
  }

  private static buildUpdateData(cor: ProdutoCores, payload: ProdutoCorPayload): ProdutoCorUpdateData {
    return {
      id_produto: payload.productId ?? cor.id_produto,
      nome: payload.nome ?? cor.nome,
      codigo_rgb: payload.rgbCode ?? cor.codigo_rgb,
      acrescimo: payload.hasAcrescimoField() ? payload.acrescimo : cor.acrescimo,
    };
  }

  static async getByIdProduto(req: ProdutoCorRequest, res: Response) {
    const productId = ProdutoCoresController.parsePositiveId(req.params.id_produto);

    if (!productId) {
      return res.status(400).json({ message: "ID do produto invalido." });
    }

    const cores = await ProdutoCores.findAll({ where: { id_produto: productId } });

    if (!cores) {
      return res.status(404).json({ message: "Cor do produto nao encontrada." });
    }

    return res.status(200).send(cores);
  }

  static async create(req: ProdutoCorRequest, res: Response) {
    const payload = new ProdutoCorPayload(req.body);
    const message = ProdutoCoresController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const productMessage = await ProdutoCoresController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    return res.status(201).send(
      await ProdutoCores.create({
        id_produto: payload.productId!,
        nome: payload.nome!,
        codigo_rgb: payload.rgbCode!,
        acrescimo: payload.acrescimo,
      }),
    );
  }

  static async update(req: ProdutoCorRequest, res: Response) {
    const colorId = ProdutoCoresController.parsePositiveId(req.params.id);
    const payload = new ProdutoCorPayload(req.body);

    if (!colorId) {
      return res.status(400).json({ message: "ID da cor invalido." });
    }

    const cor = await ProdutoCores.findByPk(colorId);
    const message = ProdutoCoresController.getUpdateErrorMessage(payload);

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const productMessage = await ProdutoCoresController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    await cor.update(ProdutoCoresController.buildUpdateData(cor, payload));
    return res.status(200).send(cor);
  }

  static async remove(req: ProdutoCorRequest, res: Response) {
    const colorId = ProdutoCoresController.parsePositiveId(req.params.id);

    if (!colorId) {
      return res.status(400).json({ message: "ID da cor invalido." });
    }

    const cor = await ProdutoCores.findByPk(colorId);

    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada." });
    }

    await cor.destroy();
    return res.status(204).send();
  }
}

export default ProdutoCoresController;
