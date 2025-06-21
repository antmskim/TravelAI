// app/(routes)/dashboard/layout.tsx
import React from 'react'

function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <div className='px-10 md:px-20 lg:px-40 py-10'>
                {children}
            </div>
        </div>
    )
}

export default DashboardLayout