import { Request, Response } from "express";
import CarrinhoItens from "../models/CarrinhoItens";
import Carrinhos from "../models/Carrinhos";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoGrades from "../models/ProdutoGrades";
import type {
  CarrinhoItemBody,
  CarrinhoItemControllerError,
  CarrinhoItemMutationData,
  CarrinhoItemRouteParams,
  CarrinhoItemSelection,
} from "../types/carrinho-item.types";

import {
  enrichItemsWithProductData,
  normalizeItemQuantity,
  resolveProdutoContext,
} from "../utils/itemDetails";

type CarrinhoItemRequest = Request<CarrinhoItemRouteParams, object, CarrinhoItemBody>;

class CarrinhoItemPayload {
  constructor(private readonly body: CarrinhoItemBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get cartId() {
    return this.parseId(this.body.id_carrinho);
  }

  get colorId() {
    return this.parseId(this.body.id_produto_cor);
  }

  get gradeId() {
    return this.parseId(this.body.id_produto_grade);
  }

  get quantidade() {
    return normalizeItemQuantity(this.body.quantidade);
  }

  hasCartField() {
    return this.body.id_carrinho !== undefined;
  }

  hasColorField() {
    return this.body.id_produto_cor !== undefined;
  }

  hasGradeField() {
    return this.body.id_produto_grade !== undefined;
  }

  hasQuantidadeField() {
    return this.body.quantidade !== undefined;
  }
}

class CarrinhoItensController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: CarrinhoItemPayload) {
    if (!payload.hasCartField() || !payload.hasColorField() || !payload.hasGradeField()) {
      return "id_carrinho, id_produto_cor e id_produto_grade sao obrigatorios.";
    }

    if (!payload.cartId) {
      return "id_carrinho invalido.";
    }

    if (!payload.colorId) {
      return "id_produto_cor invalido.";
    }

    if (!payload.gradeId) {
      return "id_produto_grade invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: CarrinhoItemPayload) {
    if (payload.hasCartField() && !payload.cartId) {
      return "id_carrinho invalido.";
    }

    if (payload.hasColorField() && !payload.colorId) {
      return "id_produto_cor invalido.";
    }

    if (payload.hasGradeField() && !payload.gradeId) {
      return "id_produto_grade invalido.";
    }

    return null;
  }

  private static async findCartError(payload: CarrinhoItemPayload) {
    return payload.hasCartField() && !(await Carrinhos.findByPk(payload.cartId!))
      ? "Carrinho nao encontrado."
      : null;
  }

  private static buildSelection(item: CarrinhoItens | null, payload: CarrinhoItemPayload): CarrinhoItemSelection {
    return {
      colorId: payload.colorId ?? item!.id_produto_cor,
      gradeId: payload.gradeId ?? item!.id_produto_grade,
    };
  }

  private static async resolveSelectionError(selection: CarrinhoItemSelection): Promise<CarrinhoItemControllerError | null> {
    const cor = await ProdutoCores.findByPk(selection.colorId);
    const grade = await ProdutoGrades.findByPk(selection.gradeId);

    if (!cor) {
      return { status: 404, message: "Cor do produto nao encontrada." };
    }

    if (!grade) {
      return { status: 404, message: "Grade do produto nao encontrada." };
    }

    return cor.id_produto === grade.id_produto
      ? null
      : {
          status: 400,
          message: "A cor e a grade informadas nao pertencem ao mesmo produto.",
        };
  }

  private static async resolvePrecoUnitario(selection: CarrinhoItemSelection) {
    return (await resolveProdutoContext(selection.colorId, selection.gradeId))?.precoUnitario ?? null;
  }

  private static async enrichItem(item: CarrinhoItens) {
    return (await enrichItemsWithProductData([item]))[0];
  }

