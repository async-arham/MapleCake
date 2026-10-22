import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPoolConfig } from "./pool-config";

const globalForDb = globalThis as unknown as { __sbPrisma?: PrismaClient };

function client(): PrismaClient {
  if (!globalForDb.__sbPrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    globalForDb.__sbPrisma = new PrismaClient({
      adapter: new PrismaPg(buildPoolConfig(url, Boolean(process.env.VERCEL))),
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
