import express, { Request, Response, Router } from 'express';
import AvaliacaoFotosController from './controllers/avaliacaoFotos.controller';
import AvaliacaoProdutosController from './controllers/avaliacaoProdutos.controller';
import AuthController from './controllers/auth.controller';
import CarrinhoItensController from './controllers/carrinhoItens.controller';
import CarrinhosController from './controllers/carrinhos.controller';
import CategoriasController from './controllers/categorias.controller';
import PedidoItensController from './controllers/pedidoItens.controller';
import ProdutoCoresController from './controllers/produtoCores.controller';
import ProdutoFotosController from './controllers/produtoFotos.controller';
import ProdutoGradesController from './controllers/produtoGrades.controller';
import ProdutosController from './controllers/produtos.controller';
import PedidosController from './controllers/pedidos.controller';
import UsuarioContatosController from './controllers/usuarioContatos.controller';
import UsuarioEnderecosController from './controllers/usuarioEnderecos.controller';
import UserPasswordHistoryController from './controllers/usuarioSenhasHistorico.controller';
import UsersController from './controllers/usuarios.controller';
import authenticateToken from './middlewares/auth.middleware';

const app = express();
app.use(express.json());

const router: Router = Router();

router.get('/users', UsersController.findAll);
router.post('/users', UsersController.create);
router.get('/users/:id', UsersController.getById);
router.delete('/users/:id', UsersController.remove);
router.put('/users/:id', UsersController.update);
router.patch('/users/:id/password', UsersController.updatePassword);

router.get('/user-addresses', UsuarioEnderecosController.findAll);
router.post('/user-addresses', UsuarioEnderecosController.create);
router.get('/user-addresses/:id', UsuarioEnderecosController.getById);
router.put('/user-addresses/:id', UsuarioEnderecosController.update);
router.delete('/user-addresses/:id', UsuarioEnderecosController.remove);

router.get('/user-contacts', UsuarioContatosController.findAll);
router.post('/user-contacts', UsuarioContatosController.create);
router.get('/user-contacts/:id', UsuarioContatosController.getById);
router.put('/user-contacts/:id', UsuarioContatosController.update);
router.delete('/user-contacts/:id', UsuarioContatosController.remove);

router.get('/categories', CategoriasController.findAll);
router.post('/categories', CategoriasController.create);
router.get('/categories/:id', CategoriasController.getById);
router.put('/categories/:id', CategoriasController.update);
router.delete('/categories/:id', CategoriasController.remove);

router.get('/products', ProdutosController.findAll);
router.post('/products', ProdutosController.create);
router.get('/products/:id', ProdutosController.getById);
router.put('/products/:id', ProdutosController.update);
router.delete('/products/:id', ProdutosController.remove);

router.get('/product-colors', ProdutoCoresController.findAll);
router.post('/product-colors', ProdutoCoresController.create);
router.get('/product-colors/:id', ProdutoCoresController.getById);
router.put('/product-colors/:id', ProdutoCoresController.update);
router.delete('/product-colors/:id', ProdutoCoresController.remove);

router.get('/product-photos', ProdutoFotosController.findAll);
router.post('/product-photos', ProdutoFotosController.create);
router.get('/product-photos/:id', ProdutoFotosController.getById);
router.put('/product-photos/:id', ProdutoFotosController.update);
router.delete('/product-photos/:id', ProdutoFotosController.remove);

router.get('/product-grades', ProdutoGradesController.findAll);
router.post('/product-grades', ProdutoGradesController.create);
router.get('/product-grades/:id', ProdutoGradesController.getById);
router.put('/product-grades/:id', ProdutoGradesController.update);
router.delete('/product-grades/:id', ProdutoGradesController.remove);

router.get('/carts', CarrinhosController.findAll);
router.post('/carts', CarrinhosController.create);
router.get('/carts/:id', CarrinhosController.getById);
router.put('/carts/:id', CarrinhosController.update);
router.delete('/carts/:id', CarrinhosController.remove);

router.get('/cart-items', CarrinhoItensController.findAll);
router.post('/cart-items', CarrinhoItensController.create);
router.get('/cart-items/:id', CarrinhoItensController.getById);
router.put('/cart-items/:id', CarrinhoItensController.update);
router.delete('/cart-items/:id', CarrinhoItensController.remove);

router.get('/orders', PedidosController.findAll);
router.post('/orders', PedidosController.create);
router.get('/orders/:id', PedidosController.getById);
router.put('/orders/:id', PedidosController.update);
router.delete('/orders/:id', PedidosController.remove);

router.get('/order-items', PedidoItensController.findAll);
router.post('/order-items', PedidoItensController.create);
router.get('/order-items/:id', PedidoItensController.getById);
router.put('/order-items/:id', PedidoItensController.update);
router.delete('/order-items/:id', PedidoItensController.remove);

router.get('/product-reviews', AvaliacaoProdutosController.findAll);
router.post('/product-reviews', AvaliacaoProdutosController.create);
router.get('/product-reviews/:id', AvaliacaoProdutosController.getById);
router.put('/product-reviews/:id', AvaliacaoProdutosController.update);
router.delete('/product-reviews/:id', AvaliacaoProdutosController.remove);

router.get('/product-review-photos', AvaliacaoFotosController.findAll);
router.post('/product-review-photos', AvaliacaoFotosController.create);
router.get('/product-review-photos/:id', AvaliacaoFotosController.getById);
router.put('/product-review-photos/:id', AvaliacaoFotosController.update);
router.delete('/product-review-photos/:id', AvaliacaoFotosController.remove);

router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.me);
router.get('/auth/google', AuthController.googleStart);
router.get('/auth/google/callback', AuthController.googleCallback);

app.use(router);

export default app;
