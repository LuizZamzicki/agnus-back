import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class UsuarioSenhasHistorico extends Model {
  declare id_usuario_senha_hist: number;
  declare id_usuario: number;
  declare senha: string;
  declare data_criacao: Date;
}

UsuarioSenhasHistorico.init(
  {
    id_usuario_senha_hist: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id_usuario",
      },
      onDelete: "CASCADE",
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    data_criacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "usuario_senhas_historico",
    timestamps: false,
    indexes: [
      {
        name: "idx_hist_usuario_data",
        fields: ["id_usuario", "data_criacao"],
      },
    ],
  },
);

export default UsuarioSenhasHistorico;
