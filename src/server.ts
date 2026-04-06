import "dotenv/config";
import app from "./app";
import sequelize from "./config/database";

const port = Number(process.env.PORT || 3000);

sequelize.sync({alter: true});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
