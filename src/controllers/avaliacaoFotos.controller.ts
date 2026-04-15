import { Request, Response } from "express";
import AvaliacaoFotos from "../models/AvaliacaoFotos";
import AvaliacaoProdutos from "../models/AvaliacaoProdutos";
import { saveAvaliacaoFotoBits } from "../utils/avaliacaoFotoStorage";

class AvaliacaoFotosController {
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
    const files = AvaliacaoFotosController.getUploadedFiles(req);
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
    const savedFilePath = await saveAvaliacaoFotoBits(foto);
    if (savedFilePath) {
      return savedFilePath;
    }

    return AvaliacaoFotosController.parseFotoUrl(foto);
  }

  static async getByIdReview(req: Request, res: Response) {
    const { id_review } = req.params;
    const foto = await AvaliacaoFotos.findAll({ where: { id_avaliacao_produto: Number(id_review) } });

    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliacao nao encontrada" });
    }

    return res.status(200).send(foto);
  }

  static async create(req: Request, res: Response) {
    const { id_avaliacao_produto, caminho_url, caminhoUrl } = req.body;
    const fileKey =
      typeof caminho_url === "string" && !caminho_url.startsWith("http")
        ? caminho_url
        : typeof caminhoUrl === "string" && !caminhoUrl.startsWith("http")
          ? caminhoUrl
          : undefined;
    const uploadedFile = AvaliacaoFotosController.findUploadedFile(req, fileKey);
    const parsedUrl = await AvaliacaoFotosController.resolveFotoPath(
      uploadedFile ?? caminho_url ?? caminhoUrl,
    );

    if (!id_avaliacao_produto || !parsedUrl) {
      return res.status(400).json({
        message: "id_avaliacao_produto e caminho_url (ou bits) sao obrigatorios.",
      });
    }

    const avaliacao = await AvaliacaoProdutos.findByPk(Number(id_avaliacao_produto));
    if (!avaliacao) {
      return res.status(404).json({ message: "Avaliacao de produto nao encontrada" });
    }

    const foto = await AvaliacaoFotos.create({
      id_avaliacao_produto: Number(id_avaliacao_produto),
      caminho_url: parsedUrl,
    });

    return res.status(201).send(foto);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_avaliacao_produto, caminho_url, caminhoUrl } = req.body;
    const fileKey =
      typeof caminho_url === "string" && !caminho_url.startsWith("http")
        ? caminho_url
        : typeof caminhoUrl === "string" && !caminhoUrl.startsWith("http")
          ? caminhoUrl
          : undefined;
    const uploadedFile = AvaliacaoFotosController.findUploadedFile(req, fileKey);
    const parsedUrl =
      caminho_url !== undefined || caminhoUrl !== undefined || uploadedFile !== undefined
        ? await AvaliacaoFotosController.resolveFotoPath(uploadedFile ?? caminho_url ?? caminhoUrl)
        : undefined;

    const foto = await AvaliacaoFotos.findByPk(Number(id));
    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliacao nao encontrada" });
    }

    const nextIdAvaliacao =
      id_avaliacao_produto !== undefined
        ? Number(id_avaliacao_produto)
        : foto.id_avaliacao_produto;

    if (id_avaliacao_produto !== undefined) {
      const avaliacao = await AvaliacaoProdutos.findByPk(nextIdAvaliacao);
      if (!avaliacao) {
        return res.status(404).json({ message: "Avaliacao de produto nao encontrada" });
      }
    }

    if ((caminho_url !== undefined || caminhoUrl !== undefined || uploadedFile !== undefined) && !parsedUrl) {
      return res.status(400).json({ message: "caminho_url invalido." });
    }

    await foto.update({
      id_avaliacao_produto: nextIdAvaliacao,
      caminho_url: parsedUrl ?? foto.caminho_url,
    });

    return res.status(200).send(foto);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const foto = await AvaliacaoFotos.findByPk(Number(id));

    if (!foto) {
      return res.status(404).json({ message: "Foto da avaliacao nao encontrada" });
    }

    await foto.destroy();
    return res.status(204).send();
  }
}

export default AvaliacaoFotosController;
