import { Request, Response } from "express";
import UsuarioEnderecos from "../models/UsuarioEnderecos";
import Usuarios from "../models/Usuarios";

class UsuarioEnderecosController {
  static async findAll(req: Request, res: Response) {
    const { id_usuario, ativo } = req.query;

    const where: { id_usuario?: number; ativo?: boolean } = {};

    if (id_usuario !== undefined) {
      const parsedUserId = Number(id_usuario);
      if (Number.isNaN(parsedUserId)) {
        return res.status(400).json({ message: "id_usuario inválido." });
      }
      where.id_usuario = parsedUserId;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === "1" || ativo === "true";
    }

    const enderecos = await UsuarioEnderecos.findAll({ where });
    return res.status(200).send(enderecos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const endereco = await UsuarioEnderecos.findByPk(Number(id));

    if (!endereco) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }

    return res.status(200).send(endereco);
  }

  static async create(req: Request, res: Response) {
    const {
      id_usuario,
      cep,
      logradouro,
      numero = null,
      complemento = null,
      bairro = null,
      cidade = null,
      estado = null,
      pais = "Brasil",
      principal = false,
      ativo = true,
    } = req.body;

    if (!id_usuario || !cep || !logradouro) {
      return res.status(400).json({
        message: "id_usuario, cep e logradouro são obrigatórios.",
      });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const endereco = await UsuarioEnderecos.create({
      id_usuario: Number(id_usuario),
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pais,
      principal: Boolean(principal),
      ativo: Boolean(ativo),
    });

    return res.status(201).send(endereco);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const {
      id_usuario,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pais,
      principal,
      ativo,
    } = req.body;

    const endereco = await UsuarioEnderecos.findByPk(Number(id));
    if (!endereco) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(Number(id_usuario));
      if (!usuario) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
    }

    await endereco.update({
      id_usuario: id_usuario !== undefined ? Number(id_usuario) : endereco.id_usuario,
      cep: cep ?? endereco.cep,
      logradouro: logradouro ?? endereco.logradouro,
      numero: numero !== undefined ? numero : endereco.numero,
      complemento: complemento !== undefined ? complemento : endereco.complemento,
      bairro: bairro !== undefined ? bairro : endereco.bairro,
      cidade: cidade !== undefined ? cidade : endereco.cidade,
      estado: estado !== undefined ? estado : endereco.estado,
      pais: pais !== undefined ? pais : endereco.pais,
      principal: principal !== undefined ? Boolean(principal) : endereco.principal,
      ativo: ativo !== undefined ? Boolean(ativo) : endereco.ativo,
    });

    return res.status(200).send(endereco);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const endereco = await UsuarioEnderecos.findByPk(Number(id));

    if (!endereco) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }

    await endereco.destroy();
    return res.status(204).send();
  }
}

export default UsuarioEnderecosController;
