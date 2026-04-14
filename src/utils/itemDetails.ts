import { Op } from "sequelize";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import ProdutoGrades from "../models/ProdutoGrades";
import Produtos from "../models/Produtos";

type ItemLike = {
  toJSON?: () => Record<string, unknown>;
  id_produto_cor: number;
  id_produto_grade: number;
  quantidade?: number | null;
};

type ProdutoContext = {
  produto: Produtos;
  cor: ProdutoCores;
  grade: ProdutoGrades;
  foto: string | null;
  precoUnitario: number;
};

const parseMoney = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

const roundMoney = (value: number) => Number(value.toFixed(2));

const normalizeQuantidade = (value: unknown) => {
  const parsedValue = Number(value ?? 1);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 1;
  }

  return Math.trunc(parsedValue);
};

export const resolveProdutoContext = async (
  idProdutoCor: number,
  idProdutoGrade: number,
): Promise<ProdutoContext | null> => {
  const cor = await ProdutoCores.findByPk(idProdutoCor);
  if (!cor) {
    return null;
  }

  const grade = await ProdutoGrades.findByPk(idProdutoGrade);
  if (!grade || grade.id_produto !== cor.id_produto) {
    return null;
  }

  const produto = await Produtos.findByPk(cor.id_produto);
  if (!produto) {
    return null;
  }

  const fotoDaCor = await ProdutoFotos.findOne({
    where: {
      id_produto: produto.id_produto,
      id_produto_cor: cor.id_produto_cor,
    },
    order: [["id_produto_foto", "ASC"]],
  });
  const fotoDoProduto =
    fotoDaCor ??
    (await ProdutoFotos.findOne({
      where: { id_produto: produto.id_produto },
      order: [["id_produto_foto", "ASC"]],
    }));

  return {
    produto,
    cor,
    grade,
    foto: fotoDoProduto?.caminho_url ?? null,
    precoUnitario: roundMoney(
      parseMoney(produto.preco_base) + parseMoney(cor.acrescimo) + parseMoney(grade.acrescimo),
    ),
  };
};

export const enrichItemsWithProductData = async <T extends ItemLike>(items: T[]) => {
  if (items.length === 0) {
    return [];
  }

  const corIds = [...new Set(items.map((item) => Number(item.id_produto_cor)).filter(Boolean))];
  const gradeIds = [
    ...new Set(items.map((item) => Number(item.id_produto_grade)).filter(Boolean)),
  ];

  const [cores, grades] = await Promise.all([
    ProdutoCores.findAll({
      where: { id_produto_cor: { [Op.in]: corIds } },
    }),
    ProdutoGrades.findAll({
      where: { id_produto_grade: { [Op.in]: gradeIds } },
    }),
  ]);

  const coresById = new Map(cores.map((cor) => [cor.id_produto_cor, cor]));
  const gradesById = new Map(grades.map((grade) => [grade.id_produto_grade, grade]));

  const productIds = [
    ...new Set(
      [...cores.map((cor) => cor.id_produto), ...grades.map((grade) => grade.id_produto)].filter(
        Boolean,
      ),
    ),
  ];

  const [produtos, fotos] = await Promise.all([
    Produtos.findAll({
      where: { id_produto: { [Op.in]: productIds } },
    }),
    ProdutoFotos.findAll({
      where: {
        [Op.or]: [
          { id_produto_cor: { [Op.in]: corIds } },
          { id_produto: { [Op.in]: productIds } },
        ],
      },
      order: [["id_produto_foto", "ASC"]],
    }),
  ]);

  const produtosById = new Map(produtos.map((produto) => [produto.id_produto, produto]));
  const fotosByCorId = new Map<number, string>();
  const fotosByProdutoId = new Map<number, string>();

  for (const foto of fotos) {
    if (!fotosByCorId.has(foto.id_produto_cor)) {
      fotosByCorId.set(foto.id_produto_cor, foto.caminho_url);
    }

    if (!fotosByProdutoId.has(foto.id_produto)) {
      fotosByProdutoId.set(foto.id_produto, foto.caminho_url);
    }
  }

  return items.map((item) => {
    const rawItem = typeof item.toJSON === "function" ? item.toJSON() : item;
    const cor = coresById.get(Number(item.id_produto_cor));
    const grade = gradesById.get(Number(item.id_produto_grade));

    if (!cor || !grade || cor.id_produto !== grade.id_produto) {
      return {
        ...rawItem,
        produto: null,
        cor: null,
        grade: null,
        foto_produto: null,
      };
    }

    const produto = produtosById.get(cor.id_produto);
    if (!produto) {
      return {
        ...rawItem,
        produto: null,
        cor: null,
        grade: null,
        foto_produto: null,
      };
    }

    const quantidade = normalizeQuantidade(item.quantidade);
    const acrescimoCor = roundMoney(parseMoney(cor.acrescimo));
    const acrescimoGrade = roundMoney(parseMoney(grade.acrescimo));
    const precoBase = roundMoney(parseMoney(produto.preco_base));
    const precoUnitario = roundMoney(precoBase + acrescimoCor + acrescimoGrade);
    const subtotal = roundMoney(precoUnitario * quantidade);
    const fotoProduto =
      fotosByCorId.get(cor.id_produto_cor) ?? fotosByProdutoId.get(produto.id_produto) ?? null;

    return {
      ...rawItem,
      quantidade,
      preco_unitario: precoUnitario,
      subtotal,
      nome_produto: produto.nome,
      descricao_produto: produto.descricao,
      foto_produto: fotoProduto,
      produto: {
        id_produto: produto.id_produto,
        nome: produto.nome,
        descricao: produto.descricao,
        preco_base: precoBase,
        foto: fotoProduto,
      },
      cor: {
        id_produto_cor: cor.id_produto_cor,
        nome: cor.nome,
        codigo_rgb: cor.codigo_rgb,
        acrescimo: acrescimoCor,
      },
      grade: {
        id_produto_grade: grade.id_produto_grade,
        nome: grade.nome,
        acrescimo: acrescimoGrade,
      },
    };
  });
};

export const calculateSubtotal = (precoUnitario: number, quantidade: number) =>
  roundMoney(precoUnitario * normalizeQuantidade(quantidade));

export const normalizeItemQuantity = normalizeQuantidade;
