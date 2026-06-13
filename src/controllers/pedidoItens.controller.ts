import { Request, Response } from "express";
import PedidoItens from "../models/PedidoItens";
import Pedidos from "../models/Pedidos";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoGrades from "../models/ProdutoGrades";
import type {
  PedidoItemBody,
  PedidoItemControllerError,
  PedidoItemMutationData,
  PedidoItemPricing,
  PedidoItemRouteParams,
  PedidoItemSelection,
} from "../types/pedido-item.types";
import {
  calculateSubtotal,
  enrichItemsWithProductData,
  normalizeItemQuantity,
  resolveProdutoContext,
} from "../utils/itemDetails";

type PedidoItemRequest = Request<PedidoItemRouteParams, object, PedidoItemBody>;

class PedidoItemPayload {
  constructor(private readonly body: PedidoItemBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get orderId() {
    return this.parseId(this.body.id_pedido);
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

  hasOrderField() {
    return this.body.id_pedido !== undefined;
  }

  hasColorField() {
    return this.body.id_produto_cor !== undefined;
  }

  hasGradeField() {
    return this.body.id_produto_grade !== undefined;
  }

  hasQuantityField() {
    return this.body.quantidade !== undefined;
  }
}

class PedidoItensController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: PedidoItemPayload) {
    if (
      !payload.hasOrderField() ||
      !payload.hasColorField() ||
      !payload.hasGradeField() ||
      !payload.hasQuantityField()
    ) {
      return "id_pedido, id_produto_cor, id_produto_grade e quantidade sao obrigatorios.";
    }

    if (!payload.orderId) {
      return "id_pedido invalido.";
    }

    if (!payload.colorId) {
      return "id_produto_cor invalido.";
    }

    if (!payload.gradeId) {
      return "id_produto_grade invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: PedidoItemPayload) {
    if (payload.hasOrderField() && !payload.orderId) {
      return "id_pedido invalido.";
    }

    if (payload.hasColorField() && !payload.colorId) {
      return "id_produto_cor invalido.";
    }

    if (payload.hasGradeField() && !payload.gradeId) {
      return "id_produto_grade invalido.";
    }

    return null;
  }

  private static async findOrderError(payload: PedidoItemPayload) {
    return payload.hasOrderField() && !(await Pedidos.findByPk(payload.orderId!))
      ? "Pedido nao encontrado."
      : null;
  }

  private static buildSelection(item: PedidoItens | null, payload: PedidoItemPayload): PedidoItemSelection {
    return {
      colorId: payload.colorId ?? item!.id_produto_cor,
      gradeId: payload.gradeId ?? item!.id_produto_grade,
    };
  }

  private static async resolveSelectionError(selection: PedidoItemSelection): Promise<PedidoItemControllerError | null> {
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

  private static async resolvePricing(selection: PedidoItemSelection, quantidade: number): Promise<PedidoItemPricing | null> {
    const produtoContext = await resolveProdutoContext(selection.colorId, selection.gradeId);

    return produtoContext
      ? {
          preco_unitario: produtoContext.precoUnitario,
          subtotal: calculateSubtotal(produtoContext.precoUnitario, quantidade),
        }
      : null;
  }

  private static async enrichItem(item: PedidoItens) {
    return (await enrichItemsWithProductData([item]))[0];
  }

  private static buildCreateData(payload: PedidoItemPayload, pricing: PedidoItemPricing): PedidoItemMutationData {
    return {
      id_pedido: payload.orderId!,
      id_produto_cor: payload.colorId!,
      id_produto_grade: payload.gradeId!,
      quantidade: payload.quantidade,
      preco_unitario: pricing.preco_unitario,
      subtotal: pricing.subtotal,
    };
  }

  private static buildUpdateData(
    item: PedidoItens,
    payload: PedidoItemPayload,
    selection: PedidoItemSelection,
    pricing: PedidoItemPricing,
  ): PedidoItemMutationData {
    return {
      id_pedido: payload.orderId ?? item.id_pedido,
      id_produto_cor: selection.colorId,
      id_produto_grade: selection.gradeId,
      quantidade: payload.hasQuantityField() ? payload.quantidade : item.quantidade,
      preco_unitario: pricing.preco_unitario,
      subtotal: pricing.subtotal,
    };
  }

  static async getByIdOrder(req: PedidoItemRequest, res: Response) {
    const orderId = PedidoItensController.parsePositiveId(req.params.id_order);

    if (!orderId) {
      return res.status(400).json({ message: "ID do pedido invalido." });
    }

    const items = await PedidoItens.findAll({ where: { id_pedido: orderId } });

    return res.status(200).send(await enrichItemsWithProductData(items));
  }

  static async create(req: PedidoItemRequest, res: Response) {
    const payload = new PedidoItemPayload(req.body);
    const message = PedidoItensController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const orderMessage = await PedidoItensController.findOrderError(payload);
    const selection = PedidoItensController.buildSelection(null, payload);
    const selectionError = await PedidoItensController.resolveSelectionError(selection);
    const pricing = selectionError
      ? null
      : await PedidoItensController.resolvePricing(selection, payload.quantidade);

    if (orderMessage) {
      return res.status(404).json({ message: orderMessage });
    }

    if (selectionError) {
      return res.status(selectionError.status).json({ message: selectionError.message });
    }

    if (!pricing) {
      return res.status(404).json({ message: "Produto vinculado ao item nao encontrado." });
    }

    return res
      .status(201)
      .send(
        await PedidoItensController.enrichItem(
          await PedidoItens.create(
            PedidoItensController.buildCreateData(payload, pricing),
          ),
        ),
      );
  }

  static async update(req: PedidoItemRequest, res: Response) {
    const itemId = PedidoItensController.parsePositiveId(req.params.id);
    const payload = new PedidoItemPayload(req.body);

    if (!itemId) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const item = await PedidoItens.findByPk(itemId);
    const message = PedidoItensController.getUpdateErrorMessage(payload);

    if (!item) {
      return res.status(404).json({ message: "Item do pedido nao encontrado." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const orderMessage = await PedidoItensController.findOrderError(payload);
    const selection = PedidoItensController.buildSelection(item, payload);
    const selectionError = await PedidoItensController.resolveSelectionError(selection);
    const pricing = selectionError
      ? null
      : await PedidoItensController.resolvePricing(
          selection,
          payload.hasQuantityField() ? payload.quantidade : item.quantidade,
        );

    if (orderMessage) {
      return res.status(404).json({ message: orderMessage });
    }

    if (selectionError) {
      return res.status(selectionError.status).json({ message: selectionError.message });
    }

    if (!pricing) {
      return res.status(404).json({ message: "Produto vinculado ao item nao encontrado." });
    }

    await item.update(
      PedidoItensController.buildUpdateData(
        item,
        payload,
        selection,
        pricing,
      ),
    );

    return res.status(200).send(await PedidoItensController.enrichItem(item));
  }

  static async remove(req: PedidoItemRequest, res: Response) {
    const itemId = PedidoItensController.parsePositiveId(req.params.id);

    if (!itemId) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const item = await PedidoItens.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item do pedido nao encontrado." });
    }

    await item.destroy();
    return res.status(204).send();
  }
}

export default PedidoItensController;
