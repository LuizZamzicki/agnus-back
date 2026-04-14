const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const appFilePath = path.join(projectRoot, "src", "app.ts");
const outputDir = path.join(projectRoot, "postman");
const outputFilePath = path.join(outputDir, "agnus-back.postman_collection.json");

const appSource = fs.readFileSync(appFilePath, "utf8");

const ROUTE_OVERRIDES = {
  "AuthController.googleCallback": {
    query: [
      { key: "code", value: "COLE_O_CODE_DO_GOOGLE_AQUI" },
      { key: "state", value: "COLE_O_STATE_AQUI" },
      { key: "error", value: "" },
    ],
  },
  "ProdutosController.findAll": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "10" },
      { key: "id_categoria", value: "1" },
      { key: "ativo", value: "true" },
      { key: "q", value: "camiseta" },
    ],
  },
  "ProdutosController.catalog": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "10" },
      { key: "id_categoria", value: "1" },
      { key: "ativo", value: "true" },
      { key: "q", value: "camiseta basica" },
    ],
  },
  "ProdutosController.bestSellers": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "10" },
      { key: "id_categoria", value: "1" },
      { key: "ativo", value: "true" },
      { key: "q", value: "camiseta" },
    ],
  },
  "ProdutosController.create": {
    body: {
      id_categoria: 1,
      nome: "Camiseta Basic",
      descricao: "Camiseta de algodao",
      preco_custo: 39.9,
      preco_base: 79.9,
      ativo: true,
      grades: [
        {
          nome: "P",
          acrescimo: 0,
        },
        {
          nome: "M",
          acrescimo: 0,
        },
      ],
      cores: [
        {
          nome: "Preto",
          codigo_rgb: "rgb(0,0,0)",
          acrescimo: 0,
          fotos: [
            "https://exemplo.com/produtos/camiseta-preta-1.png",
          ],
          fotos_upload: [],
        },
      ],
    },
  },
  "ProdutosController.update": {
    body: {
      id_categoria: 1,
      nome: "Camiseta Basic Atualizada",
      descricao: "Descricao atualizada",
      preco_custo: 42.5,
      preco_base: 84.9,
      ativo: true,
      grades: [
        {
          nome: "P",
          acrescimo: 0,
        },
        {
          nome: "G",
          acrescimo: 5,
        },
      ],
      cores: [
        {
          nome: "Azul",
          codigo_rgb: "rgb(20,60,180)",
          acrescimo: 3,
          fotos: [
            "https://exemplo.com/produtos/camiseta-azul-1.png",
          ],
          fotos_upload: [],
        },
      ],
    },
  },
  "ProdutoFotosController.create": {
    formdata: [
      { key: "id_produto", type: "text", value: "1" },
      { key: "id_produto_cor", type: "text", value: "1" },
      { key: "caminho_url", type: "text", value: "https://exemplo.com/produtos/foto.png" },
      { key: "file", type: "file", src: "" },
    ],
  },
  "ProdutoFotosController.update": {
    formdata: [
      { key: "id_produto", type: "text", value: "1" },
      { key: "id_produto_cor", type: "text", value: "1" },
      { key: "caminho_url", type: "text", value: "https://exemplo.com/produtos/foto-atualizada.png" },
      { key: "file", type: "file", src: "" },
    ],
  },
};

