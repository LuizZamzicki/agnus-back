import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class PedidoItens extends Model {
  declare id_pedido_item: number;
  declare id_pedido: number;
  declare id_produto_cor: number;
  declare id_produto_grade: number;
  declare quantidade: number;
  declare preco_unitario: number;
  declare subtotal: number | null;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

PedidoItens.init(
  {
    id_pedido_item: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_pedido: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pedidos",
        key: "id_pedido",
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
      allowNull: false,
    },
    preco_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
    tableName: "pedido_itens",
    timestamps: false,
    indexes: [
      {
        name: "FK_PEDIDO_ITENS_ID_PEDIDO",
        fields: ["id_pedido"],
      },
      {
        name: "FK_PEDIDO_ITENS_ID_PRODUTO_COR",
        fields: ["id_produto_cor"],
      },
      {
        name: "FK_PEDIDO_ITENS_ID_PRODUTO_GRADE",
        fields: ["id_produto_grade"],
      },
    ],
  },
);

export default PedidoItens;
