import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { SessionDetail } from '../travel-agent/[sessionId]/page' // Corrected path
import moment from 'moment'
import { Map, ListChecks, AlertTriangle, Lightbulb, TramFront, CloudSun, Users } from 'lucide-react'

type props = {
    record: SessionDetail // A single travel session record
}

/**
 * ViewReportDialog Component
 * * Displays a full detailed travel report in a dialog when the user clicks "View Report".
 * It is structured to show trip purpose, summary, a detailed itinerary, and any relevant alerts.
 */
function ViewReportDialog({ record }: props) {
    // Extract the report object from the session record
    const report: any = record?.report 
    // Format date nicely
    const formatDate = moment(record?.createdOn).format("MMMM Do YYYY, h:mm a")

    // Helper to render a list of items if the list exists and is not empty
    const renderListSection = (title: string, items: string[] | undefined, icon: React.ReactNode) => {
        if (!items || items.length === 0) return null;

        return (
            <div>
                <h3 className='text-lg font-semibold text-blue-500 flex items-center gap-2'>
                    {icon} {title}
                </h3>
                <hr className='border-t-2 border-blue-500 my-2' />
                <ul className='list-disc list-inside space-y-1'>
                    {items.map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <Dialog>
            {/* Button to trigger the dialog */}
            <DialogTrigger asChild>
                <Button variant={'link'} size={'sm'}>View Report</Button>
            </DialogTrigger>

            {/* Dialog content container */}
            <DialogContent className="max-h-[90vh] overflow-y-auto bg-white shadow-lg p-6 border border-gray-200 w-full max-w-2xl">
                <DialogHeader>
                    {/* Report Title */}
                    <DialogTitle asChild>
                        <h2 className='text-center text-3xl font-bold text-blue-500 mb-6'>
                            🧭 Travel AI Voice Agent Report
                        </h2>
                    </DialogTitle>

                    {/* Report Description Content */}
                    <DialogDescription asChild>
                        <div className='space-y-6 text-gray-800 text-sm'>

                            {/* Section 1: Session Info */}
                            <div>
                                <h3 className='text-lg font-semibold text-blue-500'>Session Info</h3>
                                <hr className='border-t-2 border-blue-500 my-2' />
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <p><strong>Agent:</strong> {record?.selectedAgent?.title}</p>
                                    <p><strong>User:</strong> {report?.user || 'Anonymous'}</p>
                                    <p><strong>Generated On:</strong> {formatDate}</p>
                                    <p><strong>Current Location:</strong> {report?.currentLocation || 'Not specified'}</p>
                                </div>
                            </div>

                            {/* Section 2: Trip Purpose & Summary */}
                            <div>
                                <h3 className='text-lg font-semibold text-blue-500 flex items-center gap-2'><Map size={20} /> Trip Overview</h3>
                                <hr className='border-t-2 border-blue-500 my-2' />
                                {report?.tripPurpose && <p><strong>Purpose:</strong> {report.tripPurpose}</p>}
                                {report?.summary && <p className='mt-2'><strong>Summary:</strong> {report.summary}</p>}
                            </div>

                            {/* Section 3: Recommended Itinerary */}
                            {report?.recommendedItinerary?.length > 0 && (
                                <div>
                                    <h3 className='text-lg font-semibold text-blue-500 flex items-center gap-2'><ListChecks size={20} /> Recommended Itinerary</h3>
                                    <hr className='border-t-2 border-blue-500 my-2' />
                                    <div className='overflow-x-auto'>
                                        <table className='w-full text-left'>
                                            <thead>
                                                <tr className='border-b'>
                                                    <th className='p-2'>Place</th>
                                                    <th className='p-2'>Transport</th>
                                                    <th className='p-2'>ETA</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.recommendedItinerary.map((item: any, index: number) => (
                                                    <tr key={index} className='border-b'>
                                                        <td className='p-2'>{item.place}</td>
                                                        <td className='p-2'>{item.mode}</td>
                                                        <td className='p-2'>{item.eta}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Live Alerts */}
                             {(report?.transportationUpdates?.length > 0 || report?.weatherAlerts?.length > 0 || report?.crowdAlerts?.length > 0) && (
                                <div>
                                    <h3 className='text-lg font-semibold text-red-500 flex items-center gap-2'><AlertTriangle size={20} /> Live Alerts</h3>
                                    <hr className='border-t-2 border-red-500 my-2' />
                                    <div className='space-y-4'>
                                        {renderListSection("Transportation Updates", report.transportationUpdates, <TramFront size={18} />)}
                                        {renderListSection("Weather Alerts", report.weatherAlerts, <CloudSun size={18} />)}
                                        {renderListSection("Crowd Alerts", report.crowdAlerts, <Users size={18} />)}
                                    </div>
                                </div>
                             )}

                            {/* Section 5: AI Recommendations */}
                            {renderListSection("AI Recommendations", report?.recommendations, <Lightbulb size={20} />)}
                            
                            {/* Disclaimer Footer */}
                            <div className='pt-6 border-t border-gray-300 text-center text-xs text-gray-500'>
                                This report was generated by an AI Travel Assistant for informational purposes only. Always verify details like opening hours and transit schedules.
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}

export default ViewReportDialog