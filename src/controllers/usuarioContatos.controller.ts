import { Request, Response } from "express";
import UsuarioContatos from "../models/UsuarioContatos";
import Usuarios from "../models/Usuarios";
import type {
  UsuarioContatoBody,
  UsuarioContatoRouteParams,
  UsuarioContatoTipo,
  UsuarioContatoUpdateData,
} from "../types/usuario-contato.types";

type UsuarioContatoRequest = Request<UsuarioContatoRouteParams, object, UsuarioContatoBody>;

class UsuarioContatoPayload {
  constructor(private readonly body: UsuarioContatoBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  get userId() {
    return this.parseId(this.body.id_usuario);
  }

  get tipo() {
    return UsuarioContatosController.normalizeTipo(this.body.tipo);
  }

  get valor() {
    return this.body.valor?.trim() || null;
  }

  get principal() {
    return Boolean(this.body.principal);
  }

  hasUserField() {
    return this.body.id_usuario !== undefined;
  }

  hasTipoField() {
    return this.body.tipo !== undefined;
  }

  hasValorField() {
    return this.body.valor !== undefined;
  }

  hasPrincipalField() {
    return this.body.principal !== undefined;
  }
}

class UsuarioContatosController {
  private static readonly VALID_TYPES: UsuarioContatoTipo[] = ["telefone", "celular", "email", "outro"];

  static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  static normalizeTipo(value: UsuarioContatoBody["tipo"]) {
    return typeof value === "string" &&
      UsuarioContatosController.VALID_TYPES.includes(value as UsuarioContatoTipo)
      ? value as UsuarioContatoTipo
      : null;
  }

  private static getCreateErrorMessage(payload: UsuarioContatoPayload) {
    if (!payload.hasUserField() || !payload.hasValorField()) {
      return "id_usuario e valor sao obrigatorios.";
    }

    if (!payload.userId) {
      return "id_usuario invalido.";
    }

    if (!payload.valor) {
      return "valor invalido.";
    }

    if (payload.hasTipoField() && !payload.tipo) {
      return "tipo invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: UsuarioContatoPayload) {
    if (payload.hasUserField() && !payload.userId) {
      return "id_usuario invalido.";
    }

    if (payload.hasValorField() && !payload.valor) {
      return "valor invalido.";
    }

    if (payload.hasTipoField() && !payload.tipo) {
      return "tipo invalido.";
    }

    return null;
  }

  private static async findUserError(userId?: number | null) {
    return userId && !(await Usuarios.findByPk(userId))
      ? "Usuario nao encontrado."
      : null;
  }

  private static buildUpdateData(contato: UsuarioContatos, payload: UsuarioContatoPayload): UsuarioContatoUpdateData {
    return {
      id_usuario: payload.userId ?? contato.id_usuario,
      tipo: payload.tipo ?? contato.tipo,
      valor: payload.valor ?? contato.valor,
      principal: payload.hasPrincipalField() ? payload.principal : contato.principal,
    };
  }

  static async getByIdUser(req: UsuarioContatoRequest, res: Response) {
    const userId = UsuarioContatosController.parsePositiveId(req.params.id_user);

    if (!userId) {
      return res.status(400).json({ message: "ID do usuario invalido." });
    }

    const contatos = await UsuarioContatos.findAll({ where: { id_usuario: userId } });

    if (!contatos) {
      return res.status(404).json({ message: "Contato nao encontrado." });
    }

    return res.status(200).send(contatos);
  }

  static async create(req: UsuarioContatoRequest, res: Response) {
    const payload = new UsuarioContatoPayload(req.body);
    const message = UsuarioContatosController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const userMessage = await UsuarioContatosController.findUserError(payload.userId);

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    return res.status(201).send(
      await UsuarioContatos.create({
        id_usuario: payload.userId!,
        tipo: payload.tipo ?? "celular",
        valor: payload.valor!,
        principal: payload.principal,
      }),
    );
  }

  static async update(req: UsuarioContatoRequest, res: Response) {
    const contactId = UsuarioContatosController.parsePositiveId(req.params.id);
    const payload = new UsuarioContatoPayload(req.body);

    if (!contactId) {
      return res.status(400).json({ message: "ID do contato invalido." });
    }

    const contato = await UsuarioContatos.findByPk(contactId);
    const message = UsuarioContatosController.getUpdateErrorMessage(payload);

    if (!contato) {
      return res.status(404).json({ message: "Contato nao encontrado." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const userMessage = await UsuarioContatosController.findUserError(payload.userId);

    if (userMessage) {
      return res.status(404).json({ message: userMessage });
    }

    await contato.update(UsuarioContatosController.buildUpdateData(contato, payload));
    return res.status(200).send(contato);
  }

  static async remove(req: UsuarioContatoRequest, res: Response) {
    const contactId = UsuarioContatosController.parsePositiveId(req.params.id);

    if (!contactId) {
      return res.status(400).json({ message: "ID do contato invalido." });
    }

    const contato = await UsuarioContatos.findByPk(contactId);

    if (!contato) {
      return res.status(404).json({ message: "Contato nao encontrado." });
    }

    await contato.destroy();
    return res.status(204).send();
  }
}

export default UsuarioContatosController;
