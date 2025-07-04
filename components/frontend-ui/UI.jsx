// components/frontend-ui/UI.jsx
import { useRef, useState } from "react";
import { useChat } from "@/lib/hooks/useChat"; // FIX: Update import path

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const fileInputRef = useRef();
  // Get logClientMessage from useChat hook
  const { chat, loading, cameraZoomed, setCameraZoomed, message, locationError, logClientMessage } = useChat();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    logClientMessage('info', `File selected for upload: ${file ? file.name : 'none'}`, 'UI.jsx'); // Added logging
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        logClientMessage('warn', 'User attempted to upload non-image file type.', 'UI.jsx'); // Added logging
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        logClientMessage('warn', `User attempted to upload image larger than 10MB: ${file.name} (${file.size} bytes).`, 'UI.jsx'); // Added logging
        alert('File size too large. Please select an image under 10MB.');
        return;
      }
      
      logClientMessage('info', `Valid image file selected: ${file.name}, type: ${file.type}, size: ${file.size} bytes.`, 'UI.jsx'); // Added logging
      setImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        logClientMessage('info', `Image preview generated for ${file.name}.`, 'UI.jsx'); // Added logging
      };
      reader.readAsDataURL(file);
      
      if (input.current) {
        input.current.value = "";
      }
    }
  };

  const clearImage = () => {
    logClientMessage('info', 'Image preview cleared by user.', 'UI.jsx'); // Added logging
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = () => {
    const text = input.current.value.trim();
    logClientMessage('info', `Sending message. Text: "${text}", Image: ${image ? 'Yes' : 'No'}.`, 'UI.jsx'); // Added logging
    
    if (!loading && (text || image)) {
      chat(text, image);
      input.current.value = "";
      clearImage();
    } else {
      logClientMessage('warn', `Attempted to send empty message or while AI is loading. Text: "${text}", Image: ${image ? 'Yes' : 'No'}. Loading: ${loading}.`, 'UI.jsx'); // Added logging
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      {locationError && (
        <div className="fixed top-16 left-0 right-0 z-20 flex justify-center">
          <div className="bg-red-500/80 backdrop-blur-md text-white px-4 py-2 rounded-lg">
            <p>{locationError}</p>
            {logClientMessage('error', `Location error displayed: ${locationError}`, 'UI.jsx')} {/* Added logging */}
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="fixed top-20 left-4 z-20 bg-white/90 backdrop-blur-md p-2 rounded-lg max-w-xs">
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-full max-h-32 object-contain rounded"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1 truncate">{image?.name}</p>
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl">My Travel Agent</h1>
          <p>Your personal AI guide to the world!</p>
        </div>
        
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => {
              setCameraZoomed(!cameraZoomed);
              logClientMessage('info', `Camera zoomed: ${!cameraZoomed}`, 'UI.jsx'); // Added logging
            }}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              body.classList.toggle("greenScreen");
              logClientMessage('info', `Green screen toggled. Is green screen: ${body.classList.contains('greenScreen')}`, 'UI.jsx'); // Added logging
            }}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <label 
            htmlFor="image-upload" 
            className={`cursor-pointer font-bold p-4 rounded-md transition-colors ${
              image ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }`}
            title="Upload image"
          >
            {image ? '📸' : '📎'}
          </label>
          <input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <input
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder={image ? `Image selected: ${image.name}` : "Ask about a destination..."}
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                logClientMessage('info', 'Enter key pressed in input field.', 'UI.jsx'); // Added logging
                sendMessage();
              }
            }}
          />
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-pink-500 hover:bg-pink-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};