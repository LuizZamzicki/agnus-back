import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class ProdutoFotos extends Model {
  declare id_produto_foto: number;
  declare id_produto: number;
  declare id_produto_cor: number;
  declare caminho_url: string;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

ProdutoFotos.init(
  {
    id_produto_foto: {
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
    id_produto_cor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "produto_cores",
        key: "id_produto_cor",
      },
    },
    caminho_url: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: "produto_fotos",
    timestamps: false,
    indexes: [
      {
        name: "FK_PRODUTO_FOTOS_ID_PRODUTO",
        fields: ["id_produto"],
      },
      {
        name: "FK_PRODUTO_FOTOS_ID_PRODUTO_COR",
        fields: ["id_produto_cor"],
      },
    ],
  },
);

export default ProdutoFotos;
