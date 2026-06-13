import { Op, Transaction } from "sequelize";
import AvaliacaoFotos from "../models/AvaliacaoFotos";
import AvaliacaoProdutos from "../models/AvaliacaoProdutos";
import CarrinhoItens from "../models/CarrinhoItens";
import Categorias from "../models/Categorias";
import PedidoItens from "../models/PedidoItens";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import ProdutoGrades from "../models/ProdutoGrades";
import Produtos from "../models/Produtos";
import sequelize from "../config/database";
import type {
  ProdutoBody,
  ProdutoControllerError,
  ProdutoCorInput,
  ProdutoCorRecord,
  ProdutoCreateResult,
  ProdutoFotoRecord,
  ProdutoGradeInput,
  ProdutoGradeRecord,
  ProdutoRemovalFilter,
} from "../types/produto.types";
import { normalizeRgbColor } from "../utils/color";
import { saveProdutoFotoBits } from "../utils/produtoFotoStorage";
import { removeProdutoFromSearchIndex, syncProdutoToSearchIndex } from "./produtoSearchIndex.service";

class ProdutoPayload {
  constructor(private readonly body: ProdutoBody) {}

  private parseId(value: number | string | null | undefined) {
    if (value === null || value === "") {
      return null;
    }

    const parsedId = Number(value);

    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined;
  }

  private parseMoney(value: number | string | null | undefined, fallback?: number) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const parsedValue = Number(value);

    return Number.isNaN(parsedValue) ? undefined : parsedValue;
  }

  get categoryId() {
    return this.parseId(this.body.id_categoria);
  }

  get nome() {
    return this.body.nome?.trim() || "";
  }

  get descricao() {
    return this.body.descricao === undefined ? undefined : this.body.descricao ?? null;
  }

  get precoCusto() {
    return this.parseMoney(this.body.preco_custo);
  }

  get precoBase() {
    return this.parseMoney(this.body.preco_base);
  }

  get ativo() {
    return this.body.ativo;
  }

  get grades() {
    return Array.isArray(this.body.grades) ? this.body.grades : undefined;
  }

  get cores() {
    return Array.isArray(this.body.cores) ? this.body.cores : undefined;
  }

  hasCategoryField() {
    return this.body.id_categoria !== undefined;
  }

  hasDescriptionField() {
    return this.body.descricao !== undefined;
  }

  hasPriceCostField() {
    return this.body.preco_custo !== undefined;
  }

  hasPriceBaseField() {
    return this.body.preco_base !== undefined;
  }

  hasActiveField() {
    return this.body.ativo !== undefined;
  }

  hasGradesField() {
    return this.body.grades !== undefined;
  }

  hasCoresField() {
    return this.body.cores !== undefined;
  }
}

class ProdutoMutationService {
  static async create(body: ProdutoBody) {
    const payload = new ProdutoPayload(body);
    const error = await ProdutoMutationService.getCreateError(payload);

    if (error) {
      return error;
    }

    try {
      return { data: await ProdutoMutationService.createProductBundle(payload) };
    } catch (error) {
      return {
        message: ProdutoMutationService.getErrorMessage(error, "Falha ao criar produto com itens."),
        status: 400,
      };
    }
  }

  static async update(productId: number, body: ProdutoBody) {
    if (!Number.isInteger(productId)) {
      return { message: "id do produto invalido.", status: 400 };
    }

    const produto = await Produtos.findByPk(productId);
    const payload = new ProdutoPayload(body);
    const error = await ProdutoMutationService.getUpdateError(produto, payload);

    if (error) {
      return error;
    }

    try {
      await ProdutoMutationService.updateProductBundle(produto!, payload, productId);
      return { data: produto! };
    } catch (error) {
      return {
        message: ProdutoMutationService.getErrorMessage(error, "Falha ao atualizar produto com itens."),
        status: 400,
      };
    }
  }

  static async remove(productId: number) {
    if (!Number.isInteger(productId)) {
      return { message: "id do produto invalido.", status: 400 };
    }

    const produto = await Produtos.findByPk(productId);

    if (!produto) {
      return { message: "Produto nao encontrado", status: 404 };
    }

    const orderFilters = await ProdutoMutationService.buildOrderFilters(productId);
    const orderCount = await ProdutoMutationService.countOrderItems(orderFilters);

    if (orderCount > 0) {
      return {
        message: "Produto vinculado a pedidos nao pode ser removido. Desative-o em vez de excluir.",
        status: 409,
      };
    }

    await ProdutoMutationService.deleteProductBundle(produto, productId, orderFilters);
    await removeProdutoFromSearchIndex(productId);

    return { data: null };
  }

