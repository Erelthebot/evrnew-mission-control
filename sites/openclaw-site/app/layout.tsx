import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import ChatWidget from '@/components/ChatWidget'
import TopBar from '@/app/components/TopBar'

export const metadata: Metadata = {
  title: 'EREL.AI — Mission Control',
  description: 'EVRNEW LLC Internal Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PRSJST3R');` }} />
      </head>
      <body>
        <div id="app-shell">
          <Sidebar />
          <div id="main-col">
            <TopBar />
            <main id="scroll-area">
              {children}
            </main>
          </div>
        </div>
        <ChatWidget />
      </body>
    </html>
  )
}
