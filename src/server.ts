import "dotenv/config";
import app from "./app";
import sequelize from "./config/database";
import {
  initializeProdutoSearchIndex,
  syncAllProdutosToSearchIndex,
} from "./services/produtoSearchIndex.service";

const port = Number(process.env.PORT || 3000);

const bootstrap = async () => {
  await sequelize.sync({ alter: true });
  await initializeProdutoSearchIndex();
  await syncAllProdutosToSearchIndex();

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
};

void bootstrap();
