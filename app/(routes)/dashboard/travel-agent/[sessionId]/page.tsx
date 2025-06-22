// app/(routes)/dashboard/travel-agent/[sessionId]/page.tsx
"use client"

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import { travelAgent } from '../../_components/TravelAgentCard';
import { Circle, Loader2, PhoneCall, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';

// Import migrated 3D components and hook
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei"; // R3F Loader
import { Leva } from "leva";
import { Experience } from '@/components/frontend-ui/Experience'; // Path to your migrated Experience component
import { UI } from '@/components/frontend-ui/UI'; // Path to your migrated UI component
import { ChatProvider, useChat } from '@/lib/hooks/useChat'; // Path to your migrated useChat hook
import Image from 'next/image';
import { Button } from '@/components/ui/button'; // FIX: Import Button component

// FIX: Define a proper interface for JSON or use 'any'
export type SessionDetail = {
    id: number,
    notes: string,
    sessionId: string,
    report: any, // FIX: Changed from JSON to any to resolve TypeScript error/page.tsx]
    selectedAgent: travelAgent,
    createdOn: string,
    conversation?: any[] // Add conversation to session detail if you fetch it
}

type Message = {
    role: string,
    text: string
}

// FIX: Define an interface for Leva's props to resolve type issues
interface LevaComponentProps {
    hidden?: boolean;
    // You can add other common Leva props here if needed,
    // or use a more general index signature if you pass many unknown props.
    [key: string]: any;
}

/**
 * TravelVoiceAgent Component
 * Provides an AI-powered travel voice assistant interface where users can
 * interact in real-time with a 3D avatar, view live transcripts, and generate a consultation report.
 */
function TravelVoiceAgentPage() {
    const { sessionId } = useParams();
    const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
    const [currentRole, setCurrentRole] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState<string>('');
    const [messagesLog, setMessagesLog] = useState<Message[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const router = useRouter();

    // Access state and functions from the useChat hook
    const { chat, loading: aiLoading, message: currentAiMessage, onMessagePlayed, logClientMessage } = useChat();

    // Load session details on component mount or when sessionId changes
    useEffect(() => {
        if (sessionId) {
            GetSessionDetails();
        }
    }, [sessionId]);

    // Effect to update messagesLog and live transcript from useChat's currentAiMessage
    useEffect(() => {
        if (currentAiMessage) {
            setCurrentRole('assistant');
            setLiveTranscript(currentAiMessage.text);
        } else {
            setCurrentRole(null);
            setLiveTranscript('');
        }
    }, [currentAiMessage]);

    // This useEffect is to populate messagesLog from initial sessionDetail.conversation
    // and whenever sessionDetail.conversation updates (e.g. after fetching fresh session data)
    useEffect(() => {
        if (sessionDetail?.conversation && sessionDetail.conversation.length > 0) {
            setMessagesLog(sessionDetail.conversation.filter((msg: any) => msg.role !== 'system'));
        }
    }, [sessionDetail?.conversation]);


    // Fetch session detail data from backend API
    const GetSessionDetails = async () => {
        try {
            const result = await axios.get(`/api/session-chat?sessionId=${sessionId}`);
            setSessionDetail(result.data);
            logClientMessage('info', `Fetched session details for ${sessionId}`, 'TravelVoiceAgentPage.tsx');
            if (result.data?.conversation) {
                 setMessagesLog(result.data.conversation.filter((msg: any) => msg.role !== 'system'));
            }
        } catch (error: any) { // Fix: Cast error to any/page.tsx]
            logClientMessage('error', `Error fetching session details for ${sessionId}: ${error.message}`, 'TravelVoiceAgentPage.tsx');
        }
    };

    /**
     * handleStartConversation
     * Initiates the voice conversation with the AI Travel Agent via your own backend.
     */
    const handleStartConversation = useCallback(async () => {
        logClientMessage('info', 'Attempting to start conversation.', 'TravelVoiceAgentPage.tsx');
        if (!aiLoading && chat) {
            const initialMessage = sessionDetail?.notes || "Hello, I'm ready to plan my trip!";
            await chat(initialMessage, null);
            setCurrentRole('assistant');
        }
    }, [aiLoading, chat, sessionDetail?.notes, logClientMessage]);

    /**
     * handleEndConversation
     * Ends the ongoing voice conversation, generates a report, and redirects.
     */
    const handleEndConversation = useCallback(async () => {
        logClientMessage('info', 'Attempting to end conversation and generate report.', 'TravelVoiceAgentPage.tsx');
        
        if (currentAiMessage && currentAiMessage.audio) {
            try {
                const audioInstance = new Audio("data:audio/mp3;base64," + currentAiMessage.audio);
                audioInstance.pause();
                audioInstance.currentTime = 0;
            } catch (e: any) { // FIX: Cast e to any/page.tsx]
                logClientMessage('warn', `Could not pause audio: ${e.message}`, 'TravelVoiceAgentPage.tsx');
            }
        }

        setReportLoading(true);
        const result = await GenerateReport(messagesLog);
        setReportLoading(false);

        if (result) {
            toast.success('Your report is generated!');
            logClientMessage('info', 'Report generated successfully. Redirecting to dashboard.', 'TravelVoiceAgentPage.tsx');
            router.replace('/dashboard');
        } else {
            toast.error('Failed to generate report.');
            logClientMessage('error', 'Failed to generate report.', 'TravelVoiceAgentPage.tsx');
        }
    }, [messagesLog, router, currentAiMessage, logClientMessage]);

    /**
     * GenerateReport
     * Sends the conversation history to the backend for report generation.
     */
    const GenerateReport = async (conversation: Message[]) => {
        try {
            const result = await axios.post('/api/travel-report', {
                messages: conversation,
                sessionDetail: sessionDetail,
                sessionId: sessionId
            });
            logClientMessage('info', `Report generation API call successful for session ${sessionId}.`, 'TravelVoiceAgentPage.tsx');
            return result.data;
        } catch (error: any) { // FIX: Cast error to any/page.tsx]
            logClientMessage('error', `REPORT GENERATION API ERROR for session ${sessionId}: ${error.message}`, 'TravelVoiceAgentPage.tsx');
            return null;
        }
    };

    if (!sessionDetail) {
        return (
            <div className="flex justify-center items-center h-screen text-lg font-semibold">
                <Loader2 className="animate-spin mr-2" /> Loading Session...
            </div>
        );
    }

    const isConnected = aiLoading || !!currentAiMessage;


    return (
        <div className='p-5 border rounded-3xl bg-secondary h-[calc(100vh-100px)] flex flex-col'>
            {/* Status bar showing if AI is active */}
            <div className='flex justify-between items-center mb-4'>
                <h2 className='p-1 px-2 border rounded-md flex gap-2 items-center'>
                    <Circle className={`h-4 w-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {isConnected ? 'Connected...' : 'Idle'}
                </h2>
                {/* TODO: Add timer */}
                <h2 className='font-bold text-xl text-gray-400'>00:00</h2>
            </div>

            {/* Main content shows agent details and conversation transcript */}
            <div className='flex items-center flex-col flex-grow relative'>
                {/* 3D Avatar Canvas */}
                <div className="absolute inset-0 z-0">
                    <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }} className="h-full w-full">
                        <Experience />
                    </Canvas>
                </div>

                {/* UI for chat input and controls */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {/* FIX: Use type assertion for Leva props to resolve type error */}
                    <Leva {...{ hidden: true } as LevaComponentProps} /> {/* Fixed Leva prop type/page.tsx] */}
                    <UI hidden={true} />
                </div>
                
                {/* Overlay for Agent Info and Transcript - Ensure higher z-index to be visible */}
                <div className="relative z-20 flex flex-col items-center p-4">
                    <Image
                        src={sessionDetail.selectedAgent?.image}
                        alt={sessionDetail.selectedAgent?.title ?? 'AI Agent'}
                        width={100}
                        height={100}
                        className='h-[100px] w-[100px] object-cover rounded-full mb-2'
                    />
                    <h2 className='text-lg font-semibold text-gray-800'>{sessionDetail.selectedAgent?.title}</h2>
                    <p className='text-sm text-gray-500'>AI Travel Voice Agent</p>
                </div>

                {/* Live Transcript Display */}
                <div className='mt-8 overflow-y-auto w-full max-w-lg px-4 flex flex-col items-center text-center'>
                    {/* Display last few finalized messages from messagesLog */}
                    {messagesLog.slice(-4).map((msg, index) => (
                        <h2 className='text-gray-600 p-1 text-sm' key={index}>
                            {msg.role === 'user' ? 'You' : 'Agent'}: {msg.text}
                        </h2>
                    ))}
                    {liveTranscript && (
                        <h2 className='text-lg font-medium text-blue-700 animate-pulse'>
                            {currentRole === 'user' ? 'You' : 'Agent'} : {liveTranscript}
                        </h2>
                    )}
                </div>

                {/* Call Control Buttons */}
                <div className="relative z-20 mt-auto flex gap-4 p-4">
                    {!isConnected ? (
                        <Button onClick={handleStartConversation} disabled={aiLoading}>
                            {aiLoading ? <Loader2 className='animate-spin mr-2' /> : <PhoneCall className='mr-2' />} Start Conversation
                        </Button>
                    ) : (
                        <Button variant='destructive' onClick={handleEndConversation} disabled={reportLoading}>
                            {reportLoading ? <Loader2 className='animate-spin mr-2' /> : <PhoneOff className='mr-2' />} End Conversation
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TravelVoiceAgentPage;