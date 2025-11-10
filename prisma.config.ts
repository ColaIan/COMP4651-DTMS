import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // url: env("DATABASE_URL"),
    url: process.env.AZURE_SQL_DATABASE_URL!,
  },
});
