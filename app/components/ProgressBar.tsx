'use client'

import { JobStatus } from '../page'

interface ProgressBarProps {
  progress: number
  status: JobStatus
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-lofi-brown">
        <span>Processing...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 lofi-gradient transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 opacity-30 animate-pulse" />
        </div>
        {status === 'pending' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
        )}
      </div>
    </div>
  )
}