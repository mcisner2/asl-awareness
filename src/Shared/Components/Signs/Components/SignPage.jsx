// SignPage.jsx
// Page component: shows the sign images with search, sort, and caption controls.
import { useEffect, useState } from "react";

// import two functions to convert letter to letter in ASCII and
  // convert rgba bytes into a pixelated image
import { labelToLetter } from "../Services/getData.jsx";
import { SignImage } from "./SignImage.jsx";
// NEW: "mark as learned" support (loading and saving live in the Progress folder)
import { useLearned, signIdForLetter } from "../../Progress/useLearned.jsx";
import { LearnedToggle } from "../../Progress/LearnedToggle.jsx";

// construct page here with title and signs
export function SignPage({ title = "ASL Directory", signs = [] }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  // searchLetter: text the user types to filter signs by letter
  // sortOrder: "ascending" (A-Z) or "descending" (Z-A)
  // showCaptions: whether letter captions are shown under each image
  const [searchLetter, setSearchLetter] = useState("");
  const [sortOrder, setSortOrder] = useState("ascending");
  const [showCaptions, setShowCaptions] = useState(true);

  // NEW: which signs this user has learned (does nothing when logged out)
  const { loggedIn, learned, toggle, error } = useLearned();

  // Filter the signs down to the ones matching the typed text.
  // Case-insensitive, since .toLowerCase() is used.
  const filteredSigns = signs.filter((sign) => {
    const letter = labelToLetter(sign.label);
    return letter.toLowerCase().startsWith(searchLetter.toLowerCase());
  });

  // Sort the filtered signs ascending or descending based on the dropdown.
  const sortedSigns = filteredSigns.slice().sort((a, b) => {
    const letterA = labelToLetter(a.label);
    const letterB = labelToLetter(b.label);
    return sortOrder === "ascending"
      ? letterA.localeCompare(letterB)
      : letterB.localeCompare(letterA);
  });

  // Map over the sorted signs to render one SignImage per sign
  return (
    <header>
      <h1>{title}</h1>
      <p>Note: ASL signs including motion are not included in this set</p>

      <form
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          marginBottom: "16px",
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <label>
          Search letter:
          <input
            type="text"
            placeholder="e.g. A"
            maxLength={1}
            value={searchLetter}
            onChange={(e) => setSearchLetter(e.target.value)}
          />
        </label>

        <label>
          Sort order:
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="ascending">A - Z</option>
            <option value="descending">Z - A</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={showCaptions}
            onChange={(e) => setShowCaptions(e.target.checked)}
          />
          Show letter captions
        </label>
      </form>

      {/* NEW: shows a message if loading or saving progress fails */}
      {error && <p role="alert">{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {sortedSigns.map((sign) => {
          const letter = labelToLetter(sign.label);
          const signId = signIdForLetter(letter);
          return (
            // NEW: each sign sits in a small column so its button goes under it
            <div
              key={sign.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <SignImage
                pixels={sign.pixels}
                letter={letter}
                showCaption={showCaptions}
              />
              {/* NEW: only logged-in users see the button */}
              {loggedIn && (
                <LearnedToggle
                  signId={signId}
                  learned={learned.has(signId)}
                  onToggle={toggle}
                />
              )}
            </div>
          );
        })}
      </div>
    </header>
  );
}