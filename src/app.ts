import express, { Request, Response, Router } from 'express';
import AuthController from './controllers/auth.controller';
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

router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.me);
router.get('/auth/google', AuthController.googleStart);
router.get('/auth/google/callback', AuthController.googleCallback);

app.use(router);

export default app;
