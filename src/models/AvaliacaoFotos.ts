import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class AvaliacaoFotos extends Model {
  declare id_avaliacao_foto: number;
  declare id_avaliacao_produto: number;
  declare caminho_url: string | null;
}

AvaliacaoFotos.init(
  {
    id_avaliacao_foto: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_avaliacao_produto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "avaliacao_produtos",
        key: "id_avaliacao_produto",
      },
    },
    caminho_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "avaliacao_fotos",
    timestamps: false,
    indexes: [
      {
        name: "FK_AVALIACAO_FOTO_ID_AVALIACAO_PRODUTO",
        fields: ["id_avaliacao_produto"],
      },
    ],
  },
);

export default AvaliacaoFotos;
