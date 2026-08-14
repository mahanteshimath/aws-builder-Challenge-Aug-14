import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { ARCHETYPES, PALETTES } from "./poster.mjs";

const bedrock = new BedrockRuntimeClient({ region: "us-west-2" });
const TEXT_MODEL = "amazon.nova-lite-v1:0";

const SYSTEM = `You are the archivist of the Postal Service of the Subconscious.
Given a dream, invent the postcard that dream would have mailed home.
Respond with a single JSON object and nothing else, with exactly these keys:
  destination - an invented place name in the voice of a mid-century travel poster,
                UPPER CASE, 2 to 5 words, no "GREETINGS FROM" prefix
  note        - 30 to 60 words in first person, warm and slightly unsettling, as if
                handwritten in a hurry. It ends mid-thought.
  postmark    - an impossible place and date, under 8 words
  stamp       - a caption for the stamp illustration, under 6 words
  archetype   - the landscape that best fits the dream, one of: ${ARCHETYPES.join(", ")}
  palette     - the mood of the light, one of: ${Object.keys(PALETTES).join(", ")}
  sunY        - number 0 to 1, how high the sun sits (0 setting, 1 overhead)
  birds       - integer 0 to 6, how busy the sky feels`;

const REQUIRED_TEXT = ["destination", "note", "postmark", "stamp"];

/** Nova Lite pads JSON with prose, so slice to the outermost braces before parsing. */
export function parseJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

export function toPostcard(raw) {
  for (const key of REQUIRED_TEXT) {
    if (typeof raw[key] !== "string" || !raw[key].trim()) {
      throw new Error(`model omitted "${key}"`);
    }
  }
  // Scene fields are art direction, not prose. normalizeScene clamps them at render time, so a bad
  // value degrades into a still-good poster instead of failing the request.
  return {
    destination: raw.destination.trim(),
    note: raw.note.trim(),
    postmark: raw.postmark.trim(),
    stamp: raw.stamp.trim(),
    scene: { archetype: raw.archetype, palette: raw.palette, sunY: raw.sunY, birds: raw.birds },
  };
}

export async function writePostcard(dreamText) {
  const res = await bedrock.send(
    new ConverseCommand({
      modelId: TEXT_MODEL,
      system: [{ text: SYSTEM }],
      messages: [{ role: "user", content: [{ text: `The dream: ${dreamText}` }] }],
      inferenceConfig: { maxTokens: 700, temperature: 0.9 },
    }),
  );
  return toPostcard(parseJsonObject(res.output.message.content[0].text));
}
