/* trunk-ignore-all(prettier) */

import { useState, useEffect, useRef } from "react";
import "./App.css";


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


  const transliterationTimer = useRef(null);
  const transliterationRequest = useRef(0);

  const complaintRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartRef = useRef(null);
  const speechFinalRef = useRef("");

  async function handleComplaintKeyDown(event) {
    if (event.key !== " ") return;

    const textarea = event.currentTarget;
    const cursor = textarea.selectionStart;

    const beforeCursor = text.slice(0, cursor);
    const afterCursor = text.slice(cursor);

    // Find the last word typed before the cursor.
    const match = beforeCursor.match(/([A-Za-z]+)$/);

    if (!match) return;

    event.preventDefault();

    const word = match[1];
    const wordStart = cursor - word.length;

    try {
      const response = await fetch("/api/transliterate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: word,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Transliteration failed");
      }

      const data = await response.json();

      const convertedText =
        beforeCursor.slice(0, wordStart) +
        data.transliterated +
        " " +
        afterCursor;

      setText(convertedText);

      requestAnimationFrame(() => {
        if (complaintRef.current) {
          const newCursor = wordStart + data.transliterated.length + 1;
          complaintRef.current.focus();
          complaintRef.current.setSelectionRange(
            newCursor,
            newCursor
          );
        }
      });
    } catch (error) {
      console.error("Transliteration error:", error);

      // If the API fails, preserve the user's typed space.
      setText(beforeCursor + " " + afterCursor);
    }
  }

  function handleComplaintChange(event) {
    const value = event.target.value;

    setText(value);

    // Cancel the previous pending transliteration.
    clearTimeout(transliterationTimer.current);

    // Ignore empty input and words already in Devanagari.
    const match = value.match(/(^|\s)([A-Za-z]+)(\s*)$/);

    if (!match) return;

    const word = match[2];
    const prefix = match[1];
    const trailingSpace = match[3];

    const requestId = ++transliterationRequest.current;

    transliterationTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/transliterate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: word,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error("Transliteration failed");
        }

        const data = await response.json();

        // Ignore outdated responses.
        if (requestId !== transliterationRequest.current) {
          return;
        }

        // Don't overwrite newer text typed by the user.
        setText((currentText) => {
          if (currentText !== value) {
            return currentText;
          }

          return (
            value.slice(0, value.length - match[0].length) +
            prefix +
            data.transliterated +
            trailingSpace
          );
        });
      } catch (error) {
        console.error("Transliteration error:", error);
      }
    }, 700);
  }



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


  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startRecording() {
    try {
      setError("");
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
      speechFinalRef.current = "";

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Audio recording is not supported in this browser or connection."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();

      setIsRecording(true);
      recordingStartRef.current = Date.now();

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(
          Math.floor(
            (Date.now() - recordingStartRef.current) / 1000
          )
        );
      }, 1000);

      // Speech recognition is optional.
      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();

        recognition.lang =
          language === "hindi" ? "hi-IN" : "mr-IN";

        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let interim = "";

          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              speechFinalRef.current += transcript + " ";
            } else {
              interim += transcript;
            }
          }

          setText(
            (speechFinalRef.current + interim).trimStart()
          );
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition:", event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();

        setSpeechSupported(true);
      } else {
        setSpeechSupported(false);
      }
    } catch (err) {
      setError(
        err.message || "Could not start audio recording."
      );

      streamRef.current?.getTracks().forEach((track) =>
        track.stop()
      );

      streamRef.current = null;
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    stopRecordingTimer();
    setIsRecording(false);
  }

  function clearRecording() {
    if (isRecording) {
      stopRecording();
    }

    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
    speechFinalRef.current = "";
  }



  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess(null);

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("text", text);
      formData.append("language", language);
      formData.append("location_raw", location);
      formData.append("landmark", landmark);
      formData.append(
        "source",
        audioBlob ? "web-voice" : "web-text"
      );

      if (audioBlob) {
        formData.append("audio", audioBlob, "complaint.webm");
      }

      const response = await fetch("/api/submit-complaint", {
        method: "POST",
        body: formData,
      });

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
      clearRecording();
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
          ref={complaintRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleComplaintKeyDown}
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


        <div className="recording-controls">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={loading}
              className="mic-button"
              aria-label="Record complaint"
              title="Record complaint"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
            >
              Stop recording
            </button>
          )}

          {isRecording && (
            <p>
              Recording: {Math.floor(recordingTime / 60)}:
              {String(recordingTime % 60).padStart(2, "0")}
            </p>
          )}

          {audioBlob && (
            <div>
              <p>Recording ready</p>

              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
              />

              <button
                type="button"
                onClick={clearRecording}
              >
                Remove recording
              </button>
            </div>
          )}

          {!speechSupported && !isRecording && (
            <p>
              Speech recognition may not be supported in this
              browser. You can still record and submit audio.
            </p>
          )}
        </div>


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