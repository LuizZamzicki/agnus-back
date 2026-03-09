import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class ProdutoGrades extends Model {
  public id_produto_grade!: number;
  public id_produto!: number;
  public nome!: string;
  public acrescimo!: number | null;
  public data_criacao!: Date;
  public data_alteracao!: Date;
}

ProdutoGrades.init(
  {
    id_produto_grade: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_produto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "produtos",
        key: "id_produto",
      },
    },
    nome: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    acrescimo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
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
    tableName: "produto_grades",
    timestamps: false,
    indexes: [
      {
        name: "FK_PRDUTO_GRADES_ID_PRODUTO",
        fields: ["id_produto"],
      },
    ],
  },
);

export default ProdutoGrades;
