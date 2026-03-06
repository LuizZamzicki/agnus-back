import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
    "agnus",
    "mysql",
    "",
    {
        host: 'localhost',
        port: 5432,
        dialect: 'mysql', 
        logging: true
    }
);

export default sequelize;