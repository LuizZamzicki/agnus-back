import { Request, Response } from "express";
import UsuarioEnderecos from "../models/UsuarioEnderecos";
import Usuarios from "../models/Usuarios";
import type {
  UsuarioEnderecoBody,
  UsuarioEnderecoRouteParams,
  UsuarioEnderecoUpdateData,
} from "../types/usuario-endereco.types";

type UsuarioEnderecoRequest = Request<UsuarioEnderecoRouteParams, object, UsuarioEnderecoBody>;

class UsuarioEnderecoPayload {
  constructor(private readonly body: UsuarioEnderecoBody) {}

  private parseId(value: number | string | null | undefined) {
    const parsedId = Number(value);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private parseText(value: string | null | undefined) { 
    return typeof value === "string" ? value.trim() || null : null; 
  }
  
  get userId() { return this.parseId(this.body.id_usuario); }
  get cep() { return this.parseText(this.body.cep); }
  get logradouro() { return this.parseText(this.body.logradouro); }
  get numero() { return this.parseText(this.body.numero); }
  get complemento() { return this.parseText(this.body.complemento); }
  get bairro() { return this.parseText(this.body.bairro); }
  get cidade() { return this.parseText(this.body.cidade); }
  get estado() { return this.parseText(this.body.estado); }
  get pais() { return this.parseText(this.body.pais) ?? "Brasil"; }
  get principal() { return Boolean(this.body.principal); }
  get ativo() { return this.body.ativo === undefined ? true : Boolean(this.body.ativo); }

  hasUserField() { return this.body.id_usuario !== undefined; }
  hasCepField() { return this.body.cep !== undefined; }
  hasLogradouroField() { return this.body.logradouro !== undefined; }
  hasPrincipalField() { return this.body.principal !== undefined; }
  hasAtivoField() { return this.body.ativo !== undefined; }
}

class UsuarioEnderecosController {
  static parsePositiveId(value: string | undefined) {
    const parsedId = Number(value);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private static getCreateErrorMessage(payload: UsuarioEnderecoPayload) {
    if (!payload.hasUserField() || !payload.hasCepField() || !payload.hasLogradouroField()) 
      return "id_usuario, cep e logradouro sao obrigatorios.";
   
    if (!payload.userId) return "id_usuario invalido.";
    if (!payload.cep) return "cep invalido.";
    if (!payload.logradouro) return "logradouro invalido.";
    return null;
  }

  private static getUpdateErrorMessage(payload: UsuarioEnderecoPayload) {
    if (payload.hasUserField() && !payload.userId) return "id_usuario invalido.";
    if (payload.hasCepField() && !payload.cep) return "cep invalido.";
    if (payload.hasLogradouroField() && !payload.logradouro) return "logradouro invalido.";
    return null;
  }

  private static async findUserError(userId?: number | null) {
    return userId && !(await Usuarios.findByPk(userId)) ? "Usuario nao encontrado." : null;
  }

  private static buildUpdateData(endereco: UsuarioEnderecos, payload: UsuarioEnderecoPayload): UsuarioEnderecoUpdateData {
    return { 
            id_usuario: payload.userId ?? endereco.id_usuario, 
            cep: payload.cep ?? endereco.cep, 
            logradouro: payload.logradouro ?? endereco.logradouro,
            numero: payload.numero ?? endereco.numero, 
            complemento: payload.complemento ?? endereco.complemento, 
            bairro: payload.bairro ?? endereco.bairro,
            cidade: payload.cidade ?? endereco.cidade, 
            estado: payload.estado ?? endereco.estado, 
            pais: payload.pais ?? endereco.pais, 
            principal: payload.hasPrincipalField() ? payload.principal : endereco.principal, 
            ativo: payload.hasAtivoField() ? payload.ativo : endereco.ativo 
          };
  }

  static async getByIdUser(req: UsuarioEnderecoRequest, res: Response) {
    const userId = UsuarioEnderecosController.parsePositiveId(req.params.id_user);

    if (!userId) 
      return res.status(400).json({ message: "ID do usuario invalido." });
    
    const enderecos = await UsuarioEnderecos.findAll({ where: { id_usuario: userId } });
    
    if (!enderecos) 
      return res.status(404).json({ message: "Endereco nao encontrado." });
    
    return res.status(200).send(enderecos);
  }

  static async create(req: UsuarioEnderecoRequest, res: Response) {
    const payload = new UsuarioEnderecoPayload(req.body), message = UsuarioEnderecosController.getCreateErrorMessage(payload);
   
    if (message) 
      return res.status(400).json({ message });
    
    const userMessage = await UsuarioEnderecosController.findUserError(payload.userId);
    
    if (userMessage) 
      return res.status(404).json({ message: userMessage });
    
    return res.status(201).send(await UsuarioEnderecos.create({ 
      id_usuario: payload.userId!, 
      cep: payload.cep!, 
      logradouro: payload.logradouro!, 
      numero: payload.numero, 
      complemento: payload.complemento, 
      bairro: payload.bairro, 
      cidade: payload.cidade, 
      estado: payload.estado, 
      pais: payload.pais, 
      principal: payload.principal, 
      ativo: payload.ativo 
    }));
  }

  static async update(req: UsuarioEnderecoRequest, res: Response) {

    const addressId = UsuarioEnderecosController.parsePositiveId(req.params.id);
    const payload = new UsuarioEnderecoPayload(req.body);
    
    if (!addressId) 
      return res.status(400).json({ message: "ID do endereco invalido." });
    
    const endereco = await UsuarioEnderecos.findByPk(addressId);
    const message = UsuarioEnderecosController.getUpdateErrorMessage(payload);
    
    if (!endereco) 
      return res.status(404).json({ message: "Endereco nao encontrado." });
    
    if (message) 
      return res.status(400).json({ message });
    
    const userMessage = await UsuarioEnderecosController.findUserError(payload.userId);
    
    if (userMessage) 
      return res.status(404).json({ message: userMessage });
    
    await endereco.update(UsuarioEnderecosController.buildUpdateData(endereco, payload));
    return res.status(200).send(endereco);
  }

  static async remove(req: UsuarioEnderecoRequest, res: Response) {
    const addressId = UsuarioEnderecosController.parsePositiveId(req.params.id);

    if (!addressId) 
      return res.status(400).json({ message: "ID do endereco invalido." });
    
    const endereco = await UsuarioEnderecos.findByPk(addressId);
    
    if (!endereco) 
      return res.status(404).json({ message: "Endereco nao encontrado." });
    
    await endereco.destroy();
    return res.status(204).send();
  }
}

export default UsuarioEnderecosController;
