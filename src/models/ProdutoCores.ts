import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";
import { normalizeRgbColor } from "../utils/color";

class ProdutoCores extends Model {
  declare id_produto_cor: number;
  declare id_produto: number;
  declare nome: string;
  declare codigo_rgb: string;
  declare acrescimo: number | null;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

ProdutoCores.init(
  {
    id_produto_cor: {
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
    codigo_rgb: {
      type: DataTypes.STRING(16),
      allowNull: false,
      set(value: unknown) {
        const normalized = normalizeRgbColor(String(value ?? ""));
        if (!normalized) {
          throw new Error("codigo_rgb invalido. Use formato RGB valido.");
        }
        this.setDataValue("codigo_rgb", normalized);
      },
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
    tableName: "produto_cores",
    timestamps: false,
    indexes: [
      {
        name: "FK_CORES_ID_PRODUTO",
        fields: ["id_produto"],
      },
    ],
  },
);

export default ProdutoCores;
