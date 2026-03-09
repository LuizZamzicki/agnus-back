import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Carrinhos extends Model {
  public id_carrinho!: number;
  public id_usuario!: number;
  public data_criacao!: Date;
  public data_alteracao!: Date;
}

Carrinhos.init(
  {
    id_carrinho: {
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
    tableName: "carrinhos",
    timestamps: false,
    indexes: [
      {
        name: "FK_CARRINHOS_ID_USUARIO",
        fields: ["id_usuario"],
      },
    ],
  },
);

export default Carrinhos;
