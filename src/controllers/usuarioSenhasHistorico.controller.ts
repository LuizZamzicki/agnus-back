import argon2 from "argon2";
import UsuarioSenhasHistorico from "../models/UsuarioSenhasHistorico";
import Usuarios from "../models/Usuarios";

class UsuarioSenhasHistoricoController {
  private static getUserId(user: Usuarios) {
    const userId = Number(user.id_usuario);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  private static isValidUserId(id_usuario: number) {
    const userId = Number(id_usuario);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  private static async findHistoryList(id_usuario: number) {
    return UsuarioSenhasHistorico.findAll({ 
                                            where: { id_usuario }, 
                                            order: [["data_criacao", "DESC"]] 
                                         });
  }

  private static async findMatchedHistoryDate(id_usuario: number, senha: string) {
    const historyList = await UsuarioSenhasHistoricoController.findHistoryList(id_usuario);

    for (const history of historyList) {
      if (await argon2.verify(history.senha, senha)) 
        return history.data_criacao;
    } 

    return null;
  }

  static async findByUserIdAndPassword(id_usuario: number, senha: string): Promise<Date | null> {
    const userId = UsuarioSenhasHistoricoController.isValidUserId(id_usuario);

    if (!userId) return null;

    return UsuarioSenhasHistoricoController.findMatchedHistoryDate(userId, senha);
  }

  static async findByPasswordHash(email: string, senha: string): Promise<Date | null> {
    const user = await Usuarios.findOne({ where: { email } });

    if (!user) return null;
    
    const userId = UsuarioSenhasHistoricoController.getUserId(user);
    
    if (!userId) return null;
    
    return UsuarioSenhasHistoricoController.findByUserIdAndPassword(userId, senha);
  }

  static async create(id_usuario: number, senhaHash: string): Promise<boolean> {
    const userId = UsuarioSenhasHistoricoController.isValidUserId(id_usuario);

    if (!userId || !(await Usuarios.findByPk(userId))) 
      return false;
    
    await UsuarioSenhasHistorico.create({ id_usuario: userId, senha: senhaHash });
    return true;
  }
}

export default UsuarioSenhasHistoricoController;
