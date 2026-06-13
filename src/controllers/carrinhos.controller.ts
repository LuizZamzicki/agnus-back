import { Request, Response } from "express";
import Carrinhos from "../models/Carrinhos";
import Usuarios from "../models/Usuarios";
import type {
  CarrinhoBody,
  CarrinhoQuery,
  CarrinhoRouteParams,
  CarrinhoUpdateData,
} from "../types/carrinho.types";

type CarrinhoRequest = Request<CarrinhoRouteParams, object, CarrinhoBody, CarrinhoQuery>;

class CarrinhoPayload {
  constructor(private readonly body: CarrinhoBody) {}

  get userId() {
    return CarrinhosController.parsePositiveId(this.body.id_usuario);
  }

  hasUserField() {
    return this.body.id_usuario !== undefined;
  }
}

class CarrinhosController {
  static parsePositiveId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: CarrinhoPayload) {
    if (!payload.hasUserField()) {
      return "id_usuario e obrigatorio.";
    }

    if (!payload.userId) {
      return "id_usuario invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: CarrinhoPayload) {
    return payload.hasUserField() && !payload.userId
      ? "id_usuario invalido."
      : null;
  }

  private static async findMissingUserMessage(userId?: number | null) {
    return userId && !(await Usuarios.findByPk(userId))
      ? "Usuario nao encontrado."
      : null;
  }

  private static buildUpdateData(carrinho: Carrinhos, payload: CarrinhoPayload): CarrinhoUpdateData {
    return {
      id_usuario: payload.userId ?? carrinho.id_usuario,
    };
  }

  static async findAll(req: CarrinhoRequest, res: Response) {
    const userId = req.query.id_usuario === undefined
      ? undefined
      : CarrinhosController.parsePositiveId(req.query.id_usuario);

    if (req.query.id_usuario !== undefined && !userId) {
      return res.status(400).json({ message: "id_usuario invalido." });
    }

    return res
      .status(200)
      .send(await Carrinhos.findAll({ where: userId ? { id_usuario: userId } : {} }));
  }

  static async getById(req: CarrinhoRequest, res: Response) {
    const cartId = CarrinhosController.parsePositiveId(req.params.id);

    if (!cartId) {
      return res.status(400).json({ message: "ID do carrinho invalido." });
    }

    const carrinho = await Carrinhos.findByPk(cartId);

    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho nao encontrado." });
    }

    return res.status(200).send(carrinho);
  }

  static async create(req: CarrinhoRequest, res: Response) {
    const payload = new CarrinhoPayload(req.body);
    const message = CarrinhosController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const userMessage = await CarrinhosController.findMissingUserMessage(payload.userId);

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    return res.status(201).send(await Carrinhos.create({ id_usuario: payload.userId! }));
  }

  static async update(req: CarrinhoRequest, res: Response) {
    const cartId = CarrinhosController.parsePositiveId(req.params.id);
    const payload = new CarrinhoPayload(req.body);

    if (!cartId) {
      return res.status(400).json({ message: "ID do carrinho invalido." });
    }

    const carrinho = await Carrinhos.findByPk(cartId);
    const message = CarrinhosController.getUpdateErrorMessage(payload);

    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho nao encontrado." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const userMessage = await CarrinhosController.findMissingUserMessage(payload.userId);

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    await carrinho.update(CarrinhosController.buildUpdateData(carrinho, payload));
    return res.status(200).send(carrinho);
  }

  static async remove(req: CarrinhoRequest, res: Response) {
    const cartId = CarrinhosController.parsePositiveId(req.params.id);

    if (!cartId) {
      return res.status(400).json({ message: "ID do carrinho invalido." });
    }

    const carrinho = await Carrinhos.findByPk(cartId);

    if (!carrinho) {
      return res.status(404).json({ message: "Carrinho nao encontrado." });
    }

    await carrinho.destroy();
    return res.status(204).send();
  }
}

export default CarrinhosController;
