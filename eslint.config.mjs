import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });
const eslintConfig = [
  { ignores: [".next/**", ".next-dev/**", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
