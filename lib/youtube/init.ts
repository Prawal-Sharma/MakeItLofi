import * as play from 'play-dl'

let initialized = false

export async function initializePlayDl() {
  if (!initialized) {
    try {
      // Initialize play-dl without authorization for basic functionality
      // This allows it to work without cookies/tokens
      play.setToken({
        youtube: {
          cookie: '' // Empty cookie to bypass auth requirement
        }
      })
      initialized = true
      console.log('play-dl initialized successfully')
    } catch (error) {
      console.error('Failed to initialize play-dl:', error)
      // Continue anyway - basic functionality should still work
      initialized = true
    }
  }
}