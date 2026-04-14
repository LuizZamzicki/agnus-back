import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Produtos extends Model {
  declare id_produto: number;
  declare id_categoria: number | null;
  declare nome: string;
  declare descricao: string | null;
  declare preco_custo: number | null;
  declare preco_base: number;
  declare margem_lucro: number | null;
  declare ativo: boolean;
  declare data_criacao: Date;
  declare data_alteracao: Date;
}

Produtos.init(
  {
    id_produto: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: "categorias",
        key: "id_categoria",
      },
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    preco_custo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    preco_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    margem_lucro: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
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
    tableName: "produtos",
    timestamps: false,
    indexes: [
      {
        name: "FK_PRODUTOS_ID_CATEGORIA",
        fields: ["id_categoria"],
      },
      {
        name: "ft_produtos_nome",
        type: "FULLTEXT",
        fields: ["nome"],
      },
      {
        name: "ft_produtos_descricao",
        type: "FULLTEXT",
        fields: ["descricao"],
      },
      {
        name: "idx_produtos_nome_descricao",
        type: "FULLTEXT",
        fields: ["nome", "descricao"],
      },
    ],
  },
);

export default Produtos;
