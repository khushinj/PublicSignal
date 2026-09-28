
import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "";

function App() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [location, setLocation] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (location.trim().length < 3) {
      setLocationSuggestions([]);
      setSelectedLocation(null);
      return;
    }

    // Don't search again if the user has selected a suggestion.
    if (selectedLocation?.display_name === location) {
      setLocationSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLocationLoading(true);

        const response = await fetch(
          `/api/location-suggestions?q=${encodeURIComponent(location)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load location suggestions");
        }

        const data = await response.json();

        setLocationSuggestions(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Location suggestions error:", error);
        }
      } finally {
        setLocationLoading(false);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, selectedLocation]);



  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess(null);

    setLoading(true);

    try {
      const response = await fetch(
        "/api/submit-complaint",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            language,
            location_raw: location,
            landmark: landmark,
            source: "web-text",
          }),
        }
      );

      const responseText = await response.text();

      console.log("Status:", response.status);
      console.log("Response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Backend returned status ${response.status}: ${responseText}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to submit complaint."
        );
      }

      setSuccess(data.complaint);
      setText("");
      setLocation("");
      setLandmark("");
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header>
        <h1>PublicSignal</h1>
        <p>
          Your voice. Your community. Better public
          infrastructure.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="language">
          Select your language
        </label>

        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className=''
        >
          <option value="hindi">हिन्दी</option>
          <option value="marathi">मराठी</option>
        </select>

        <label htmlFor="location">
          Village, ward or area
        </label>

        <div className="location-autocomplete">
          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setSelectedLocation(null);
            }}
            placeholder="Start typing your area, street, or landmark..."
            required
            autoComplete="off"
          />

          {locationLoading && (
            <p className="location-hint">
              Searching locations...
            </p>
          )}

          {locationSuggestions.length > 0 && (
            <div className="location-suggestions">
              {locationSuggestions.map((place, index) => (
                <button
                  type="button"
                  key={`${place.latitude}-${place.longitude}-${index}`}
                  className="location-suggestion"
                  onClick={() => {
                    setLocation(place.display_name);
                    setSelectedLocation(place);
                    setLocationSuggestions([]);
                  }}
                >
                  {place.display_name}
                </button>
              ))}
            </div>
          )}

          {location.length >= 3 &&
            !locationLoading &&
            locationSuggestions.length === 0 &&
            !selectedLocation && (
              <p className="location-hint">
                Select a location from the suggestions when available.
              </p>
            )}

          {selectedLocation && (
            <p className="location-success">
              Location selected and verified.
            </p>
          )}
        </div>


        <label htmlFor="landmark">
          Nearby landmark
        </label>

        <input
          id="landmark"
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g. Near railway station, school or temple"
          required
          minLength={2}
          maxLength={200}
        />

        <label htmlFor="complaint">
          Describe the infrastructure problem
        </label>

        <textarea
          id="complaint"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            language === "hindi"
              ? "अपने क्षेत्र की समस्या बताएं..."
              : "तुमच्या परिसरातील समस्या सांगा..."
          }
          required
          minLength={5}
          maxLength={2000}
          rows={6}
        />

        <button type="submit" disabled={loading}>
          {loading
            ? "Submitting..."
            : "Submit complaint"}
        </button>
      </form>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success" role="status">
          <h2>Complaint submitted</h2>
          <p>Your complaint ID:</p>
          <strong>{success.id}</strong>
          <p>Status: {success.status}</p>
          <p>
            Your complaint has been received for
            processing.
          </p>
        </div>
      )}
    </main>
  );
}

export default App;