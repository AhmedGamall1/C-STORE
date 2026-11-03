import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { router } from './router.jsx'
import { QueryProvider } from './providers/QueryProvider.jsx'
import './index.css'
import { AuthProvider } from './providers/AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          duration={2500}
          richColors
          closeButton
          toastOptions={{
            className: 'font-medium',
          }}
        />
      </AuthProvider>
    </QueryProvider>
  </StrictMode>
)
