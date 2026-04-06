import { Request, Response } from "express";
import ProdutoCores from "../models/ProdutoCores";
import ProdutoFotos from "../models/ProdutoFotos";
import Produtos from "../models/Produtos";
import { saveProdutoFotoBits } from "../utils/produtoFotoStorage";

class ProdutoFotosController {
  private static getUploadedFiles(req: Request): Express.Multer.File[] {
    const files = (req as Request & {
      files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
    }).files;

    if (!files) {
      return [];
    }

    if (Array.isArray(files)) {
      return files;
    }

    return Object.values(files).flat();
  }

  private static findUploadedFile(req: Request, key?: string) {
    const files = ProdutoFotosController.getUploadedFiles(req);
    if (!files.length) {
      return undefined;
    }

    if (key) {
      const byFieldName = files.find((file) => file.fieldname === key);
      if (byFieldName) {
        return byFieldName;
      }

      const byOriginalName = files.find((file) => file.originalname === key);
      if (byOriginalName) {
        return byOriginalName;
      }
    }

    return files[0];
  }

  private static parseFotoUrl(foto: unknown) {
    if (typeof foto === "string") {
      return foto.trim();
    }

    if (foto && typeof foto === "object") {
      const source = foto as Record<string, unknown>;
      const rawUrl =
        source.caminho_url ??
        source.caminhoUrl ??
        source.caminho ??
        source.url ??
        source.src ??
        source.link ??
        source.path ??
        source.preview;
      if (typeof rawUrl === "string") {
        return rawUrl.trim();
      }
    }

    return "";
  }

  private static async resolveFotoPath(foto: unknown) {
    const savedFilePath = await saveProdutoFotoBits(foto);
    if (savedFilePath) {
      return savedFilePath;
    }

    return ProdutoFotosController.parseFotoUrl(foto);
  }

  static async getByIdProduto(req: Request, res: Response) {
    const { id_produto } = req.params;
    const foto = await ProdutoFotos.findAll({ where: { id_produto: Number(id_produto) } });

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto nao encontrada" });
    }

    return res.status(200).send(foto);
  }

  static async create(req: Request, res: Response) {
    const { id_produto, id_produto_cor, caminho_url, caminhoUrl } = req.body;
    const fileKey =
      typeof caminho_url === "string" && !caminho_url.startsWith("http")
        ? caminho_url
        : typeof caminhoUrl === "string" && !caminhoUrl.startsWith("http")
          ? caminhoUrl
          : undefined;
    const uploadedFile = ProdutoFotosController.findUploadedFile(req, fileKey);
    const parsedUrl = await ProdutoFotosController.resolveFotoPath(
      uploadedFile ?? caminho_url ?? caminhoUrl,
    );

    if (!id_produto || !id_produto_cor || !parsedUrl) {
      return res.status(400).json({
        message: "id_produto, id_produto_cor e caminho_url (ou bits) sao obrigatorios.",
      });
    }

    const produto = await Produtos.findByPk(Number(id_produto));
    if (!produto) {
      return res.status(404).json({ message: "Produto nao encontrado" });
    }

    const cor = await ProdutoCores.findByPk(Number(id_produto_cor));
    if (!cor) {
      return res.status(404).json({ message: "Cor do produto nao encontrada" });
    }

    if (cor.id_produto !== Number(id_produto)) {
      return res.status(400).json({
        message: "A cor informada nao pertence ao produto informado.",
      });
    }

    const foto = await ProdutoFotos.create({
      id_produto: Number(id_produto),
      id_produto_cor: Number(id_produto_cor),
      caminho_url: parsedUrl,
    });

    return res.status(201).send(foto);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_produto, id_produto_cor, caminho_url, caminhoUrl } = req.body;
    const fileKey =
      typeof caminho_url === "string" && !caminho_url.startsWith("http")
        ? caminho_url
        : typeof caminhoUrl === "string" && !caminhoUrl.startsWith("http")
          ? caminhoUrl
          : undefined;
    const uploadedFile = ProdutoFotosController.findUploadedFile(req, fileKey);
    const parsedUrl =
      caminho_url !== undefined || caminhoUrl !== undefined || uploadedFile !== undefined
        ? await ProdutoFotosController.resolveFotoPath(uploadedFile ?? caminho_url ?? caminhoUrl)
        : undefined;

    const foto = await ProdutoFotos.findByPk(Number(id));
    if (!foto) {
      return res.status(404).json({ message: "Foto do produto nao encontrada" });
    }

    const nextIdProduto = id_produto !== undefined ? Number(id_produto) : foto.id_produto;
    const nextIdProdutoCor =
      id_produto_cor !== undefined ? Number(id_produto_cor) : foto.id_produto_cor;

    if (id_produto !== undefined) {
      const produto = await Produtos.findByPk(nextIdProduto);
      if (!produto) {
        return res.status(404).json({ message: "Produto nao encontrado" });
      }
    }

    if (id_produto_cor !== undefined) {
      const cor = await ProdutoCores.findByPk(nextIdProdutoCor);
      if (!cor) {
        return res.status(404).json({ message: "Cor do produto nao encontrada" });
      }
    }

    if ((caminho_url !== undefined || caminhoUrl !== undefined || uploadedFile !== undefined) && !parsedUrl) {
      return res.status(400).json({ message: "caminho_url invalido." });
    }

    const corFinal = await ProdutoCores.findByPk(nextIdProdutoCor);
    if (!corFinal || corFinal.id_produto !== nextIdProduto) {
      return res.status(400).json({
        message: "A cor informada nao pertence ao produto informado.",
      });
    }

    await foto.update({
      id_produto: nextIdProduto,
      id_produto_cor: nextIdProdutoCor,
      caminho_url: parsedUrl ?? foto.caminho_url,
    });

    return res.status(200).send(foto);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await ProdutoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto do produto nao encontrada" });
    }

    await foto.destroy();
    return res.status(204).send();
  }
}

export default ProdutoFotosController;
