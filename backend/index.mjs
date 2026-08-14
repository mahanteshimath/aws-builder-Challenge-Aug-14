import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { writePostcard } from "./postcard.mjs";
import { renderPoster } from "./poster.mjs";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-2" }));

const TABLE = process.env.TABLE_NAME;
const DAILY_CAP = Number(process.env.DAILY_CARD_CAP ?? 500);
const TTL_DAYS = 30;
const MAX_DREAM_CHARS = 500;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Routes and validates. Exported so the checks can exercise it without touching AWS. */
export function parseRequest(event) {
  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const path = (event.rawPath ?? event.path ?? "/").replace(/\/+$/, "") || "/";

  if (method === "POST" && path === "/dream") {
    let body;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      throw new HttpError(400, "Body must be JSON.");
    }
    const dreamText = typeof body.dreamText === "string" ? body.dreamText.trim() : "";
    if (!dreamText) throw new HttpError(400, "Tell us the dream first.");
    if (dreamText.length > MAX_DREAM_CHARS) {
      throw new HttpError(400, `Dreams are limited to ${MAX_DREAM_CHARS} characters.`);
    }
    return { route: "create", dreamText };
  }

  const permalink = path.match(/^\/p\/([\w-]{1,64})$/);
  if (method === "GET" && permalink) return { route: "read", id: permalink[1] };

  throw new HttpError(404, "No such route.");
}

/** Atomic per-day counter, claimed before any model call so a spent budget costs nothing. */
export async function claimBudget(today, cap = DAILY_CAP, client = db) {
  try {
    await client.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: `cap#${today}` },
        UpdateExpression: "ADD #n :one SET expiresAt = :ttl",
        ConditionExpression: "attribute_not_exists(#n) OR #n < :cap",
        ExpressionAttributeNames: { "#n": "count" },
        ExpressionAttributeValues: {
          ":one": 1,
          ":cap": cap,
          ":ttl": Math.floor(Date.now() / 1000) + 2 * 86400,
        },
      }),
    );
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      throw new HttpError(429, "The post office is closed for today. Come back tomorrow.");
    }
    throw err;
  }
}

async function create(dreamText) {
  await claimBudget(new Date().toISOString().slice(0, 10));

  const card = await writePostcard(dreamText);
  const id = randomUUID();

  const item = {
    id,
    destination: card.destination,
    note: card.note,
    postmark: card.postmark,
    stamp: card.stamp,
    poster: renderPoster(card.scene, id),
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
  };
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function read(id) {
  const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  if (!Item?.poster) throw new HttpError(404, "That postcard was never delivered.");
  return Item;
}

const json = (status, payload) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

export async function handler(event) {
  try {
    const req = parseRequest(event);
    return json(200, req.route === "create" ? await create(req.dreamText) : await read(req.id));
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: "The mail was lost in transit. Try again." });
  }
}
