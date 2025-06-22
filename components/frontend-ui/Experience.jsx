// components/frontend-ui/Experience.jsx
import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat"; // FIX: This import path should be updated in your actual project
                                          // to "@/lib/hooks/useChat" or similar.
                                          // Using relative path for snippet consistency.
import { Avatar } from "./Avatar";

const Dots = (props) => {
  // Get logClientMessage from useChat hook
  const { loading, logClientMessage } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      logClientMessage('info', 'AI loading started, displaying dots.', 'Experience.jsx'); // Added logging
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      logClientMessage('info', 'AI loading finished, hiding dots.', 'Experience.jsx'); // Added logging
      setLoadingText("");
    }
  }, [loading, logClientMessage]); // logClientMessage is a dependency
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="white" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  // Get logClientMessage from useChat hook
  const { cameraZoomed, logClientMessage } = useChat();

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
    logClientMessage('info', 'Camera initial position set.', 'Experience.jsx'); // Added logging
  }, [logClientMessage]); // logClientMessage is a dependency

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
      logClientMessage('info', 'Camera zoomed in.', 'Experience.jsx'); // Added logging
    } else {
      cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
      logClientMessage('info', 'Camera zoomed out.', 'Experience.jsx'); // Added logging
    }
  }, [cameraZoomed, logClientMessage]); // logClientMessage is a dependency

  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="apartment" />
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <Avatar />
      <ContactShadows opacity={0.7} />
    </>
  );
};