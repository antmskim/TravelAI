"use client"
import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight, Loader2 } from 'lucide-react'
import axios from 'axios'
// import DoctorAgentCard, { doctorAgent } from './DoctorAgentCard' // No longer needed
import SuggestedAgentCard from './SuggestedAgentCard'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SessionDetail } from '../travel-agent/[sessionId]/page'

function AddNewSessionDialog({ open, setOpen, travelAgent }: { open?: boolean, setOpen?: (open: boolean) => void, travelAgent?: any } = {}) {
    // 🧠 Local state management
    const [note, setNote] = useState<string>(); // stores user travel input
    const [loading, setLoading] = useState(false); // tracks loading state
    const [historyList, setHistoryList] = useState<SessionDetail[]>([]); // stores past session list

    const router = useRouter();
    const { has } = useAuth();

    // ✅ Checks if user has a paid subscription (Clerk custom role)
    //@ts-ignore
    const paidUser = has && has({ plan: 'pro' });

    // 🧾 Fetch session history when dialog mounts
    useEffect(() => {
        GetHistoryList();
    }, [])

    // 📥 Get all previous session records
    const GetHistoryList = async () => {
        const result = await axios.get('/api/session-chat?sessionId=all');
        setHistoryList(result.data);
    }

    // 🩺 Handles "Start Planning" button — saves session and redirects
    const onStartPlanning = async () => {
        setLoading(true);
        let selectedAgent = travelAgent;
        if (!selectedAgent) {
            const { AITravelAgents } = await import('@/shared/list');
            selectedAgent = AITravelAgents[0];
        }
        const result = await axios.post('/api/session-chat', {
            notes: note,
            selectedAgent: selectedAgent
        });
        if (result.data?.sessionId) {
            // 🔁 Redirect to the new session page
            router.push('/dashboard/travel-agent/' + result.data.sessionId);
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {(!open && !setOpen) && (
                <DialogTrigger asChild>
                    <Button>Start New Travel Plan</Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Start a New Travel Plan</DialogTitle>
                    <DialogDescription>
                        <Textarea
                            placeholder="Describe your travel plans, interests, or questions..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose>
                        <Button variant={'outline'}>Cancel</Button>
                    </DialogClose>
                    <Button
                        disabled={!note || loading}
                        onClick={onStartPlanning}
                    >
                        Start Planning {loading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AddNewSessionDialog
