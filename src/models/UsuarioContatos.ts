import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class UsuarioContatos extends Model {
  public id_usuario_contato!: number;
  public id_usuario!: number;
  public tipo!: "telefone" | "celular" | "email" | "outro";
  public valor!: string;
  public principal!: boolean;
  public data_criacao!: Date;
  public data_alteracao!: Date;
}

UsuarioContatos.init(
  {
    id_usuario_contato: {
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
    tipo: {
      type: DataTypes.ENUM("telefone", "celular", "email", "outro"),
      allowNull: true,
      defaultValue: "celular",
    },
    valor: {
      type: DataTypes.STRING(120),
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: "usuario_contatos",
    timestamps: false,
    indexes: [
      {
        name: "FK_USUARIO_CONTATOS_ID_USUARIO",
        fields: ["id_usuario"],
      },
    ],
  },
);

export default UsuarioContatos;
