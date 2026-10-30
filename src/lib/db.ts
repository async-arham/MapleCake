import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { buildPoolConfig } from "./pool-config";

const globalForDb = globalThis as unknown as { __sbPrisma?: PrismaClient };

function client(): PrismaClient {
  if (!globalForDb.__sbPrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");

    const pool = new Pool(buildPoolConfig(url, Boolean(process.env.VERCEL)));
    // If the database drops an idle connection, log it and let the pool replace it
    // (without this listener the error can take the whole server down).
    pool.on("error", (error) => console.error("Database connection dropped, it will be replaced:", error.message));

    globalForDb.__sbPrisma = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForDb.__sbPrisma;
}

// Created on first use, so builds and tooling do not need a live database.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = client();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
