import argon2 from "argon2";
import UsuarioSenhasHistorico from "../models/UsuarioSenhasHistorico";
import Usuarios from "../models/Usuarios";

class UsuarioSenhasHistoricoController { 
   
  static async findByPasswordHash(email : string, senha : string) : Promise<Date | null> {

    const user = await Usuarios.findOne({where: {email}});
    if (!user) {
      return null;
    }

    const historyList = await UsuarioSenhasHistorico.findAll({
      where: { id_usuario: Number(user.id_usuario) },
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

  static async create( id_usuario:number, senhaHash : string) : Promise<boolean> {  

    const user = await Usuarios.findByPk(Number(id_usuario));
    if (!user) {
      return false;
    }

    await UsuarioSenhasHistorico.create({
      id_usuario: Number(id_usuario),
      senha: senhaHash,
    });

    return true;
  }

}

export default UsuarioSenhasHistoricoController;