  private static buildCreateData(payload: CarrinhoItemPayload, precoUnitario: number): CarrinhoItemMutationData {
    return {
      id_carrinho: payload.cartId!,
      id_produto_cor: payload.colorId!,
      id_produto_grade: payload.gradeId!,
      quantidade: payload.quantidade,
      preco_unitario: precoUnitario,
    };
  }

  private static buildUpdateData(
    item: CarrinhoItens,
    payload: CarrinhoItemPayload,
    selection: CarrinhoItemSelection,
    precoUnitario: number,
  ): CarrinhoItemMutationData {
    return {
      id_carrinho: payload.cartId ?? item.id_carrinho,
      id_produto_cor: selection.colorId,
      id_produto_grade: selection.gradeId,
      quantidade: payload.hasQuantidadeField()
        ? payload.quantidade
        : item.quantidade ?? 1,
      preco_unitario: precoUnitario,
    };
  }

  static async getByIdCart(req: CarrinhoItemRequest, res: Response) {
    const cartId = CarrinhoItensController.parsePositiveId(req.params.id_cart);

    if (!cartId) {
      return res.status(400).json({ message: "ID do carrinho invalido." });
    }

    const items = await CarrinhoItens.findAll({ where: { id_carrinho: cartId } });

    return res.status(200).send(await enrichItemsWithProductData(items));
  }

  static async create(req: CarrinhoItemRequest, res: Response) {
    const payload = new CarrinhoItemPayload(req.body);
    const message = CarrinhoItensController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const cartMessage = await CarrinhoItensController.findCartError(payload);
    const selection = CarrinhoItensController.buildSelection(null, payload);
    const selectionError = await CarrinhoItensController.resolveSelectionError(selection);
    const precoUnitario = selectionError
      ? null
      : await CarrinhoItensController.resolvePrecoUnitario(selection);

    if (cartMessage) {
      return res.status(404).json({ message: cartMessage });
    }

    if (selectionError) {
      return res.status(selectionError.status).json({ message: selectionError.message });
    }

    if (precoUnitario === null) {
      return res.status(404).json({ message: "Produto vinculado ao item nao encontrado." });
    }

    return res
      .status(201)
      .send(
        await CarrinhoItensController.enrichItem(
          await CarrinhoItens.create(
            CarrinhoItensController.buildCreateData(payload, precoUnitario),
          ),
        ),
      );
  }

  static async update(req: CarrinhoItemRequest, res: Response) {
    const itemId = CarrinhoItensController.parsePositiveId(req.params.id);
    const payload = new CarrinhoItemPayload(req.body);

    if (!itemId) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const item = await CarrinhoItens.findByPk(itemId);
    const message = CarrinhoItensController.getUpdateErrorMessage(payload);

    if (!item) {
      return res.status(404).json({ message: "Item do carrinho nao encontrado." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const cartMessage = await CarrinhoItensController.findCartError(payload);
    const selection = CarrinhoItensController.buildSelection(item, payload);
    const selectionError = await CarrinhoItensController.resolveSelectionError(selection);
    const precoUnitario = selectionError
      ? null
      : await CarrinhoItensController.resolvePrecoUnitario(selection);

    if (cartMessage) {
      return res.status(404).json({ message: cartMessage });
    }

    if (selectionError) {
      return res.status(selectionError.status).json({ message: selectionError.message });
    }

    if (precoUnitario === null) {
      return res.status(404).json({ message: "Produto vinculado ao item nao encontrado." });
    }

    await item.update(
      CarrinhoItensController.buildUpdateData(
        item,
        payload,
        selection,
        precoUnitario,
      ),
    );

    return res.status(200).send(await CarrinhoItensController.enrichItem(item));
  }

  static async remove(req: CarrinhoItemRequest, res: Response) {
    const itemId = CarrinhoItensController.parsePositiveId(req.params.id);

    if (!itemId) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const item = await CarrinhoItens.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item do carrinho nao encontrado." });
    }

    await item.destroy();
    return res.status(204).send();
  }
}

export default CarrinhoItensController;
