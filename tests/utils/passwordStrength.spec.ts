import { evaluatePasswordStrength } from "../../src/utils/passwordStrength";

describe("evaluatePasswordStrength", () => {
  it("classifica senhas fracas e fortes de forma deterministica", () => {
    expect(evaluatePasswordStrength("123")).toMatchObject({
      score: 1,
      label: "muito_fraca",
      percentage: 17,
      isValid: false,
    });

    expect(evaluatePasswordStrength("Abc123!@#xyz")).toMatchObject({
      score: 6,
      label: "muito_forte",
      percentage: 100,
      isValid: true,
    });
  });
});
