import { Request, Response } from "express";
import Categorias from "../models/Categorias";
import type {
  CategoriaBody,
  CategoriaQuery,
  CategoriaRouteParams,
} from "../types/categoria.types";
import { buildPaginationMeta, parsePagination } from "../utils/pagination";

type CategoriaRequest = Request<CategoriaRouteParams, object, CategoriaBody, CategoriaQuery>;

class CategoriaPayload {
  constructor(private readonly body: CategoriaBody) {}

  get nome() {
    return CategoriasController.normalizeName(this.body.nome);
  }

  hasNameField() {
    return this.body.nome !== undefined;
  }
}

class CategoriasController {
  static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  static normalizeName(value: string | null | undefined) {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
  }

  private static getCreateErrorMessage(payload: CategoriaPayload) {
    return !payload.hasNameField() || !payload.nome
      ? "nome e obrigatorio."
      : null;
  }

  private static getUpdateErrorMessage(payload: CategoriaPayload) {
    return payload.hasNameField() && !payload.nome
      ? "nome invalido."
      : null;
  }

  private static async findDuplicateMessage(nome: string | null, currentName?: string) {
    return !nome || nome === currentName || !(await Categorias.findOne({ where: { nome } }))
      ? null
      : "Ja existe categoria com esse nome.";
  }

  static async findAll(req: CategoriaRequest, res: Response) {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return res.status(400).json({ message: "page e limit devem ser inteiros positivos." });
    }

    const { count, rows } = await Categorias.findAndCountAll({
      limit: pagination.limit,
      offset: pagination.offset,
      order: [["id_categoria", "ASC"]],
    });

    return res.status(200).json({
      data: rows,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, count),
    });
  }

  static async getById(req: CategoriaRequest, res: Response) {
    const categoryId = CategoriasController.parsePositiveId(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ message: "ID da categoria invalido." });
    }

    const categoria = await Categorias.findByPk(categoryId);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria nao encontrada." });
    }

    return res.status(200).send(categoria);
  }

  static async create(req: CategoriaRequest, res: Response) {
    const payload = new CategoriaPayload(req.body);
    const message = CategoriasController.getCreateErrorMessage(payload);
    const duplicateMessage = message
      ? null
      : await CategoriasController.findDuplicateMessage(payload.nome);

    if (message) {
      return res.status(400).json({ message });
    }

    if (duplicateMessage) {
      return res.status(400).json({ message: duplicateMessage });
    }

    return res.status(201).send(await Categorias.create({ nome: payload.nome! }));
  }

  static async update(req: CategoriaRequest, res: Response) {
    const categoryId = CategoriasController.parsePositiveId(req.params.id);
    const payload = new CategoriaPayload(req.body);

    if (!categoryId) {
      return res.status(400).json({ message: "ID da categoria invalido." });
    }

    const categoria = await Categorias.findByPk(categoryId);
    const message = CategoriasController.getUpdateErrorMessage(payload);
    const duplicateMessage = !message && categoria
      ? await CategoriasController.findDuplicateMessage(payload.nome, categoria.nome)
      : null;

    if (!categoria) {
      return res.status(404).json({ message: "Categoria nao encontrada." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    if (duplicateMessage) {
      return res.status(400).json({ message: duplicateMessage });
    }

    await categoria.update({ nome: payload.nome ?? categoria.nome });
    return res.status(200).send(categoria);
  }

  static async remove(req: CategoriaRequest, res: Response) {
    const categoryId = CategoriasController.parsePositiveId(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ message: "ID da categoria invalido." });
    }

    const categoria = await Categorias.findByPk(categoryId);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria nao encontrada." });
    }

    await categoria.destroy();
    return res.status(204).send();
  }
}

export default CategoriasController;
