'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a']
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac|m4a|aac)$/i)) {
      alert('Please upload a WAV, MP3, FLAC, or M4A file')
      return
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('File size must be less than 100MB')
      return
    }
    
    setFileName(file.name)
    onFileSelect(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const loadSampleAudio = async () => {
    setLoadingSample(true)
    try {
      const response = await fetch('/samples/sample.mp3')
      const blob = await response.blob()
      const file = new File([blob], 'sample.mp3', { type: 'audio/mpeg' })
      handleFile(file)
    } catch (error) {
      alert('Failed to load sample audio. Please try uploading your own file.')
    } finally {
      setLoadingSample(false)
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive ? 'border-lofi-purple bg-lofi-purple/5' : 'border-gray-300 hover:border-lofi-purple/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/wav,audio/mp3,audio/mpeg,audio/flac,audio/mp4,audio/x-m4a,audio/m4a"
        onChange={handleChange}
        className="hidden"
      />
      
      {fileName ? (
        <div className="space-y-4">
          <svg className="w-12 h-12 mx-auto text-lofi-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lofi-dark font-medium">{fileName}</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm text-lofi-purple hover:underline"
          >
            Choose different file
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="space-y-2">
            <p className="text-gray-600">Drag and drop your audio file here</p>
            <p className="text-gray-500">or</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 bg-lofi-purple text-white rounded-lg hover:bg-lofi-purple/90 transition-colors"
              >
                Browse Files
              </button>
              <button
                onClick={loadSampleAudio}
                disabled={loadingSample}
                className="px-4 py-2 bg-lofi-blue text-white rounded-lg hover:bg-lofi-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSample ? 'Loading...' : 'Try Sample'}
              </button>
              <a
                href="/samples/sample.mp3"
                download="sample-original.mp3"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-500">WAV, MP3, FLAC, or M4A up to 100MB</p>
          <p className="text-xs text-gray-400">No audio file? Try our sample to test the lo-fi effect!</p>
        </div>
      )}
    </div>
  )
}