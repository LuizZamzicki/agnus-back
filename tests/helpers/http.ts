import { Request, Response } from "express";

type MockPrimitive = string | number | boolean | null | undefined | Date | Buffer;
type MockValue = MockPrimitive | MockRecord | MockValue[];
type MockRecord = { [key: string]: MockValue };
type MockRequestShape = { params: Record<string, string>; query: MockRecord; body: MockRecord; headers: Record<string, string> };
type MockResponseLocals = Record<string, MockValue>;
type TestResponse = Response<object, MockResponseLocals> & { status: jest.Mock; json: jest.Mock; send: jest.Mock; redirect: jest.Mock };
type MockedModel<T extends MockRecord> = T & { update: jest.Mock<Promise<MockedModel<T>>, [Partial<T>]>; destroy: jest.Mock<Promise<void>, []>; get: jest.Mock<MockValue | undefined, [string]>; toJSON: jest.Mock<T, []> };

export const mockRequest = (overrides: Partial<MockRequestShape> = {}) => ({ params: {}, query: {}, body: {}, headers: {}, ...overrides }) as Request;

export const mockResponse = () => {
  const response = { locals: {}, status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis(), redirect: jest.fn().mockReturnThis() };
  return response as TestResponse;
};

export const buildModelInstance = <T extends MockRecord>(data: T = {} as T) => {
  const state: T = { ...data }, instance = { ...state } as MockedModel<T>;
  instance.update = jest.fn(async (patch: Partial<T>) => { Object.assign(state, patch); Object.assign(instance, patch); return instance; });
  instance.destroy = jest.fn(async () => undefined);
  instance.get = jest.fn((key: string) => state[key as keyof T]);
  instance.toJSON = jest.fn(() => ({ ...state }));
  return instance;
};
