'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IncidentForm } from '@/components/dashboard/incident-form'
import { IncidentList } from '@/components/dashboard/incident-list'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Clock, CheckCircle, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface IncidentStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

export default function DashboardPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const router = useRouter()

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/incidents/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats:', response.status, response.statusText);
        if (response.status === 401) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger])

  const handleIncidentCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleLogout = async () => {
    router.push('/logout')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                SecOps Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <IncidentForm onSuccess={handleIncidentCreated} />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats.total}
              </div>
              <p className="text-xs text-muted-foreground">
                All time incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats.open}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats.in_progress}
              </div>
              <p className="text-xs text-muted-foreground">
                Being investigated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats.resolved}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Incidents List */}
        <IncidentList refreshTrigger={refreshTrigger} />
      </main>
    </div>
  )
}
