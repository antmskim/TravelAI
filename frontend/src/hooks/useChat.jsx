import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const IP_API_URL = "https://ipapi.co/json/";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);

  // --- SESSION AND GEOLOCATION LOGIC ---
  useEffect(() => {
    // Generate a unique session ID on initial mount
    const newSessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setSessionId(newSessionId);

    // Try to get high-accuracy GPS location first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log("✅ GPS location obtained:", coords);
        setLocation(coords);
        setLocationError(null);
      },
      async (error) => {
        console.warn("⚠️ GPS failed:", error.message);
        // If GPS fails, fall back to IP-based location
        try {
          const resp = await fetch(IP_API_URL);
          const data = await resp.json();
          if (data.latitude && data.longitude) {
            const ipCoords = {
              latitude: data.latitude,
              longitude: data.longitude,
            };
            console.log("🌐 IP location obtained:", ipCoords);
            setLocation(ipCoords);
            setLocationError(null);
          } else {
            throw new Error("IP API did not return coordinates.");
          }
        } catch (ipError) {
          console.error("❌ IP geolocation also failed:", ipError);
          setLocationError("Could not determine your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, []);

  // --- MESSAGE QUEUE MANAGEMENT ---
  const onMessagePlayed = () => {
    setMessages((msgs) => msgs.slice(1));
  };

  useEffect(() => {
    setMessage(messages.length ? messages[0] : null);
  }, [messages]);

  // --- IMAGE TO BASE64 CONVERTER ---
  const fileToGenerativePart = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          inlineData: {
            data: e.target.result.split(",")[1], // Extract base64 data
            mimeType: file.type,
          },
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // --- MAIN CHAT FUNCTION ---
  const chat = useCallback(
    async (userMessage, image) => {
      setLoading(true);

      const payload = {
        message: userMessage,
        location,
        sessionId,
        history,
      };

      if (image) {
        payload.image = await fileToGenerativePart(image);
      }

      try {
        const res = await fetch(`${backendUrl}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        
        const body = await res.json();
        setMessages((ms) => [...ms, ...body.messages]);
        setHistory(body.history);

      } catch (error) {
        console.error("Failed to fetch chat response:", error);
      } finally {
        setLoading(false);
      }
    },
    [location, sessionId, history]
  );

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        locationError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};