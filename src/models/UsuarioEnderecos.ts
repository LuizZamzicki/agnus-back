import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class UsuarioEnderecos extends Model {
  declare id_usuario_endereco: number;
  declare id_usuario: number;
  declare cep: string;
  declare logradouro: string;
  declare numero: string | null;
  declare complemento: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare pais: string | null;
  declare principal: boolean;
  declare data_criacao: Date;
  declare data_alteracao: Date;
  declare ativo: boolean;
}

UsuarioEnderecos.init(
  {
    id_usuario_endereco: {
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
    },
    cep: {
      type: DataTypes.STRING(9),
      allowNull: false,
    },
    logradouro: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    complemento: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    bairro: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    cidade: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true,
      defaultValue: null,
    },
    pais: {
      type: DataTypes.STRING(60),
      allowNull: true,
      defaultValue: "Brasil",
    },
    principal: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    data_criacao: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    data_alteracao: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "usuario_enderecos",
    timestamps: false,
    indexes: [
      {
        name: "FK_USUARIO_ENDERECOS_ID_USUARIO",
        fields: ["id_usuario"],
      },
    ],
  },
);

export default UsuarioEnderecos;
