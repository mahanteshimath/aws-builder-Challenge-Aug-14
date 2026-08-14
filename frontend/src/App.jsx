import React, { useEffect, useState } from "react";
import Postcard from "./Postcard.jsx";

const API = import.meta.env.VITE_FUNCTION_URL ?? "";
const idFromHash = () => (location.hash.match(/^#\/p\/([\w-]+)$/) ?? [])[1];

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
        <textarea
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
      </form>

      {error && <p className="error">{error}</p>}
      {card && <Postcard key={card.id} card={card} />}
    </main>
  );
}
