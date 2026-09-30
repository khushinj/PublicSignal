/* trunk-ignore-all(prettier) */

import { useState, useEffect, useRef } from "react";
import "./App.css";
const translations = {
  hindi: {
    locationLabel: "गाँव, वार्ड या क्षेत्र",
    locationPlaceholder: "अपना क्षेत्र, सड़क या स्थान लिखें...",
    searchingLocations: "स्थान खोज रहे हैं...",
    locationHint: "उपलब्ध होने पर सुझावों में से स्थान चुनें।",
    locationSelected: "स्थान चुना और सत्यापित किया गया।",

    landmarkLabel: "नज़दीकी पहचान",
    landmarkPlaceholder: "जैसे रेलवे स्टेशन, स्कूल या मंदिर के पास",

    category: "समस्या की श्रेणी",
    categoryPlaceholder: "समस्या की श्रेणी चुनें",
    categories: {
      roads: "सड़क और गड्ढे",
      water: "पानी की समस्या",
      drainage: "नाली और जलभराव",
      waste: "कचरा और स्वच्छता",
      streetlights: "स्ट्रीट लाइट",
      transport: "सार्वजनिक परिवहन",
      electricity: "बिजली",
      publicBuildings: "सार्वजनिक इमारतें",
      environment: "पर्यावरण",
      other: "अन्य",
    },

    complaintLabel: "सार्वजनिक समस्या का विवरण",
    complaintPlaceholder: "अपने क्षेत्र की समस्या बताएं...",

    recordComplaint: "शिकायत रिकॉर्ड करें",
    stopRecording: "रिकॉर्डिंग रोकें",
    recording: "रिकॉर्डिंग",
    recordingReady: "रिकॉर्डिंग तैयार है",
    removeRecording: "रिकॉर्डिंग हटाएं",

    speechUnsupported:
      "इस ब्राउज़र में आवाज़ पहचान सुविधा उपलब्ध नहीं हो सकती। आप फिर भी ऑडियो रिकॉर्ड करके भेज सकते हैं।",

    submitting: "शिकायत दर्ज हो रही है...",
    submitComplaint: "शिकायत दर्ज करें",

    complaintSubmitted: "शिकायत दर्ज हो गई",
    complaintId: "आपकी शिकायत संख्या:",
    status: "स्थिति:",
    received:
      "आपकी शिकायत प्रक्रिया के लिए प्राप्त हो गई है।",
  },

  marathi: {
    locationLabel: "गाव, वॉर्ड किंवा परिसर",
    locationPlaceholder: "तुमचा परिसर, रस्ता किंवा ठिकाण लिहा...",
    searchingLocations: "ठिकाण शोधत आहोत...",
    locationHint: "उपलब्ध असल्यास सूचनांमधून ठिकाण निवडा.",
    locationSelected: "ठिकाण निवडले आणि सत्यापित केले आहे.",

    landmarkLabel: "जवळची खूण",
    landmarkPlaceholder: "उदा. रेल्वे स्टेशन, शाळा किंवा मंदिराजवळ",

    category: "समस्येची श्रेणी",
    categoryPlaceholder: "समस्येची श्रेणी निवडा",
    categories: {
      roads: "रस्ते आणि खड्डे",
      water: "पाणी समस्या",
      drainage: "नाले आणि पाणी साचणे",
      waste: "कचरा आणि स्वच्छता",
      streetlights: "स्ट्रीट लाईट",
      transport: "सार्वजनिक वाहतूक",
      electricity: "वीज",
      publicBuildings: "सार्वजनिक इमारती",
      environment: "पर्यावरण",
      other: "इतर",
    },

    complaintLabel: "सार्वजनिक समस्येचे वर्णन",
    complaintPlaceholder: "तुमच्या परिसरातील समस्या सांगा...",

    recordComplaint: "तक्रार रेकॉर्ड करा",
    stopRecording: "रेकॉर्डिंग थांबवा",
    recording: "रेकॉर्डिंग",
    recordingReady: "रेकॉर्डिंग तयार आहे",
    removeRecording: "रेकॉर्डिंग हटवा",

    speechUnsupported:
      "या ब्राउझरमध्ये आवाज ओळखण्याची सुविधा उपलब्ध नसू शकते. तरीही तुम्ही ऑडिओ रेकॉर्ड करून पाठवू शकता.",

    submitting: "तक्रार नोंदवत आहोत...",
    submitComplaint: "तक्रार नोंदवा",

    complaintSubmitted: "तक्रार नोंदवली गेली",
    complaintId: "तुमचा तक्रार क्रमांक:",
    status: "स्थिती:",
    received:
      "तुमची तक्रार प्रक्रियेसाठी प्राप्त झाली आहे.",
  },
};

