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

  static async findAll(req: Request, res: Response) {
    const { id_usuario, status } = req.query;
    const where: { id_usuario?: number; status?: string } = {};

    if (id_usuario !== undefined) {
      const parsedUsuarioId = Number(id_usuario);
      if (Number.isNaN(parsedUsuarioId)) {
        return res.status(400).json({ message: "id_usuario inválido." });
      }
      where.id_usuario = parsedUsuarioId;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status);
      if (!PedidosController.STATUS_VALIDOS.includes(normalizedStatus)) {
        return res.status(400).json({ message: "status inválido." });
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
      return res.status(404).json({ message: "Pedido não encontrado" });
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
        message: "id_usuario e id_usuario_endereco são obrigatorios.",
      });
    }

    if (!PedidosController.STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ message: "status inválido." });
    }

    const usuario = await Usuarios.findByPk(Number(id_usuario));
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const endereco = await UsuarioEnderecos.findByPk(Number(id_usuario_endereco));
    if (!endereco) {
      return res.status(404).json({ message: "Endereço do usuário não encontrado" });
    }

    if (endereco.id_usuario !== Number(id_usuario)) {
      return res.status(400).json({
        message: "O endereço informado não pertence ao usuário informado.",
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
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    if (status !== undefined && !PedidosController.STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ message: "status inválido." });
    }

    const nextIdUsuario = id_usuario !== undefined ? Number(id_usuario) : pedido.id_usuario;
    const nextIdUsuarioEndereco =
      id_usuario_endereco !== undefined
        ? Number(id_usuario_endereco)
        : pedido.id_usuario_endereco;

    if (id_usuario !== undefined) {
      const usuario = await Usuarios.findByPk(nextIdUsuario);
      if (!usuario) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
    }

    if (id_usuario_endereco !== undefined) {
      const endereco = await UsuarioEnderecos.findByPk(nextIdUsuarioEndereco);
      if (!endereco) {
        return res.status(404).json({ message: "Endereço do usuário não encontrado" });
      }
    }

    const enderecoFinal = await UsuarioEnderecos.findByPk(nextIdUsuarioEndereco);
    if (!enderecoFinal || enderecoFinal.id_usuario !== nextIdUsuario) {
      return res.status(400).json({
        message: "O endereço informado não pertence ao usuário informado.",
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
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    await pedido.destroy();
    return res.status(204).send();
  }
}

export default PedidosController;
