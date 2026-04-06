/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.{ts,js}"],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
};
