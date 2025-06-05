// src/utils/mongoDB.js

import { MongoClient } from "mongodb";

// 缓存客户端和 db 对象，避免多次重复连接
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  // 如果已经连过，就直接返回之前缓存的 client/db
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // 确保 .env 里有 MONGODB_URI
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  // 新建 MongoClient，连接到数据库
  const client = new MongoClient(process.env.MONGODB_URI, {
    // （可选）这里可以加一些参数，例如 useNewUrlParser, useUnifiedTopology 等
  });
  await client.connect();

  // 这里的 "cody_admin" 要对应你在 Atlas 上创建的数据库名
  const db = client.db("cody_admin");

  // 缓存一下，下次直接复用
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