  static async getCreateError(payload: ProdutoPayload) {
    const message = ProdutoMutationService.getPayloadError(payload, true);
    const categoryMessage = message ? null : await ProdutoMutationService.findCategoryError(payload);

    return message
      ? { message, status: 400 }
      : categoryMessage
        ? { message: categoryMessage, status: 404 }
        : null;
  }

  static async getUpdateError(produto: Produtos | null, payload: ProdutoPayload) {
    if (!produto) {
      return { message: "Produto nao encontrado", status: 404 };
    }

    const message = ProdutoMutationService.getPayloadError(payload, false);
    const categoryMessage = message ? null : await ProdutoMutationService.findCategoryError(payload);

    return message
      ? { message, status: 400 }
      : categoryMessage
        ? { message: categoryMessage, status: 404 }
        : null;
  }

  static getPayloadError(payload: ProdutoPayload, creating: boolean) {
    if (creating && (!payload.nome || payload.precoBase === undefined)) {
      return "nome e preco_base sao obrigatorios.";
    }

    if (payload.hasPriceCostField() && payload.precoCusto === undefined) {
      return "preco_custo invalido.";
    }

    if (payload.hasCategoryField() && payload.categoryId === undefined) {
      return "id_categoria invalido.";
    }

    if (payload.hasGradesField() && !payload.grades) {
      return "grades deve ser um array.";
    }

    if (payload.hasCoresField() && !payload.cores) {
      return "cores deve ser um array.";
    }

    if (creating && !ProdutoMutationService.hasRequiredGrades(payload.grades)) {
      return "O produto precisa ter pelo menos uma grade.";
    }

    if (creating && !ProdutoMutationService.hasRequiredColorWithPhoto(payload.cores)) {
      return "O produto precisa ter pelo menos uma cor com foto.";
    }

    if (!creating && payload.hasGradesField() && !ProdutoMutationService.hasRequiredGrades(payload.grades)) {
      return "O produto precisa ter pelo menos uma grade.";
    }

    if (!creating && payload.hasCoresField() && !ProdutoMutationService.hasRequiredColorWithPhoto(payload.cores)) {
      return "O produto precisa ter pelo menos uma cor com foto.";
    }

    return null;
  }

  static hasRequiredGrades(grades: ProdutoGradeInput[] | undefined) {
    return Array.isArray(grades) && grades.length > 0;
  }

  static hasColorPhotoInput(cor: ProdutoCorInput) {
    if (Array.isArray(cor.fotos) && cor.fotos.length > 0) {
      return true;
    }

    if (Array.isArray(cor.fotos_upload) && cor.fotos_upload.length > 0) {
      return true;
    }

    return cor.fotos !== undefined || cor.fotos_upload !== undefined;
  }

  static hasRequiredColorWithPhoto(cores: ProdutoCorInput[] | undefined) {
    return Array.isArray(cores) && cores.some(ProdutoMutationService.hasColorPhotoInput);
  }

  static async findCategoryError(payload: ProdutoPayload) {
    return payload.hasCategoryField() &&
      payload.categoryId !== null &&
      payload.categoryId !== undefined &&
      !(await Categorias.findByPk(payload.categoryId))
      ? "Categoria nao encontrada"
      : null;
  }

  static async createProductBundle(payload: ProdutoPayload) {
    const result = await sequelize.transaction((transaction) =>
      ProdutoMutationService.runCreateTransaction(payload, transaction),
    );

    await syncProdutoToSearchIndex(result.produto.id_produto);
    return result;
  }

  static async runCreateTransaction(payload: ProdutoPayload, transaction: Transaction): Promise<ProdutoCreateResult> {
    const produto = await ProdutoMutationService.createProduto(payload, transaction);
    const grades = await ProdutoMutationService.createGrades(
      produto.id_produto,
      payload.grades ?? [],
      transaction,
    );
    const colorBundle = await ProdutoMutationService.createColors(
      produto.id_produto,
      payload.cores ?? [],
      transaction,
    );

    return {
      produto: produto.toJSON() as { id_produto: number } & Record<string, boolean | number | string | null>,
      grades,
      cores: colorBundle.cores,
      fotos: colorBundle.fotos,
    };
  }

  static createProduto(payload: ProdutoPayload, transaction: Transaction) {
    return Produtos.create(
      {
        id_categoria: payload.hasCategoryField() ? payload.categoryId ?? null : null,
        nome: payload.nome,
        descricao: payload.descricao ?? null,
        preco_custo: payload.precoCusto ?? 0,
        preco_base: payload.precoBase,
        ativo: payload.ativo === undefined ? true : Boolean(payload.ativo),
      },
      { transaction },
    );
  }

  static async createGrades(productId: number, grades: ProdutoGradeInput[], transaction: Transaction) {
    const records: ProdutoGradeRecord[] = [];

    for (const grade of grades) {
      records.push(await ProdutoMutationService.createGrade(productId, grade, transaction));
    }

    return records;
  }

