import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Usuarios extends Model {
  public id_usuario!: number;
  public nome!: string;
  public cpf!: string | null;
  public email!: string;
  public senha!: string;
  public google_id!: string | null;
  public tipo!: "cliente" | "administrador";
  public data_criacao!: Date;
  public data_alteracao!: Date;
}

Usuarios.init(
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: true,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: "UQ_USUARIOS_EMAIL",
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    google_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: "UQ_USUARIOS_GOOGLE_ID",
      defaultValue: null,
    },
    tipo: {
      type: DataTypes.ENUM("cliente", "administrador"),
      allowNull: false,
      defaultValue: "cliente",
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
    tableName: "usuarios",
    timestamps: false,
  },
);

export default Usuarios;
