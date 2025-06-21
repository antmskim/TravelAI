import React from 'react'
import HistoryList from './_components/HistoryList'
import { Button } from '@/components/ui/button'
import TravelAgentList from './_components/TravelAgentList'
import AddNewSessionDialog from './_components/AddNewSessionDialog'

function Dashboard() {
    return (
        <div>
            <div className='flex justify-between items-center'>
                <h2 className='font-bold text-2xl'>My Travel Dashboard (TEST)</h2>
                <AddNewSessionDialog />

            </div>

            <p>Test 1234!</p>
            <HistoryList />

            <TravelAgentList />
        </div>
    )
}

export default Dashboard