function App() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [languageSelected, setLanguageSelected] = useState(false);
  const [location, setLocation] = useState("");
  const [landmark, setLandmark] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [category, setCategory] = useState("");
  const t = translations[language];

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


  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location detection is not supported by this browser.");
      return;
    }

    setGpsLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setGpsCoordinates({
          latitude,
          longitude,
        });

        try {
          const response = await fetch(
            `/api/location-reverse?latitude=${latitude}&longitude=${longitude}`
          );

          if (!response.ok) {
            throw new Error("Could not identify your current location.");
          }

          const data = await response.json();

          if (data.display_name) {
            setLocation(data.display_name);

            setSelectedLocation({
              display_name: data.display_name,
              latitude,
              longitude,
            });
          }
        } catch (error) {
          console.error("Reverse location error:", error);

          setError(
            "Your location was detected, but we could not identify the area name. You can select it manually."
          );
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);

        setGpsLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          setError(
            "Location permission was denied. You can select the problem location manually."
          );
        } else {
          setError(
            "Could not detect your location. You can select the problem location manually."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

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
    }, 250);
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
      formData.append("category", category);
      formData.append(
        "source",
        audioBlob ? "web-voice" : "web-text"
      );

      if (gpsCoordinates) {
        formData.append(
          "latitude",
          String(gpsCoordinates.latitude)
        );

        formData.append(
          "longitude",
          String(gpsCoordinates.longitude)
        );
      }

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
      setCategory("");
      setGpsCoordinates(null);
      setSelectedLocation(null);
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

      {!languageSelected ? (
        <section className="language-screen">
          <h2>Choose your language</h2>
          <p>
            अपनी भाषा चुनें / तुमची भाषा निवडा
          </p>

          <div className="language-options">
            <button
              type="button"
              className="language-option"
              onClick={() => {
                setLanguage("hindi");
                setLanguageSelected(true);
              }}
            >
              <span className="language-native">हिन्दी</span>
              <span className="language-english">Hindi</span>
            </button>

            <button
              type="button"
              className="language-option"
              onClick={() => {
                setLanguage("marathi");
                setLanguageSelected(true);
              }}
            >
              <span className="language-native">मराठी</span>
              <span className="language-english">Marathi</span>
            </button>
          </div>
        </section>
      ) : (
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
            {t.locationLabel}
          </label>

          <div className="location-autocomplete">
            <button
              type="button"
              className="detect-location-button"
              onClick={detectCurrentLocation}
              disabled={gpsLoading || loading}
            >
              {gpsLoading
                ? "Detecting location..."
                : "Use my current location"}
            </button>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setSelectedLocation(null);
                setGpsCoordinates(null);
              }}
              placeholder={t.locationPlaceholder}
              required
              autoComplete="off"
            />

            {locationLoading && (
              <p className="location-hint">
                {t.searchingLocations}
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

                      setGpsCoordinates({
                        latitude: Number(place.latitude),
                        longitude: Number(place.longitude),
                      });

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
                  {t.locationHint}
                </p>
              )}

            {selectedLocation && (
              <p className="location-success">
                {t.locationSelected}
              </p>
            )}
          </div>


          <label htmlFor="landmark">
            {t.landmarkLabel}
          </label>

          <input
            id="landmark"
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder={t.landmarkPlaceholder}
            required
            minLength={2}
            maxLength={200}
          />

          <label htmlFor="category">
            {t.category}
          </label>

          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">
              {t.categoryPlaceholder}
            </option>

            <option value="roads">
              {t.categories.roads}
            </option>

            <option value="water">
              {t.categories.water}
            </option>

            <option value="drainage">
              {t.categories.drainage}
            </option>

            <option value="waste">
              {t.categories.waste}
            </option>

            <option value="streetlights">
              {t.categories.streetlights}
            </option>

            <option value="transport">
              {t.categories.transport}
            </option>

            <option value="electricity">
              {t.categories.electricity}
            </option>

            <option value="publicBuildings">
              {t.categories.publicBuildings}
            </option>

            <option value="environment">
              {t.categories.environment}
            </option>

            <option value="other">
              {t.categories.other}
            </option>
          </select>


          <label htmlFor="complaint">
            {t.complaintLabel}
          </label>

          <textarea
            id="complaint"
            ref={complaintRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleComplaintKeyDown}
            placeholder={t.complaintPlaceholder}
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
                aria-label={t.recordComplaint}
                title={t.recordComplaint}
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
                {t.stopRecording}
              </button>
            )}

            {isRecording && (
              <p>
                {t.recording}: {Math.floor(recordingTime / 60)}:
                {String(recordingTime % 60).padStart(2, "0")}
              </p>
            )}

            {audioBlob && (
              <div>
                <p>{t.recordingReady}</p>

                <audio
                  controls
                  src={URL.createObjectURL(audioBlob)}
                />

                <button
                  type="button"
                  onClick={clearRecording}
                >
                  {t.removeRecording}
                </button>
              </div>
            )}

            {!speechSupported && !isRecording && (
              <p>
                {t.speechUnsupported}
              </p>
            )}
          </div>


          <button type="submit" disabled={loading}>
            {loading
              ? t.submitting
              : t.submitComplaint}
          </button>
        </form>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success" role="status">
          <h2>{t.complaintSubmitted}</h2>
          <p>{t.complaintId}:</p>
          <strong>{success.id}</strong>
          <p>{t.status} {success.status}</p>
          <p>
            {t.received}
          </p>
        </div>
      )}
    </main>
  );
}

export default App;