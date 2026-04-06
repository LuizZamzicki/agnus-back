type AnyRecord = Record<string, any>;

export const mockRequest = (overrides: AnyRecord = {}) =>
  ({
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  }) as any;

export const mockResponse = () => {
  const res: AnyRecord = {
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res as any;
};

export const buildModelInstance = (data: AnyRecord = {}) => {
  const state: AnyRecord = { ...data };
  const instance: AnyRecord = {
    ...state,
    update: jest.fn(async (patch: AnyRecord) => {
      Object.assign(state, patch);
      Object.assign(instance, patch);
      return instance;
    }),
    destroy: jest.fn(async () => undefined),
    get: jest.fn((key: string) => state[key]),
    toJSON: jest.fn(() => ({ ...state })),
  };
  return instance;
};
