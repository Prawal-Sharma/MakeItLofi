'use client'

interface CassetteAnimationProps {
  progress: number
  status: 'pending' | 'processing'
}

export default function CassetteAnimation({ progress, status }: CassetteAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
      {/* Cassette Tape */}
      <div className="relative w-56 sm:w-64 h-36 sm:h-40 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-2xl p-3 sm:p-4">
        {/* Label */}
        <div className="absolute inset-x-4 top-3 h-20 bg-gradient-to-br from-lofi-cream to-lofi-pink rounded p-2">
          <div className="text-xs font-mono text-lofi-dark">
            <div className="font-bold">MAKE IT LO-FI</div>
            <div className="text-[10px] opacity-70">Side A - Processing...</div>
          </div>
        </div>
        
        {/* Reels */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between">
          {/* Left Reel */}
          <div className="relative w-14 h-14">
            <div className={`absolute inset-0 bg-gray-700 rounded-full border-4 border-gray-600 ${status === 'processing' ? 'animate-spin-slow' : ''}`}>
              <div className="absolute inset-2 bg-gray-900 rounded-full">
                <div className="absolute inset-1 bg-gray-800 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-600 rounded-full" />
                </div>
              </div>
              {/* Tape visibility based on progress */}
              <div 
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + (50 - progress/2)}% 0%, ${50 + (50 - progress/2)}% 100%, 50% 100%)`
                }}
              >
                <div className="w-full h-full bg-gradient-to-r from-amber-900 to-amber-800" />
              </div>
            </div>
          </div>
          
          {/* Right Reel */}
          <div className="relative w-14 h-14">
            <div className={`absolute inset-0 bg-gray-700 rounded-full border-4 border-gray-600 ${status === 'processing' ? 'animate-spin-slow' : ''}`}>
              <div className="absolute inset-2 bg-gray-900 rounded-full">
                <div className="absolute inset-1 bg-gray-800 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-600 rounded-full" />
                </div>
              </div>
              {/* Tape visibility based on progress */}
              <div 
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  clipPath: `polygon(50% 50%, ${50 - progress/2}% 0%, 50% 0%, 50% 100%, ${50 - progress/2}% 100%)`
                }}
              >
                <div className="w-full h-full bg-gradient-to-r from-amber-900 to-amber-800" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Center window */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-700 rounded-sm border border-gray-600" />
        
        {/* Screw holes */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-gray-600 rounded-full" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-gray-600 rounded-full" />
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-gray-600 rounded-full" />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-gray-600 rounded-full" />
      </div>
      
      {/* Progress Text */}
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-lofi-dark">
          {Math.round(progress)}%
        </div>
        <div className="text-sm text-lofi-brown">
          {status === 'pending' ? 'Preparing your track...' : 'Applying lo-fi magic...'}
        </div>
      </div>
      
      {/* Audio Waveform Animation */}
      <div className="flex items-center justify-center space-x-1">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-lofi-purple rounded-full transition-all duration-300 ${
              status === 'processing' ? 'animate-pulse' : ''
            }`}
            style={{
              height: status === 'processing' ? `${20 + Math.sin(Date.now() / 200 + i) * 10}px` : '4px',
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    </div>
  )
}