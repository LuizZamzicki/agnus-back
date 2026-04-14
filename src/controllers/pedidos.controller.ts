import { Request, Response } from "express";
import Pedidos from "../models/Pedidos";
import UsuarioEnderecos from "../models/UsuarioEnderecos";
import Usuarios from "../models/Usuarios";

class PedidosController {
  private static readonly STATUS_VALIDOS = [
    "aguardando_calculo_frete",
    "aguardando_pagamento",
    "pago",
    "enviado",
    "entregue",
    "cancelado",
  ];

  private static getModelNumber(instance: any, fieldName: string) {
    const rawValue = typeof instance?.get === "function" ? instance.get(fieldName) : instance?.[fieldName];
    const parsedValue = Number(rawValue);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  static async findAll(req: Request, res: Response) {
    const { id_usuario, status } = req.query;
    const where: { id_usuario?: number; status?: string } = {};

    if (id_usuario !== undefined) {
      const parsedUsuarioId = Number(id_usuario);
      if (Number.isNaN(parsedUsuarioId)) {
        return res.status(400).json({ message: "id_usuario invÃ¡lido." });
      }
      where.id_usuario = parsedUsuarioId;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status);
      if (!PedidosController.STATUS_VALIDOS.includes(normalizedStatus)) {
        return res.status(400).json({ message: "status invÃ¡lido." });
      }
      where.status = normalizedStatus;
    }

    const pedidos = await Pedidos.findAll({ where });
    return res.status(200).send(pedidos);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const pedido = await Pedidos.findByPk(Number(id));

    if (!pedido) {
      return res.status(404).json({ message: "Pedido nÃ£o encontrado" });
    }

    return res.status(200).send(pedido);
  }

  static async create(req: Request, res: Response) {
    const {
      id_usuario,
      id_usuario_endereco,
      status = "aguardando_pagamento",
      valor_total = 0,
      valor_frete = null,
    } = req.body;

    if (!id_usuario || !id_usuario_endereco) {
      return res.status(400).json({
        message: "id_usuario e id_usuario_endereco sÃ£o obrigatorios.",
      });
    }

    if (!PedidosController.STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ message: "status invÃ¡lido." });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "UsuÃ¡rio nÃ£o encontrado" });
    }

    const endereco = await UsuarioEnderecos.findByPk(Number(id_usuario_endereco));
    if (!endereco) {
      return res.status(404).json({ message: "EndereÃ§o do usuÃ¡rio nÃ£o encontrado" });
    }

    const enderecoUserId = PedidosController.getModelNumber(endereco, "id_usuario");
    if (enderecoUserId !== Number(id_usuario)) {
      return res.status(400).json({
        message: "O endereÃ§o informado nÃ£o pertence ao usuÃ¡rio informado.",
      });
    }

    const pedido = await Pedidos.create({
      id_usuario: Number(id_usuario),
      id_usuario_endereco: Number(id_usuario_endereco),
      status,
      valor_total,
      valor_frete,
    });

    return res.status(201).send(pedido);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { id_usuario, id_usuario_endereco, status, valor_total, valor_frete } = req.body;

    const pedido = await Pedidos.findByPk(Number(id));
    if (!pedido) {
      return res.status(404).json({ message: "Pedido nÃ£o encontrado" });
    }

    if (status !== undefined && !PedidosController.STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ message: "status invÃ¡lido." });
    }

    const nextIdUsuario =
      id_usuario !== undefined
        ? Number(id_usuario)
        : PedidosController.getModelNumber(pedido, "id_usuario");
    const nextIdUsuarioEndereco =
      id_usuario_endereco !== undefined
        ? Number(id_usuario_endereco)
        : PedidosController.getModelNumber(pedido, "id_usuario_endereco");

    if (nextIdUsuario == null || nextIdUsuarioEndereco == null) {
      return res.status(400).json({
        message: "Pedido com relacionamento de usuario ou endereco invalido.",
      });
    }

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(nextIdUsuario);
      if (!usuario) {
        return res.status(404).json({ message: "UsuÃ¡rio nÃ£o encontrado" });
      }
    }

    if (id_usuario_endereco !== undefined) {
      const endereco = await UsuarioEnderecos.findByPk(nextIdUsuarioEndereco);
      if (!endereco) {
        return res.status(404).json({ message: "EndereÃ§o do usuÃ¡rio nÃ£o encontrado" });
      }
    }

    const enderecoFinal = await UsuarioEnderecos.findByPk(nextIdUsuarioEndereco);
    const enderecoFinalUserId = enderecoFinal
      ? PedidosController.getModelNumber(enderecoFinal, "id_usuario")
      : null;
    if (!enderecoFinal || enderecoFinalUserId !== nextIdUsuario) {
      return res.status(400).json({
        message: "O endereÃ§o informado nÃ£o pertence ao usuÃ¡rio informado.",
      });
    }

    await pedido.update({
      id_usuario: nextIdUsuario,
      id_usuario_endereco: nextIdUsuarioEndereco,
      status: status ?? pedido.status,
      valor_total: valor_total !== undefined ? valor_total : pedido.valor_total,
      valor_frete: valor_frete !== undefined ? valor_frete : pedido.valor_frete,
    });

    return res.status(200).send(pedido);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const pedido = await Pedidos.findByPk(Number(id));

    if (!pedido) {
      return res.status(404).json({ message: "Pedido nÃ£o encontrado" });
    }

    await pedido.destroy();
    return res.status(204).send();
  }
}

export default PedidosController;
