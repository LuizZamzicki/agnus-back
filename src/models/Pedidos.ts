import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Pedidos extends Model {
  declare id_pedido: number;
  declare id_usuario: number;
  declare id_usuario_endereco: number;
  declare status:
    | "aguardando_calculo_frete"
    | "aguardando_pagamento"
    | "pago"
    | "enviado"
    | "entregue"
    | "cancelado";
  declare valor_total: number | null;
  declare valor_frete: number | null;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

Pedidos.init(
  {
    id_pedido: {
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
    id_usuario_endereco: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuario_enderecos",
        key: "id_usuario_endereco",
      },
    },
    status: {
      type: DataTypes.ENUM(
        "aguardando_calculo_frete",
        "aguardando_pagamento",
        "pago",
        "enviado",
        "entregue",
        "cancelado",
      ),
      allowNull: true,
      defaultValue: "aguardando_pagamento",
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    valor_frete: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
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
    tableName: "pedidos",
    timestamps: false,
    indexes: [
      {
        name: "FK_PEDIDOS_ID_USUARIO",
        fields: ["id_usuario"],
      },
      {
        name: "FK_PEDIDOS_ID_USUARIO_ENDERECO",
        fields: ["id_usuario_endereco"],
      },
      {
        name: "idx_pedidos_status",
        fields: ["status"],
      },
    ],
  },
);

export default Pedidos;
