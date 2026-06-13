import { Request, Response } from "express";
import ProdutoCatalogService from "../services/produtoCatalog.service";
import ProdutoMutationService from "../services/produtoMutation.service";
import type {
  ProdutoBody,
  ProdutoQuery,
  ProdutoRouteParams,
} from "../types/produto.types";

type ProdutoRequest = Request<ProdutoRouteParams, object, ProdutoBody, ProdutoQuery>;

class ProdutosController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static sendResult(
    res: Response,
    result: { message: string; status?: number } | { data: object; pagination?: object },
    successStatus = 200,
  ) {
    if ("message" in result) {
      return res.status(result.status ?? 400).json({ message: result.message });
    }

    return result.pagination
      ? res.status(successStatus).json(result)
      : res.status(successStatus).send(result.data);
  }

  static async findAll(req: ProdutoRequest, res: Response) {
    return ProdutosController.sendResult(res, await ProdutoCatalogService.findAll(req.query));
  }

  static async catalog(req: ProdutoRequest, res: Response) {
    return ProdutosController.sendResult(res, await ProdutoCatalogService.catalog(req.query));
  }

  static async bestSellers(req: ProdutoRequest, res: Response) {
    return ProdutosController.sendResult(res, await ProdutoCatalogService.bestSellers(req.query));
  }

  static async getById(req: ProdutoRequest, res: Response) {
    const productId = ProdutosController.parsePositiveId(req.params.id);

    if (!productId) {
      return res.status(400).json({ message: "ID do produto invalido." });
    }

    return ProdutosController.sendResult(res, await ProdutoCatalogService.findById(productId));
  }

  static async create(req: ProdutoRequest, res: Response) {
    const result = await ProdutoMutationService.create(req.body);

    if ("message" in result) {
      return res.status(result.status ?? 400).json({ message: result.message });
    }

    return res.status(201).json({
      ...result.data.produto,
      grades: result.data.grades,
      cores: result.data.cores,
      fotos: result.data.fotos,
    });
  }

  static async update(req: ProdutoRequest, res: Response) {
    const productId = ProdutosController.parsePositiveId(req.params.id);

    if (!productId) {
      return res.status(400).json({ message: "id do produto invalido." });
    }

    return ProdutosController.sendResult(res, await ProdutoMutationService.update(productId, req.body));
  }

  static async remove(req: ProdutoRequest, res: Response) {
    const productId = ProdutosController.parsePositiveId(req.params.id);

    if (!productId) {
      return res.status(400).json({ message: "id do produto invalido." });
    }

    const result = await ProdutoMutationService.remove(productId);

    return "message" in result
      ? res.status(result.status ?? 400).json({ message: result.message })
      : res.status(204).send();
  }
}

export default ProdutosController;
