// lib/hooks/useChat.jsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from "react";
import path from 'path'; // Needed for path.basename if you want detailed file names in logs
import { logMessage } from '@/lib/logger'; // Your shared logger

// Note: backendUrl is no longer needed as we'll use relative paths for Next.js API routes.
const IP_API_URL = "https://ipapi.co/json/";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState(null); // Current AI message being played
  const [loading, setLoading] = useState(false); // Indicates if AI is thinking/generating
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]); // Full conversation history for Gemini

  const audioRef = useRef(null); // Ref to hold the current audio element

  // --- CLIENT-SIDE LOGGING FUNCTION ---
  // This function sends logs from the frontend to a Next.js API route.
  const logClientMessage = useCallback(async (level, msg, fileName = 'useChat.jsx') => {
    try {
      await fetch('/api/client-log', { // Call the Next.js API route for client logs
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message: msg, fileName }),
      });
    } catch (error) {
      console.error('Failed to send client log to backend:', error);
    }
  }, []);
  // --------------------------------------

  // --- SESSION AND GEOLOCATION LOGIC ---
  useEffect(() => {
    // Generate a unique session ID on initial mount.
    // In a real app, this might come from the server after session creation in DB.
    const newSessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setSessionId(newSessionId);
    logClientMessage('info', `Generated new session ID: ${newSessionId}`, 'useChat.jsx'); // Added logging

    // Try to get high-accuracy GPS location first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        logClientMessage('info', `✅ GPS location obtained: ${JSON.stringify(coords)}`, 'useChat.jsx'); // Added logging
        setLocation(coords);
        setLocationError(null);
      },
      async (error) => {
        logClientMessage('warn', `⚠️ GPS failed: ${error.message}. Falling back to IP-based location.`, 'useChat.jsx'); // Added logging
        // If GPS fails, fall back to IP-based location
        try {
          const resp = await fetch(IP_API_URL);
          const data = await resp.json();
          if (data.latitude && data.longitude) {
            const ipCoords = {
              latitude: data.latitude,
              longitude: data.longitude,
            };
            logClientMessage('info', `🌐 IP location obtained: ${JSON.stringify(ipCoords)}`, 'useChat.jsx'); // Added logging
            setLocation(ipCoords);
            setLocationError(null);
          } else {
            throw new Error("IP API did not return coordinates.");
          }
        } catch (ipError) {
          logClientMessage('error', `❌ IP geolocation also failed: ${ipError.message}`, 'useChat.jsx'); // Added logging
          setLocationError("Could not determine your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [logClientMessage]); // logClientMessage is a dependency

  // --- MESSAGE QUEUE MANAGEMENT ---
  const onMessagePlayed = useCallback(() => {
    logClientMessage('info', `AI message audio finished playing. Removing from queue.`, 'useChat.jsx'); // Added logging
    setMessages((msgs) => msgs.slice(1));
  }, [logClientMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      logClientMessage('info', `New AI message available: "${messages[0].text}"`, 'useChat.jsx'); // Added logging
      setMessage(messages[0]);
    } else {
      setMessage(null);
      logClientMessage('info', `AI message queue empty.`, 'useChat.jsx'); // Added logging
    }
  }, [messages, logClientMessage]);

  // --- IMAGE TO BASE64 CONVERTER ---
  const fileToGenerativePart = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        logClientMessage('info', `Converted image file ${file.name} to base64.`, 'useChat.jsx'); // Added logging
        resolve({
          inlineData: {
            data: e.target.result.split(",")[1], // Extract base64 data
            mimeType: file.type,
          },
        });
      };
      reader.readAsDataURL(file);
    });
  }, [logClientMessage]);

  // --- MAIN CHAT FUNCTION ---
  const chat = useCallback(
    async (userMessage, image) => {
      setLoading(true);
      logClientMessage('info', `Sending chat request. Message: "${userMessage || '[No Text]'}". Image: ${image ? 'Yes' : 'No'}.`, 'useChat.jsx'); // Added logging

      const payload = {
        message: userMessage,
        location,
        sessionId,
        // The history is now managed by the backend (DB), so we don't send it from frontend
        // history, // REMOVE THIS LINE IF YOU HAVE MIGRATED TO DB-PERSISTED HISTORY IN /api/chat
      };

      if (image) {
        payload.image = await fileToGenerativePart(image);
      }

      try {
        const res = await fetch(`/api/chat`, { // Target the new Next.js API route
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          logClientMessage('error', `Server error on chat fetch (${res.status}): ${errorText}`, 'useChat.jsx'); // Added logging
          throw new Error(`Server error: ${res.status}`);
        }
        
        const body = await res.json();
        logClientMessage('info', `Chat response received for session ${sessionId}.`, 'useChat.jsx'); // Added logging
        setMessages((ms) => [...ms, ...body.messages]);
        setHistory(body.history); // Ensure backend sends back the full updated history

      } catch (error) {
        logClientMessage('error', `Failed to fetch chat response: ${error.message}`, 'useChat.jsx'); // Added logging
      } finally {
        setLoading(false);
        logClientMessage('info', `Chat request processing finished.`, 'useChat.jsx'); // Added logging
      }
    },
    [location, sessionId, fileToGenerativePart, logClientMessage] // history dependency removed as it's not sent
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
        logClientMessage, // Expose logClientMessage to other components if needed
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