'use client'

import { Preset } from '../page'

interface PresetSelectorProps {
  value: Preset
  onChange: (preset: Preset) => void
}

const presets = [
  {
    id: 'default' as Preset,
    name: 'Default',
    description: 'Balanced lo-fi with classic warmth',
    color: 'bg-lofi-purple',
  },
  {
    id: 'tape90s' as Preset,
    name: 'Tape 90s',
    description: 'Warmer, more saturated cassette sound',
    color: 'bg-lofi-pink',
  },
  {
    id: 'sleep' as Preset,
    name: 'Sleep',
    description: 'Slower, dreamier with extra reverb',
    color: 'bg-lofi-blue',
  },
]

export default function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-lofi-dark">
        Choose Your Vibe
      </label>
      <div className="grid grid-cols-3 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              value === preset.id
                ? `border-current ${preset.color} border-opacity-50 bg-opacity-10`
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${preset.color} mx-auto mb-2`} />
            <div className="text-sm font-medium text-lofi-dark">{preset.name}</div>
            <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
            {value === preset.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}