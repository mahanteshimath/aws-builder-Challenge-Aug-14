import React, { useState } from "react";

export default function Postcard({ card }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="stage">
      <button
        className={`card ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show the front of the postcard" : "Show the back of the postcard"}
      >
        <div className="face front">
          {/* The SVG is built by our own renderer from a clamped vocabulary, never from model
              markup — see backend/poster.mjs and its tests. */}
          <div className="art" dangerouslySetInnerHTML={{ __html: card.poster }} />
          <span className="banner">Greetings from {card.destination}</span>
        </div>

        <div className="face back">
          <div className="left">
            <p className="note">{card.note}</p>
          </div>
          <div className="right">
            <div className="stamp">
              <span>{card.stamp}</span>
            </div>
            <div className="postmark">{card.postmark}</div>
            <div className="cancellation">Postal Service of the Subconscious</div>
            <div className="lines" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </button>
      <p className="hint">Click the postcard to turn it over</p>
    </div>
  );
}
