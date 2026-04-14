import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Categorias extends Model {
  declare id_categoria: number;
  declare nome: string;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

Categorias.init(
  {
    id_categoria: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: "UQ_CATEGORIAS_NOME",
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
    tableName: "categorias",
    timestamps: false,
  },
);

export default Categorias;
