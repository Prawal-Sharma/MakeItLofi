'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/x-flac']
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac)$/i)) {
      alert('Please upload a WAV, MP3, or FLAC file')
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
        accept="audio/wav,audio/mp3,audio/mpeg,audio/flac"
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
          <div>
            <button
              onClick={() => inputRef.current?.click()}
              className="text-lofi-purple font-medium hover:underline"
            >
              Choose a file
            </button>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500">WAV, MP3, or FLAC up to 100MB</p>
        </div>
      )}
    </div>
  )
}