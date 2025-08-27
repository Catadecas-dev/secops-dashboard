'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Shield, LogIn } from 'lucide-react'

export default function LogoutPage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Perform logout API call when component mounts
    const performLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (error) {
        console.error('Logout API failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    performLogout()
  }, [])

  const handleLoginRedirect = () => {
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Signing out...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">SecOps Dashboard</h2>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              Successfully Logged Out
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              You have successfully exited the application. Your session has been terminated securely.
            </p>
            
            <Button 
              onClick={handleLoginRedirect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login Again
            </Button>
            
            <p className="text-sm text-gray-500">
              Thank you for using SecOps Dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
