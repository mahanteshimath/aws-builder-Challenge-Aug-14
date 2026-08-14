import React, { useEffect, useState } from "react";
import Postcard from "./Postcard.jsx";

const API = import.meta.env.VITE_FUNCTION_URL ?? "";
const idFromHash = () => (location.hash.match(/^#\/p\/([\w-]+)$/) ?? [])[1];

const EXAMPLES = [
  "I was late for a train made of paper, and the conductor kept apologising for the rain",
  "I kept trying to post a letter into a lighthouse, but the slot was full of moths",
  "I was alone in a drowned city at night, walking on rooftops, every window still lit",
  "I flew a kite over my old school at dawn and the whole sky turned saffron, white and green",
  "My grandmother's kitchen had a door I had never noticed, and behind it was the sea",
];

export default function App() {
  const [dreamText, setDreamText] = useState("");
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A permalink is just the hash — no router needed.
  useEffect(() => {
    const load = async () => {
      const id = idFromHash();
      if (!id) return;
      setBusy(true);
      try {
        const res = await fetch(`${API}/p/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCard(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };
    load();
    addEventListener("hashchange", load);
    return () => removeEventListener("hashchange", load);
  }, []);

  async function mail(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/dream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dreamText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCard(data);
      history.replaceState(null, "", `#/p/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Dream Postcards</h1>
        <p>Every dream is somewhere. Tell us where you went, and we will mail it home.</p>
      </header>

      <form onSubmit={mail}>
        <label htmlFor="dream">
          Describe a dream in a sentence or two — the stranger the better.
        </label>
        <textarea
          id="dream"
          value={dreamText}
          onChange={(e) => setDreamText(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="I was late for a train made of paper..."
          required
        />
        <div className="row">
          <span className="count">{dreamText.length}/500</span>
          <button type="submit" disabled={busy || !dreamText.trim()}>
            {busy ? "At the post office..." : "Mail it home"}
          </button>
        </div>

        <p className="try">No dream handy? Borrow one:</p>
        <div className="examples">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => setDreamText(example)}
            >
              {example.length > 46 ? `${example.slice(0, 46)}\u2026` : example}
            </button>
          ))}
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {card && <Postcard key={card.id} card={card} />}
    </main>
  );
}