function splitTopLevelArguments(input) {
  const parts = [];
  let current = "";
  let depth = 0;
  let stringQuote = null;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }

    if (stringQuote) {
      current += char;
      if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      current += char;
      stringQuote = char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveImport(fromFile, importPath) {
  const basePath = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.js"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function parseControllerImports(source) {
  const imports = new Map();
  const importRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+["'](.+?)["'];?/g;
  let match;

  while ((match = importRegex.exec(source)) !== null) {
    const [, importedName, importPath] = match;
    if (!importPath.includes("controllers/")) {
      continue;
    }

    const resolvedPath = resolveImport(appFilePath, importPath);
    if (!resolvedPath) {
      continue;
    }

    imports.set(importedName, {
      filePath: resolvedPath,
      source: fs.readFileSync(resolvedPath, "utf8"),
    });
  }

  return imports;
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let stringQuote = null;
  let escaped = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (stringQuote) {
      if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractMethodSource(controllerSource, methodName) {
  const signatureRegex = new RegExp(`static\\s+async\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{`);
  const match = signatureRegex.exec(controllerSource);
  if (!match) {
    return "";
  }

  const openBraceIndex = controllerSource.indexOf("{", match.index);
  const closeBraceIndex = findMatchingBrace(controllerSource, openBraceIndex);
  if (openBraceIndex < 0 || closeBraceIndex < 0) {
    return "";
  }

  return controllerSource.slice(openBraceIndex + 1, closeBraceIndex);
}

function parseLiteral(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }

  const value = rawValue.trim();
  if (!value) {
    return undefined;
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  const quotedMatch = value.match(/^["'`](.*)["'`]$/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  return undefined;
}

function parseFieldSpec(part) {
  if (!part || part.startsWith("...")) {
    return null;
  }

  const [leftSide, rawDefaultValue] = splitTopLevelArguments(part.replace(/\s*=\s*/, ",__DEFAULT__,"))
    .join(",")
    .split(",__DEFAULT__,");
  const left = leftSide.trim();
  const fieldName = left.includes(":") ? left.split(":")[0].trim() : left;

  if (!fieldName) {
    return null;
  }

  return {
    name: fieldName,
    defaultValue: parseLiteral(rawDefaultValue),
  };
}

function extractDestructuredFields(methodSource, sources) {
  const fields = [];
  const fieldMap = new Map();
  const destructuringRegex = /const\s+\{([\s\S]*?)\}\s*=\s*([^;]+);/g;
  let match;

  while ((match = destructuringRegex.exec(methodSource)) !== null) {
    const [, pattern, rawSource] = match;
    const normalizedSource = rawSource.trim().replace(/\s+/g, " ");
    if (!sources.includes(normalizedSource)) {
      continue;
    }

    for (const part of splitTopLevelArguments(pattern)) {
      const field = parseFieldSpec(part);
      if (!field) {
        continue;
      }

      if (!fieldMap.has(field.name)) {
        fieldMap.set(field.name, field);
        fields.push(field);
      }
    }
  }

  return fields;
}

function extractBodyAliases(methodSource) {
  const aliases = ["req.body", "req.body ?? {}", "req.body??{}"];
  const aliasRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*req\.body(?:\s*\?\?\s*\{\})?\s*;/g;
  let match;

  while ((match = aliasRegex.exec(methodSource)) !== null) {
    aliases.push(match[1]);
  }

  return aliases;
}

function extractQueryAliases(methodSource) {
  const aliases = ["req.query"];
  const aliasRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*req\.query\s*;/g;
  let match;

  while ((match = aliasRegex.exec(methodSource)) !== null) {
    aliases.push(match[1]);
  }

  return aliases;
}

function inferFieldValue(fieldName, context) {
  const { defaultValue, handlerKey } = context;

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  if (fieldName.startsWith("id_")) return 1;
  if (fieldName === "id") return 1;
  if (fieldName === "page") return 1;
  if (fieldName === "limit") return 10;
  if (fieldName === "email") return "admin@email.com";
  if (fieldName === "senha") return "123456";
  if (fieldName === "cpf") return "123.456.789-00";
  if (fieldName === "cep") return "01001-000";
  if (fieldName === "logradouro") return "Rua Exemplo";
  if (fieldName === "numero") return "123";
  if (fieldName === "complemento") return "Apto 12";
  if (fieldName === "bairro") return "Centro";
  if (fieldName === "cidade") return "Sao Paulo";
  if (fieldName === "estado") return "SP";
  if (fieldName === "pais") return "Brasil";
  if (fieldName === "nome") return "Exemplo";
  if (fieldName === "descricao") return "Descricao de exemplo";
  if (fieldName === "comentario") return "Comentario de exemplo";
  if (fieldName === "titulo") return "Titulo de exemplo";
  if (fieldName === "valor") return "11999999999";
  if (fieldName === "nota") return 8.5;
  if (fieldName === "status") return "aguardando_pagamento";
  if (fieldName === "ativo") return true;
  if (fieldName === "principal") return false;
  if (fieldName === "quantidade") return 1;
  if (fieldName === "preco_base") return 79.9;
  if (fieldName === "preco_custo") return 39.9;
  if (fieldName === "preco_unitario") return 79.9;
  if (fieldName === "valor_total") return 149.9;
  if (fieldName === "valor_frete") return 19.9;
  if (fieldName === "acrescimo") return 0;
  if (fieldName === "codigo_rgb" || fieldName === "tonalidade") return "rgb(255,0,0)";
  if (fieldName === "caminho_url" || fieldName === "caminhoUrl") {
    return "https://exemplo.com/imagem.png";
  }
  if (fieldName === "q" || fieldName === "search" || fieldName === "busca") return "camiseta";
  if (fieldName === "error") return "";
  if (fieldName === "code") return "COLE_AQUI";
  if (fieldName === "state") return "COLE_AQUI";

  if (fieldName === "tipo") {
    if (handlerKey.startsWith("UsersController.")) return "cliente";
    if (handlerKey.startsWith("UsuarioContatosController.")) return "celular";
    return "cliente";
  }

  return "";
}

function buildObjectFromFields(fields, handlerKey) {
  const template = {};

  for (const field of fields) {
    template[field.name] = inferFieldValue(field.name, {
      defaultValue: field.defaultValue,
      handlerKey,
    });
  }

  return template;
}

function extractHandlerMetadata(handlerExpression, controllerImports) {
  const handlerMatch = handlerExpression?.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/);
  if (!handlerMatch) {
    return null;
  }

  const [, controllerName, methodName] = handlerMatch;
  const controller = controllerImports.get(controllerName);
  if (!controller) {
    return {
      handlerKey: `${controllerName}.${methodName}`,
      methodSource: "",
      bodyFields: [],
      queryFields: [],
    };
  }

  const methodSource = extractMethodSource(controller.source, methodName);
  const bodyFields = extractDestructuredFields(methodSource, extractBodyAliases(methodSource));
  const queryFields = extractDestructuredFields(methodSource, extractQueryAliases(methodSource));

  if (methodSource.includes("parsePagination(req.query)")) {
    if (!queryFields.some((field) => field.name === "page")) {
      queryFields.push({ name: "page", defaultValue: 1 });
    }
    if (!queryFields.some((field) => field.name === "limit")) {
      queryFields.push({ name: "limit", defaultValue: 10 });
    }
  }

  if (
    methodSource.includes("parseSearchTerms(req.query)")
    || methodSource.includes("buildCatalogFilters(req.query)")
  ) {
    if (!queryFields.some((field) => field.name === "q")) {
      queryFields.push({ name: "q", defaultValue: "camiseta" });
    }
  }

  return {
    handlerKey: `${controllerName}.${methodName}`,
    methodSource,
    bodyFields,
    queryFields,
  };
}

function extractRoutes(source, controllerImports) {
  const routeRegex = /router\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2\s*,\s*([\s\S]*?)\);/g;
  const routes = [];
  let match;

  while ((match = routeRegex.exec(source)) !== null) {
    const [, method, , routePath, handlersExpression] = match;
    const handlers = splitTopLevelArguments(handlersExpression);
    const handler = handlers.pop();
    const metadata = extractHandlerMetadata(handler, controllerImports);

    routes.push({
      method: method.toUpperCase(),
      path: routePath,
      middlewares: handlers,
      handler,
      metadata,
    });
  }

  return routes;
}

function summarizeBodyKeys(route, body) {
  if (!body) {
    return [];
  }

  if (body.mode === "formdata") {
    return body.formdata
      .filter((field) => field.type !== "file")
      .map((field) => field.key);
  }

  if (body.mode === "raw") {
    try {
      const parsed = JSON.parse(body.raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.keys(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function buildDescription(route, queryParams, body) {
  const notes = [];

  if (route.middlewares.some((middleware) => middleware.includes("authenticateToken"))) {
    notes.push("Requer Authorization: Bearer {{token}}.");
  }

  const authorizeRoles = route.middlewares.find((middleware) => middleware.includes("authorizeRoles"));
  if (authorizeRoles) {
    notes.push(`Restrita por perfil: ${authorizeRoles}.`);
  }

  const authorizeSelfOrAdmin = route.middlewares.find((middleware) =>
    middleware.includes("authorizeSelfOrAdmin"),
  );
  if (authorizeSelfOrAdmin) {
    notes.push(`Acesso ao proprio usuario ou administrador: ${authorizeSelfOrAdmin}.`);
  }

  if (route.middlewares.some((middleware) => middleware.includes("uploadAny"))) {
    notes.push("Usa multipart/form-data para upload de arquivos.");
  }

  if (queryParams.length) {
    notes.push(`Query sugerida: ${queryParams.map((field) => field.key).join(", ")}.`);
  }

  const bodyKeys = summarizeBodyKeys(route, body);
  if (bodyKeys.length) {
    notes.push(`Body sugerido: ${bodyKeys.join(", ")}.`);
  }

  if (route.handler) {
    notes.push(`Handler atual: ${route.handler}.`);
  }

  return notes.join("\n");
}

function buildQueryParams(route) {
  const override = ROUTE_OVERRIDES[route.metadata?.handlerKey];
  if (override?.query) {
    return override.query;
  }

  if (!route.metadata?.queryFields.length) {
    return [];
  }

  return route.metadata.queryFields.map((field) => ({
    key: field.name,
    value: String(
      inferFieldValue(field.name, {
        defaultValue: field.defaultValue,
        handlerKey: route.metadata.handlerKey,
      }),
    ),
  }));
}

function buildJsonBody(route) {
  const override = ROUTE_OVERRIDES[route.metadata?.handlerKey];
  if (override?.body) {
    return override.body;
  }

  if (!route.metadata?.bodyFields.length) {
    return undefined;
  }

  return buildObjectFromFields(route.metadata.bodyFields, route.metadata.handlerKey);
}

function buildFormData(route) {
  const override = ROUTE_OVERRIDES[route.metadata?.handlerKey];
  if (override?.formdata) {
    return override.formdata;
  }

  const fields = route.metadata?.bodyFields ?? [];
  const formdata = fields.map((field) => ({
    key: field.name,
    type: "text",
    value: String(
      inferFieldValue(field.name, {
        defaultValue: field.defaultValue,
        handlerKey: route.metadata?.handlerKey ?? "",
      }),
    ),
  }));

  formdata.push({
    key: "file",
    type: "file",
    src: "",
  });

  return formdata;
}

function buildBody(route) {
  const usesUpload = route.middlewares.some((middleware) => middleware.includes("uploadAny"));

  if (usesUpload) {
    return {
      mode: "formdata",
      formdata: buildFormData(route),
    };
  }

  if (!["POST", "PUT", "PATCH"].includes(route.method)) {
    return undefined;
  }

  const jsonBody = buildJsonBody(route);
  if (!jsonBody) {
    return undefined;
  }

  return {
    mode: "raw",
    raw: JSON.stringify(jsonBody, null, 2),
    options: {
      raw: {
        language: "json",
      },
    },
  };
}

function buildUrl(route, queryParams) {
  const basePath = route.path.replace(/:([A-Za-z0-9_]+)/g, "{{$1}}");
  if (!queryParams.length) {
    return `{{baseUrl}}${basePath}`;
  }

  const queryString = queryParams
    .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
    .join("&");

  return `{{baseUrl}}${basePath}?${queryString}`;
}

function buildRequest(route) {
  const queryParams = buildQueryParams(route);
  const url = buildUrl(route, queryParams);
  const body = buildBody(route);
  const requiresAuth = route.middlewares.some((middleware) => middleware.includes("authenticateToken"));
  const usesJsonBody = ["POST", "PUT", "PATCH"].includes(route.method)
    && !route.middlewares.some((middleware) => middleware.includes("uploadAny"));

  const request = {
    method: route.method,
    header: usesJsonBody
      ? [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ]
      : [],
    description: buildDescription(route, queryParams, body),
    url,
  };

  if (requiresAuth) {
    request.auth = {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{token}}",
          type: "string",
        },
      ],
    };
  }

  if (body) {
    request.body = body;
  }

  return request;
}

function buildEvents(route) {
  if (route.path !== "/auth/login" || route.method !== "POST") {
    return undefined;
  }

  return [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "const data = pm.response.json();",
          "if (data?.token) pm.collectionVariables.set('token', data.token);",
          "const userId = data?.user?.id_usuario ?? data?.user?.id;",
          "if (userId) pm.collectionVariables.set('id', String(userId));",
        ],
      },
    },
  ];
}

function buildCollection(routes) {
  const folders = new Map();
  const pathVariables = new Set();

  for (const route of routes) {
    const folderKey = route.path.split("/").filter(Boolean)[0] || "root";
    const folderName = titleCase(folderKey);

    if (!folders.has(folderName)) {
      folders.set(folderName, []);
    }

    const item = {
      name: `${route.method} ${route.path}`,
      request: buildRequest(route),
    };

    const events = buildEvents(route);
    if (events) {
      item.event = events;
    }

    folders.get(folderName).push(item);

    for (const match of route.path.matchAll(/:([A-Za-z0-9_]+)/g)) {
      pathVariables.add(match[1]);
    }
  }

  return {
    info: {
      name: "Agnus Back",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: "Collection gerada automaticamente a partir das rotas declaradas em src/app.ts.",
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:3000",
      },
      {
        key: "token",
        value: "",
      },
      ...Array.from(pathVariables)
        .sort()
        .map((variableName) => ({
          key: variableName,
          value: "1",
        })),
    ],
    item: Array.from(folders.entries()).map(([folderName, items]) => ({
      name: folderName,
      item: items,
    })),
  };
}

const controllerImports = parseControllerImports(appSource);
const routes = extractRoutes(appSource, controllerImports);
const collection = buildCollection(routes);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFilePath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");

console.log(`Collection gerada em ${path.relative(projectRoot, outputFilePath)} com ${routes.length} rotas.`);
