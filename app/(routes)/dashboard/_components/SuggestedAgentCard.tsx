import React from 'react'
import { travelAgent } from './TravelAgentCard'
import Image from 'next/image'

type props = {
    travelAgent: travelAgent,             // travel agent data to display
    setSelectedAgent: (agent: travelAgent) => void, // function to set selected agent
    selectedAgent: travelAgent          // currently selected agent
}

/**
 * SuggestedAgentCard Component
 * 
 * Displays a clickable card for a suggested agent.
 * Highlights the card if it is the currently selected agent.
 */
function SuggestedAgentCard({ travelAgent, setSelectedAgent, selectedAgent }: props) {
    return (
        <div
            className={`flex flex-col items-center
            border rounded-2xl shadow p-5
            hover:border-blue-500 cursor-pointer
            ${selectedAgent?.id == travelAgent?.id && 'border-blue-500'}`}
            onClick={() => setSelectedAgent(travelAgent)} // select this agent on click
        >
            {/* 🧳 Agent image */}
            <Image
                src={travelAgent?.image}
                alt={travelAgent?.title}
                width={70}
                height={70}
                className='w-[50px] h-[50px] rounded-4xl object-cover'
            />

            {/* 🧭 Agent name */}
            <h2 className='font-bold text-sm text-center'>
                {travelAgent?.title}
            </h2>

            {/* 📋 Short description */}
            <p className='text-xs text-center line-clamp-2'>
                {travelAgent?.description}
            </p>
        </div>
    )
}

export default SuggestedAgentCard
