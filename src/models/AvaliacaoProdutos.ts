import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class AvaliacaoProdutos extends Model {
  declare id_avaliacao_produto: number;
  declare id_produto: number;
  declare id_usuario: number;
  declare titulo: string | null;
  declare comentario: string | null;
  declare nota: number | null;
}

AvaliacaoProdutos.init(
  {
    id_avaliacao_produto: {
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
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id_usuario",
      },
    },
    titulo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    nota: {
      type: DataTypes.DECIMAL(10, 1),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "avaliacao_produtos",
    timestamps: false,
    indexes: [
      {
        name: "FK_AVALIACAO_PRODUTOS_ID_PRODUTO",
        fields: ["id_produto"],
      },
      {
        name: "FK_AVALIACAO_PRODUTOS_ID_USUARIO",
        fields: ["id_usuario"],
      },
    ],
  },
);

export default AvaliacaoProdutos;
