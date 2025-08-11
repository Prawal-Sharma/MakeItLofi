'use client'

import { useState } from 'react'
import FileUpload from './components/FileUpload'
import URLInput from './components/URLInput'
import PresetSelector from './components/PresetSelector'
import ProcessButton from './components/ProcessButton'
import ProgressBar from './components/ProgressBar'
import AudioPlayer from './components/AudioPlayer'

export type SourceType = 'youtube' | 'upload' | null
export type Preset = 'default' | 'tape90s' | 'sleep'
export type JobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

export default function Home() {
  const [sourceType, setSourceType] = useState<SourceType>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [preset, setPreset] = useState<Preset>('default')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [outputUrls, setOutputUrls] = useState<{ mp3: string; wav: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    setError(null)
    setJobStatus('pending')
    setProgress(0)
    
    try {
      const formData = new FormData()
      
      if (sourceType === 'youtube') {
        formData.append('sourceType', 'youtube')
        formData.append('sourceUrl', sourceUrl)
      } else if (sourceType === 'upload' && sourceFile) {
        formData.append('sourceType', 'upload')
        formData.append('file', sourceFile)
      }
      
      formData.append('preset', preset)
      
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to start processing')
      }
      
      const { jobId } = await response.json()
      setJobId(jobId)
      setJobStatus('processing')
      
      // Start polling for job status
      pollJobStatus(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setJobStatus('failed')
    }
  }

  const pollJobStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${id}`)
        const data = await response.json()
        
        setProgress(data.progress || 0)
        setJobStatus(data.status)
        
        if (data.status === 'completed') {
          clearInterval(interval)
          setOutputUrls({
            mp3: `/api/download/${id}/mp3`,
            wav: `/api/download/${id}/wav`,
          })
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setError(data.error || 'Processing failed')
        }
      } catch (err) {
        clearInterval(interval)
        setError('Failed to check job status')
        setJobStatus('failed')
      }
    }, 1000)
  }

  const handleReset = () => {
    setSourceType(null)
    setSourceUrl('')
    setSourceFile(null)
    setJobId(null)
    setJobStatus('idle')
    setProgress(0)
    setOutputUrls(null)
    setError(null)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-lofi-dark mb-4">
            Make It Lo-Fi
          </h1>
          <p className="text-lofi-brown text-lg">
            Transform any audio into nostalgic lo-fi vibes
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 cassette-shadow">
          {jobStatus === 'idle' && (
            <>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSourceType('youtube')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sourceType === 'youtube'
                        ? 'border-lofi-purple bg-lofi-purple/10'
                        : 'border-gray-200 hover:border-lofi-purple/50'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-lofi-purple" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className="text-sm font-medium">YouTube URL</span>
                  </button>
                  
                  <button
                    onClick={() => setSourceType('upload')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      sourceType === 'upload'
                        ? 'border-lofi-purple bg-lofi-purple/10'
                        : 'border-gray-200 hover:border-lofi-purple/50'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-lofi-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Upload File</span>
                  </button>
                </div>

                {sourceType === 'youtube' && (
                  <URLInput value={sourceUrl} onChange={setSourceUrl} />
                )}
                
                {sourceType === 'upload' && (
                  <FileUpload onFileSelect={setSourceFile} />
                )}
                
                {sourceType && (
                  <>
                    <PresetSelector value={preset} onChange={setPreset} />
                    <ProcessButton 
                      onClick={handleProcess}
                      disabled={
                        (sourceType === 'youtube' && !sourceUrl) ||
                        (sourceType === 'upload' && !sourceFile)
                      }
                    />
                  </>
                )}
              </div>
            </>
          )}

          {(jobStatus === 'pending' || jobStatus === 'processing') && (
            <div className="space-y-6">
              <ProgressBar progress={progress} status={jobStatus} />
              <p className="text-center text-lofi-brown">
                {jobStatus === 'pending' ? 'Preparing your audio...' : 'Applying lo-fi magic...'}
              </p>
            </div>
          )}

          {jobStatus === 'completed' && outputUrls && (
            <div className="space-y-6">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-lofi-dark mb-2">Your lo-fi track is ready!</h2>
              </div>
              
              <AudioPlayer mp3Url={outputUrls.mp3} />
              
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={outputUrls.mp3}
                  download
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-lofi-purple text-white rounded-lg hover:bg-lofi-purple/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download MP3
                </a>
                <a
                  href={outputUrls.wav}
                  download
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-lofi-blue text-white rounded-lg hover:bg-lofi-blue/90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download WAV
                </a>
              </div>
              
              <button
                onClick={handleReset}
                className="w-full px-4 py-3 border-2 border-lofi-brown text-lofi-brown rounded-lg hover:bg-lofi-brown/10 transition-colors"
              >
                Process Another Track
              </button>
            </div>
          )}

          {jobStatus === 'failed' && (
            <div className="text-center space-y-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-lofi-dark">Oops! Something went wrong</h2>
              <p className="text-lofi-brown">{error || 'An unexpected error occurred'}</p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-lofi-purple text-white rounded-lg hover:bg-lofi-purple/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}