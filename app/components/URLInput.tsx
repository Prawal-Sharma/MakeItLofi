'use client'

interface URLInputProps {
  value: string
  onChange: (value: string) => void
}

export default function URLInput({ value, onChange }: URLInputProps) {
  const validateYouTubeUrl = (url: string) => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
      /^(https?:\/\/)?(music\.)?youtube\.com\/watch\?v=[\w-]+/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const isValid = !value || validateYouTubeUrl(value)

  return (
    <div className="space-y-2">
      <label htmlFor="youtube-url" className="block text-sm font-medium text-lofi-dark">
        YouTube URL
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <input
          id="youtube-url"
          type="url"
          value={value}
          onChange={handleChange}
          placeholder="https://www.youtube.com/watch?v=..."
          className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            isValid
              ? 'border-gray-300 focus:ring-lofi-purple focus:border-lofi-purple'
              : 'border-red-300 focus:ring-red-500 focus:border-red-500'
          }`}
        />
      </div>
      {!isValid && (
        <p className="text-sm text-red-600">Please enter a valid YouTube URL</p>
      )}
    </div>
  )
}