  static async createGrade(productId: number, grade: ProdutoGradeInput, transaction: Transaction) {
    const nome = String(grade.nome ?? "").trim();
    const acrescimo = ProdutoMutationService.parseMoney(grade.acrescimo, 0);

    if (!nome) {
      throw new Error("Cada grade precisa de nome.");
    }

    if (acrescimo === undefined) {
      throw new Error(`Acrescimo invalido para a grade "${nome}".`);
    }

    return ProdutoGrades.create(
      {
        id_produto: productId,
        nome,
        acrescimo,
      },
      { transaction },
    ) as Promise<ProdutoGradeRecord>;
  }

  static async createColors(productId: number, cores: ProdutoCorInput[], transaction: Transaction) {
    const records = {
      cores: [] as ProdutoCorRecord[],
      fotos: [] as ProdutoFotoRecord[],
    };

    for (const cor of cores) {
      ProdutoMutationService.pushColorBundle(
        records,
        await ProdutoMutationService.createColor(productId, cor, transaction),
      );
    }

    return records;
  }

  static async createColor(productId: number, cor: ProdutoCorInput, transaction: Transaction) {
    const nome = String(cor.nome ?? "").trim();
    const codigo_rgb = normalizeRgbColor(String(cor.codigo_rgb ?? cor.tonalidade ?? ""));
    const acrescimo = ProdutoMutationService.parseMoney(cor.acrescimo, 0);

    if (!nome || !codigo_rgb) {
      throw new Error("Cada cor precisa de nome e codigo_rgb (ou tonalidade).");
    }

    if (acrescimo === undefined) {
      throw new Error(`Acrescimo invalido para a cor "${nome}".`);
    }

    const corCriada = await ProdutoCores.create(
      {
        id_produto: productId,
        nome,
        codigo_rgb,
        acrescimo,
      },
      { transaction },
    ) as ProdutoCorRecord;
    const fotos = await ProdutoMutationService.createFotos(
      productId,
      corCriada.id_produto_cor,
      cor,
      nome,
      transaction,
    );

    return { cor: corCriada, fotos };
  }

  static pushColorBundle(
    bundle: { cores: ProdutoCorRecord[]; fotos: ProdutoFotoRecord[] },
    color: { cor: ProdutoCorRecord; fotos: ProdutoFotoRecord[] },
  ) {
    bundle.cores.push(color.cor);
    bundle.fotos.push(...color.fotos);
  }

  static async createFotos(
    productId: number,
    colorId: number,
    cor: ProdutoCorInput,
    nomeCor: string,
    transaction: Transaction,
  ) {
    const fotos = ProdutoMutationService.normalizeExistingFotoPaths(cor.fotos, nomeCor);
    const uploads = await ProdutoMutationService.saveNewFotoUploads(cor.fotos_upload, nomeCor);
    const paths = [...fotos, ...uploads];
    const records: ProdutoFotoRecord[] = [];

    for (const caminho_url of paths) {
      records.push(
        await ProdutoFotos.create(
          {
            id_produto: productId,
            id_produto_cor: colorId,
            caminho_url,
          },
          { transaction },
        ) as ProdutoFotoRecord,
      );
    }

    return records;
  }

  static normalizeExistingFotoPaths(fotos: string[] | null | undefined, nomeCor: string) {
    if (fotos === undefined || fotos === null) {
      return [];
    }

    if (!Array.isArray(fotos)) {
      throw new Error(`Fotos da cor "${nomeCor}" deve ser um array.`);
    }

    return fotos
      .map((foto) => foto.trim())
      .filter((foto) => {
        if (!foto) {
          throw new Error(`Foto existente invalida na cor "${nomeCor}".`);
        }

        return true;
      });
  }

  static async saveNewFotoUploads(fotos: ProdutoCorInput["fotos_upload"], nomeCor: string) {
    if (fotos === undefined || fotos === null) {
      return [];
    }

    if (!Array.isArray(fotos)) {
      throw new Error(`Fotos_upload da cor "${nomeCor}" deve ser um array.`);
    }

    const savedPaths: string[] = [];

    for (const foto of fotos) {
      savedPaths.push(await ProdutoMutationService.saveFotoUpload(foto, nomeCor));
    }

    return savedPaths;
  }

  static async saveFotoUpload(
    foto: ProdutoCorInput["fotos_upload"] extends (infer T)[] | null | undefined ? T : never,
    nomeCor: string,
  ) {
    const savedFilePath = await saveProdutoFotoBits(foto);

    if (!savedFilePath) {
      throw new Error(`Foto nova invalida em fotos_upload na cor "${nomeCor}".`);
    }

    return savedFilePath;
  }

  static async updateProductBundle(produto: Produtos, payload: ProdutoPayload, productId: number) {
    await sequelize.transaction((transaction) =>
      ProdutoMutationService.runUpdateTransaction(produto, payload, productId, transaction),
    );
    await syncProdutoToSearchIndex(productId);
  }

