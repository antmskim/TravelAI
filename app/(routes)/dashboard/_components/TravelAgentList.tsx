import { AITravelAgents } from '@/shared/list'
import React from 'react'
import TravelAgentCard from './TravelAgentCard'

/**
 * TravelAgentList Component
 * Displays a grid of AI-powered travel agent cards using data from AITravelAgents.
 */
function TravelAgentList() {
    return (
        <div className='mt-10'>
            {/* 🧠 Section Title */}
            <h2 className='font-bold text-xl'>AI Travel Agent</h2>

            {/* 🧳 Responsive grid layout for travel agent cards */}
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 mt-5'>
                {AITravelAgents.map((agent, index) => (
                    <div key={index}>
                        {/* 🧑‍💼 Render each travel agent card */}
                        <TravelAgentCard travelAgent={agent} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TravelAgentList 