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
import AddNewSessionDialog from './AddNewSessionDialog'

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
 * and a button to start a new travel planning session.
 */
function TravelAgentCard({ travelAgent }: props) {
    const [open, setOpen] = useState(false);
    const { has } = useAuth();
    //@ts-ignore
    const paidUser = has && has({ plan: 'pro' });

    // Open the modal on button click
    const onStartPlanning = () => setOpen(true);

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

            {/* 🚀 Start planning button */}
            <Button
                className='w-full mt-2'
                onClick={onStartPlanning}
                disabled={!paidUser && travelAgent.subscriptionRequired} // disable if agent is premium & user isn't
            >
                Start Planning <IconArrowRight />
            </Button>
            <AddNewSessionDialog open={open} setOpen={setOpen} travelAgent={travelAgent} />
        </div>
    )
}

export default TravelAgentCard
