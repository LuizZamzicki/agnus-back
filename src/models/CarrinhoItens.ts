import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class CarrinhoItens extends Model {
  declare id_carrinho_item: number;
  declare id_carrinho: number;
  declare id_produto_cor: number;
  declare id_produto_grade: number;
  declare quantidade: number | null;
  declare preco_unitario: number;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

CarrinhoItens.init(
  {
    id_carrinho_item: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_carrinho: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "carrinhos",
        key: "id_carrinho",
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
    id_produto_grade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "produto_grades",
        key: "id_produto_grade",
      },
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    preco_unitario: {
      type: DataTypes.DECIMAL(10, 2),
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
    tableName: "carrinho_itens",
    timestamps: false,
    indexes: [
      {
        name: "FK_CARRINHO_ITENS_ID_CARRINHO",
        fields: ["id_carrinho"],
      },
      {
        name: "FK_CARRINHO_ITENS_ID_PRODUTO_COR",
        fields: ["id_produto_cor"],
      },
      {
        name: "FK_CARRINHO_ITENS_ID_PRODUTO_GRADE",
        fields: ["id_produto_grade"],
      },
    ],
  },
);

export default CarrinhoItens;
