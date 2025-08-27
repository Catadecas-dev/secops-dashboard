'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SeverityBadge, StatusBadge } from './incident-badge'
import { createCommentSchema, type CreateCommentInput } from '@/validation/schemas'
import { IncidentResponse, CommentResponse, PaginatedResponse } from '@/validation/schemas'
import { Status } from '@prisma/client'
import { MessageSquare, User, Calendar, AlertCircle } from 'lucide-react'

interface IncidentDetailProps {
  incidentId: string
}

export function IncidentDetail({ incidentId }: IncidentDetailProps) {
  const [incident, setIncident] = useState<IncidentResponse | null>(null)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
  })

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch incident')
      }

      setIncident(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}/comments`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch comments')
      }

      setComments(result.data)
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchIncident(), fetchComments()])
      setLoading(false)
    }

    loadData()
  }, [incidentId])

  const onSubmitComment = async (data: CreateCommentInput) => {
    setCommentLoading(true)

    try {
      const response = await fetch(`/api/incidents/${incidentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to add comment')
      }

      reset()
      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCommentLoading(false)
    }
  }

  const updateStatus = async (newStatus: Status) => {
    if (!incident) return

    setStatusUpdating(true)

    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update status')
      }

      setIncident(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setStatusUpdating(false)
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Loading incident details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error || 'Incident not found'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Incident Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
              <CardTitle className="text-2xl">{incident.title}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={incident.status}
                onValueChange={(value) => updateStatus(value as Status)}
                disabled={statusUpdating}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">Created By</h4>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{incident.createdBy.email}</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">Created At</h4>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(incident.createdAt)}</span>
              </div>
            </div>
            {incident.source && (
              <div>
                <h4 className="font-medium text-sm text-gray-500 mb-1">Source</h4>
                <span>{incident.source}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card id="comments">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Comments ({comments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Comment Form */}
          <form onSubmit={handleSubmit(onSubmitComment)} className="space-y-4">
            <div>
              <Textarea
                placeholder="Add a comment..."
                rows={3}
                {...register('body')}
                className={errors.body ? 'border-red-500' : ''}
              />
              {errors.body && (
                <p className="text-sm text-red-600 mt-1">{errors.body.message}</p>
              )}
            </div>
            <Button type="submit" disabled={commentLoading}>
              {commentLoading ? 'Adding...' : 'Add Comment'}
            </Button>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{comment.author.email}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
