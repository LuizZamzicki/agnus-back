import { Request, Response } from "express";
import ProdutoGrades from "../models/ProdutoGrades";
import Produtos from "../models/Produtos";
import type {
  ProdutoGradeBody,
  ProdutoGradeRouteParams,
  ProdutoGradeUpdateData,
} from "../types/produto-grade.types";

type ProdutoGradeRequest = Request<ProdutoGradeRouteParams, object, ProdutoGradeBody>;

class ProdutoGradePayload {
  constructor(private readonly body: ProdutoGradeBody) {}

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

  get acrescimo() {
    return this.body.acrescimo ?? 0;
  }

  hasProductField() {
    return this.body.id_produto !== undefined;
  }

  hasNameField() {
    return this.body.nome !== undefined;
  }

  hasAcrescimoField() {
    return this.body.acrescimo !== undefined;
  }
}

class ProdutoGradesController {
  private static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: ProdutoGradePayload) {
    if (!payload.hasProductField() || !payload.hasNameField()) {
      return "id_produto e nome sao obrigatorios.";
    }

    if (!payload.productId) {
      return "id_produto invalido.";
    }

    if (!payload.nome) {
      return "nome invalido.";
    }

    return null;
  }

  private static getUpdateErrorMessage(payload: ProdutoGradePayload) {
    if (payload.hasProductField() && !payload.productId) {
      return "id_produto invalido.";
    }

    if (payload.hasNameField() && !payload.nome) {
      return "nome invalido.";
    }

    return null;
  }

  private static async findProductError(productId?: number | null) {
    return productId && !(await Produtos.findByPk(productId))
      ? "Produto nao encontrado."
      : null;
  }

  private static buildUpdateData(grade: ProdutoGrades, payload: ProdutoGradePayload): ProdutoGradeUpdateData {
    return {
      id_produto: payload.productId ?? grade.id_produto,
      nome: payload.nome ?? grade.nome,
      acrescimo: payload.hasAcrescimoField() ? payload.acrescimo : grade.acrescimo,
    };
  }

  static async getByIdProduto(req: ProdutoGradeRequest, res: Response) {
    const productId = ProdutoGradesController.parsePositiveId(req.params.id_produto);

    if (!productId) {
      return res.status(400).json({ message: "ID do produto invalido." });
    }

    const grades = await ProdutoGrades.findAll({ where: { id_produto: productId } });

    if (!grades) {
      return res.status(404).json({ message: "Grade do produto nao encontrada." });
    }

    return res.status(200).send(grades);
  }

  static async create(req: ProdutoGradeRequest, res: Response) {
    const payload = new ProdutoGradePayload(req.body);
    const message = ProdutoGradesController.getCreateErrorMessage(payload);

    if (message) {
      return res.status(400).json({ message });
    }

    const productMessage = await ProdutoGradesController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    return res.status(201).send(
      await ProdutoGrades.create({
        id_produto: payload.productId!,
        nome: payload.nome!,
        acrescimo: payload.acrescimo,
      }),
    );
  }

  static async update(req: ProdutoGradeRequest, res: Response) {
    const gradeId = ProdutoGradesController.parsePositiveId(req.params.id);
    const payload = new ProdutoGradePayload(req.body);

    if (!gradeId) {
      return res.status(400).json({ message: "ID da grade invalido." });
    }

    const grade = await ProdutoGrades.findByPk(gradeId);
    const message = ProdutoGradesController.getUpdateErrorMessage(payload);

    if (!grade) {
      return res.status(404).json({ message: "Grade do produto nao encontrada." });
    }

    if (message) {
      return res.status(400).json({ message });
    }

    const productMessage = await ProdutoGradesController.findProductError(payload.productId);

    if (productMessage) {
      return res.status(404).json({ message: productMessage });
    }

    await grade.update(ProdutoGradesController.buildUpdateData(grade, payload));
    return res.status(200).send(grade);
  }

  static async remove(req: ProdutoGradeRequest, res: Response) {
    const gradeId = ProdutoGradesController.parsePositiveId(req.params.id);

    if (!gradeId) {
      return res.status(400).json({ message: "ID da grade invalido." });
    }

    const grade = await ProdutoGrades.findByPk(gradeId);

    if (!grade) {
      return res.status(404).json({ message: "Grade do produto nao encontrada." });
    }

    await grade.destroy();
    return res.status(204).send();
  }
}

export default ProdutoGradesController;