  static async runUpdateTransaction(
    produto: Produtos,
    payload: ProdutoPayload,
    productId: number,
    transaction: Transaction,
  ) {
    await ProdutoMutationService.updateProduto(produto, payload, transaction);

    if (payload.hasGradesField()) {
      await ProdutoMutationService.replaceGrades(productId, payload.grades ?? [], transaction);
    }

    if (payload.hasCoresField()) {
      await ProdutoMutationService.replaceColors(productId, payload.cores ?? [], transaction);
    }
  }

  static updateProduto(produto: Produtos, payload: ProdutoPayload, transaction: Transaction) {
    return produto.update(
      {
        id_categoria: payload.hasCategoryField() ? payload.categoryId ?? null : produto.id_categoria,
        nome: payload.nome || produto.nome,
        descricao: payload.hasDescriptionField() ? payload.descricao ?? null : produto.descricao,
        preco_custo: payload.hasPriceCostField() ? payload.precoCusto : produto.preco_custo,
        preco_base: payload.hasPriceBaseField() ? payload.precoBase : produto.preco_base,
        ativo: payload.hasActiveField() ? Boolean(payload.ativo) : produto.ativo,
      },
      { transaction },
    );
  }

  static async replaceGrades(productId: number, grades: ProdutoGradeInput[], transaction: Transaction) {
    await ProdutoGrades.destroy({ where: { id_produto: productId }, transaction });

    for (const grade of grades) {
      await ProdutoMutationService.createGrade(productId, grade, transaction);
    }
  }

  static async replaceColors(productId: number, cores: ProdutoCorInput[], transaction: Transaction) {
    await ProdutoFotos.destroy({ where: { id_produto: productId }, transaction });
    await ProdutoCores.destroy({ where: { id_produto: productId }, transaction });

    for (const cor of cores) {
      await ProdutoMutationService.createColor(productId, cor, transaction);
    }
  }

  static async buildOrderFilters(productId: number) {
    const cores = await ProdutoCores.findAll({
      where: { id_produto: productId },
      attributes: ["id_produto_cor"],
    });
    const grades = await ProdutoGrades.findAll({
      where: { id_produto: productId },
      attributes: ["id_produto_grade"],
    });
    const colorIds = cores.map((cor) => cor.id_produto_cor);
    const gradeIds = grades.map((grade) => grade.id_produto_grade);

    return [
      ...(colorIds.length ? [{ id_produto_cor: { [Op.in]: colorIds } }] : []),
      ...(gradeIds.length ? [{ id_produto_grade: { [Op.in]: gradeIds } }] : []),
    ] as ProdutoRemovalFilter[];
  }

  static countOrderItems(orderFilters: ProdutoRemovalFilter[]) {
    return orderFilters.length
      ? PedidoItens.count({ where: { [Op.or]: orderFilters } })
      : Promise.resolve(0);
  }

  static async deleteProductBundle(
    produto: Produtos,
    productId: number,
    orderFilters: ProdutoRemovalFilter[],
  ) {
    await sequelize.transaction((transaction) =>
      ProdutoMutationService.runDeleteTransaction(produto, productId, orderFilters, transaction),
    );
  }

  static async runDeleteTransaction(
    produto: Produtos,
    productId: number,
    orderFilters: ProdutoRemovalFilter[],
    transaction: Transaction,
  ) {
    if (orderFilters.length) {
      await CarrinhoItens.destroy({ where: { [Op.or]: orderFilters }, transaction });
    }

    const reviewIds = await ProdutoMutationService.findReviewIds(productId, transaction);

    if (reviewIds.length) {
      await AvaliacaoFotos.destroy({
        where: { id_avaliacao_produto: { [Op.in]: reviewIds } },
        transaction,
      });
    }

    await AvaliacaoProdutos.destroy({ where: { id_produto: productId }, transaction });
    await ProdutoFotos.destroy({ where: { id_produto: productId }, transaction });
    await ProdutoCores.destroy({ where: { id_produto: productId }, transaction });
    await ProdutoGrades.destroy({ where: { id_produto: productId }, transaction });
    await produto.destroy({ transaction });
  }

  static async findReviewIds(productId: number, transaction: Transaction) {
    const reviews = await AvaliacaoProdutos.findAll({
      where: { id_produto: productId },
      attributes: ["id_avaliacao_produto"],
      transaction,
    });

    return reviews.map((review) => review.id_avaliacao_produto);
  }

  static parseMoney(value: number | string | null | undefined, fallback?: number) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    const parsedValue = Number(value);

    return Number.isNaN(parsedValue) ? undefined : parsedValue;
  }

  static getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }
}

export default ProdutoMutationService;
