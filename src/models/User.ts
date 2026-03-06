import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Usuarios extends Model {
  public id_usuario!: number;
  public name!: string;
  public email: string | undefined;
}

Usuarios.init(
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING
    }, 
  },
  {
    sequelize,
    tableName: "Users",
  },
);

export default Usuarios;