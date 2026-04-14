import argon2 from "argon2";
import UsuarioSenhasHistorico from "../models/UsuarioSenhasHistorico";
import Usuarios from "../models/Usuarios";

class UsuarioSenhasHistoricoController { 
  private static getUserId(user: any) {
    const rawUserId = typeof user?.get === "function" ? user.get("id_usuario") : user?.id_usuario;
    const parsedUserId = Number(rawUserId);
    return Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  }

  static async findByUserIdAndPassword(id_usuario: number, senha: string): Promise<Date | null> {
    const userId = Number(id_usuario);
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    const historyList = await UsuarioSenhasHistorico.findAll({
      where: { id_usuario: userId },
      order: [["data_criacao", "DESC"]],
    });

    for (const history of historyList) {
      const isSamePassword = await argon2.verify(history.senha, senha);
      if (isSamePassword) {
        return history.data_criacao;
      }
    }

    return null;
  }
   
  static async findByPasswordHash(email : string, senha : string) : Promise<Date | null> {

    const user = await Usuarios.findOne({where: {email}});
    if (!user) {
      return null;
    }

    const userId = UsuarioSenhasHistoricoController.getUserId(user);
    if (userId == null) {
      return null;
    }

    return UsuarioSenhasHistoricoController.findByUserIdAndPassword(userId, senha);
  }

  static async create( id_usuario:number, senhaHash : string) : Promise<boolean> {  
    const userId = Number(id_usuario);
    if (!Number.isInteger(userId) || userId <= 0) {
      return false;
    }

    const user = await Usuarios.findByPk(userId);
    if (!user) {
      return false;
    }

    await UsuarioSenhasHistorico.create({
      id_usuario: userId,
      senha: senhaHash,
    });

    return true;
  }

}

export default UsuarioSenhasHistoricoController;
