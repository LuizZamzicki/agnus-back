import { Request, Response } from "express";
import User from "../models/User";

class UsersController {
  static async findAll(req: Request, res: Response) {
    const users = await User.findAll();

    res.send(users);
  }

  static async getById(req: Request, res: Response) {
    const { id_usuario } = req.params;
    const user = await User.findByPk(Number(id_usuario));

    return res.status(200).send(user);
  }

  static async create(req: Request, res: Response) {
    const { nome, email } = req.body;

    if (email && email != '') {
        const savedUser = await User.findOne({ where: {email: email} });
        if (savedUser) {
            return res.status(400).json({ message: 'Usuário já existe com esse email!' });
        }
    } else {
        return res.status(400).json({ message: 'Email é obrigatório!' });
    }

    const user = await User.create({ nome: nome, email: email });
    return res.status(200).send(user);
  }

  static async remove(req: Request, res: Response) {
    const { id_usuario } = req.params;
    const user = await User.findByPk(Number(id_usuario));
    if (user) {
      user?.destroy();
    } else {
      res.status(404).json({ messsage: "Usuário não encontrado" });
    }

    res.status(204).send();
  }

  static async update(req: Request, res: Response) {
    const { id_usuario } = req.params;
    const { nome, email } = req.body;

    const user = await User.findByPk(Number(id_usuario));
    if (user) {
      await user.update({
        nome: nome,
        email: email
      });

      res.status(200).send(user);
    } else {
      res.status(404).json({ messsage: "Usuário não encontrado" });
    }
  }
}

export default UsersController;
