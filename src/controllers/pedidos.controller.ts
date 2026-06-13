import { Request, Response } from "express";
import Pedidos from "../models/Pedidos";
import UsuarioEnderecos from "../models/UsuarioEnderecos";
import Usuarios from "../models/Usuarios";
import type {
  PedidoBody,
  PedidoQuery,
  PedidoRouteParams,
  PedidoStatus,
  PedidoUpdateData,
} from "../types/pedido.types";

type PedidoRequest = Request<PedidoRouteParams, object, PedidoBody, PedidoQuery>;

class PedidoPayload {
  constructor(private readonly body: PedidoBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get userId() {
    return this.parseId(this.body.id_usuario);
  }

  get addressId() {
    return this.parseId(this.body.id_usuario_endereco);
  }

  get status() {
    return PedidosController.normalizeStatus(this.body.status);
  }

  get valorTotal() {
    return this.body.valor_total ?? 0;
  }

  get valorFrete() {
    return this.body.valor_frete ?? null;
  }

  hasUserField() {
    return this.body.id_usuario !== undefined;
  }

  hasAddressField() {
    return this.body.id_usuario_endereco !== undefined;
  }

  hasStatusField() {
    return this.body.status !== undefined;
  }

  hasValorTotalField() {
    return this.body.valor_total !== undefined;
  }

  hasValorFreteField() {
    return this.body.valor_frete !== undefined;
  }
}

class PedidosController {
  private static readonly VALID_STATUSES: PedidoStatus[] = [
    "aguardando_calculo_frete",
    "aguardando_pagamento",
    "pago",
    "enviado",
    "entregue",
    "cancelado",
  ];

  static parsePositiveId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  static normalizeStatus(value: PedidoBody["status"]) {
    if (
      typeof value === "string" &&
      PedidosController.VALID_STATUSES.includes(value as PedidoStatus)
    ) {
      return value as PedidoStatus;
    }

    return null;
  }

  private static getCreateErrorMessage(payload: PedidoPayload) {
    if (!payload.hasUserField() || !payload.hasAddressField()) {
      return "id_usuario e id_usuario_endereco sao obrigatorios.";
    }

    if (!payload.userId) {
      return "id_usuario invalido.";
    }

    if (!payload.addressId) {
      return "id_usuario_endereco invalido.";
    }

    if (payload.hasStatusField() && !payload.status) {
      return "status invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: PedidoPayload) {
    if (payload.hasUserField() && !payload.userId) {
      return "id_usuario invalido.";
    }

    if (payload.hasAddressField() && !payload.addressId) {
      return "id_usuario_endereco invalido.";
    }

    if (payload.hasStatusField() && !payload.status) {
      return "status invalido.";
    }

    return null;
  }

  private static buildWhere(query: PedidoQuery) {
    const userId = query.id_usuario === undefined
      ? undefined
      : PedidosController.parsePositiveId(query.id_usuario);
    const status = query.status === undefined
      ? undefined
      : PedidosController.normalizeStatus(query.status);

    if (query.id_usuario !== undefined && !userId) {
      return { message: "id_usuario invalido." };
    }

    if (query.status !== undefined && !status) {
      return { message: "status invalido." };
    }

    return { id_usuario: userId, status };
  }

  private static async findUserError(userId?: number | null) {
    return userId && !(await Usuarios.findByPk(userId))
      ? "Usuario nao encontrado."
      : null;
  }

  private static async findAddress(addressId?: number | null) {
    return addressId ? UsuarioEnderecos.findByPk(addressId) : null;
  }

  private static buildUpdateData(
    pedido: Pedidos,
    payload: PedidoPayload,
    userId: number,
    addressId: number,
  ): PedidoUpdateData {
    return {
      id_usuario: userId,
      id_usuario_endereco: addressId,
      status: payload.status ?? pedido.status,
      valor_total: payload.hasValorTotalField()
        ? payload.valorTotal
        : pedido.valor_total,
      valor_frete: payload.hasValorFreteField()
        ? payload.valorFrete
        : pedido.valor_frete,
    };
  }

  static async findAll(req: PedidoRequest, res: Response) {
    const where = PedidosController.buildWhere(req.query);

    if ("message" in where) {
      return res.status(400).json({ message: where.message });
    }

    return res.status(200).send(
      await Pedidos.findAll({
        where: {
          ...(where.id_usuario ? { id_usuario: where.id_usuario } : {}),
          ...(where.status ? { status: where.status } : {}),
        },
      }),
    );
  }

  static async getById(req: PedidoRequest, res: Response) {
    const orderId = PedidosController.parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({ message: "ID do pedido invalido." });
    }

    const pedido = await Pedidos.findByPk(orderId);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido nao encontrado." });
    }

    return res.status(200).send(pedido);
  }

  static async create(req: PedidoRequest, res: Response) {
    const payload = new PedidoPayload(req.body);
    const message = PedidosController.getCreateErrorMessage(payload);
    const userMessage = message
      ? null
      : await PedidosController.findUserError(payload.userId);
    const endereco = userMessage
      ? null
      : await PedidosController.findAddress(payload.addressId);

    if (message) {
      return res.status(400).json({ message });
    }

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    if (!endereco) {
      return res.status(404).json({ message: "Endereco do usuario nao encontrado." });
    }

    if (endereco.id_usuario !== payload.userId) {
      return res.status(400).json({
        message: "O endereco informado nao pertence ao usuario informado.",
      });
    }

    return res.status(201).send(
      await Pedidos.create({
        id_usuario: payload.userId!,
        id_usuario_endereco: payload.addressId!,
        status: payload.status ?? "aguardando_pagamento",
        valor_total: payload.valorTotal,
        valor_frete: payload.valorFrete,
      }),
    );
  }

  static async update(req: PedidoRequest, res: Response) {
    const orderId = PedidosController.parsePositiveId(req.params.id);
    const payload = new PedidoPayload(req.body);

    if (!orderId) {
      return res.status(400).json({ message: "ID do pedido invalido." });
    }

    const pedido = await Pedidos.findByPk(orderId);
    const message = PedidosController.getUpdateErrorMessage(payload);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido nao encontrado." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const userId = payload.userId ?? pedido.id_usuario;
    const addressId = payload.addressId ?? pedido.id_usuario_endereco;
    const userMessage = await PedidosController.findUserError(payload.userId);
    const endereco = await PedidosController.findAddress(addressId);

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    if (!endereco) {
      return res.status(404).json({ message: "Endereco do usuario nao encontrado." });
    }

    if (endereco.id_usuario !== userId) {
      return res.status(400).json({
        message: "O endereco informado nao pertence ao usuario informado.",
      });
    }

    await pedido.update(
      PedidosController.buildUpdateData(
        pedido,
        payload,
        userId,
        addressId,
      ),
    );

    return res.status(200).send(pedido);
  }

  static async remove(req: PedidoRequest, res: Response) {
    const orderId = PedidosController.parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({ message: "ID do pedido invalido." });
    }

    const pedido = await Pedidos.findByPk(orderId);

    if (!pedido) {
      return res.status(404).json({ message: "Pedido nao encontrado." });
    }

    await pedido.destroy();
    return res.status(204).send();
  }
}

export default PedidosController;
