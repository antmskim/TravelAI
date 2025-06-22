// app/(routes)/dashboard/_components/TravelAgentCard.tsx
"use client"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import { IconArrowRight } from '@tabler/icons-react'
import axios from 'axios'
import { Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
// No longer import AddNewSessionDialog directly here if we're bypassing it for this flow
// import AddNewSessionDialog from './AddNewSessionDialog'

/**
 * Type definition for each travel agent card
 */
export type travelAgent = {
    id: number,
    title: string,
    description: string,
    image: string,
    agentPrompt: string,
    voiceId?: string,
    subscriptionRequired: boolean
}

type props = {
    travelAgent: travelAgent
}

/**
 * TravelAgentCard Component
 * Renders a travel agent card with image, name, description,
 * and a button to speak to the AI agent.
 */
function TravelAgentCard({ travelAgent }: props) {
    const [loading, setLoading] = useState(false); // New loading state for the button
    const { has } = useAuth();
    const router = useRouter(); // Initialize useRouter

    //@ts-ignore
    const paidUser = has && has({ plan: 'pro' });

    // Handles "Speak to AI Agent" button — creates session and redirects
    const handleSpeakToAIAgent = async () => {
        setLoading(true);
        try {
            // Create a new session in the backend
            const result = await axios.post('/api/session-chat', {
                notes: "", // Send an empty note for a seamless start
                selectedAgent: travelAgent
            });

            if (result.data?.sessionId) {
                // Redirect to the new session's voice agent page
                router.push('/dashboard/travel-agent/' + result.data.sessionId);
            } else {
                console.error("Failed to get sessionId from backend:", result.data);
                // Optionally show a toast error
            }
        } catch (error) {
            console.error("Error starting AI session:", error);
            // Optionally show a toast error
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='relative'>
            {/* 🔒 Premium badge if agent requires subscription */}
            {travelAgent.subscriptionRequired && (
                <Badge className='absolute m-2 right-0'>Premium</Badge>
            )}

            {/* 🧳 Travel agent image */}
            <Image
                src={travelAgent.image}
                alt={travelAgent.title}
                width={200}
                height={300}
                className='w-full h-[230px] object-cover rounded-xl'
            />

            {/* 🧭 Agent title */}
            <h2 className='font-bold mt-1'>{travelAgent.title}</h2>

            {/* 📋 Agent description */}
            <p className='line-clamp-2 text-sm text-gray-500'>
                {travelAgent.description}
            </p>

            {/* 🚀 Speak to AI Agent button */}
            <Button
                className='w-full mt-2'
                onClick={handleSpeakToAIAgent} // Call the new handler
                disabled={loading || (!paidUser && travelAgent.subscriptionRequired)} // Disable while loading or if premium required
            >
                {loading ? <Loader2Icon className='animate-spin mr-2' /> : 'Speak to AI Agent'}
                {!loading && <IconArrowRight />}
            </Button>
            {/* Remove the AddNewSessionDialog component from here */}
        </div>
    )
}

export default TravelAgentCard