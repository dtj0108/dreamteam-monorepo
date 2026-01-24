Pod::Spec.new do |s|
  s.name           = 'ChimeSdk'
  s.version        = '1.0.0'
  s.summary        = 'Amazon Chime SDK bridge for Expo'
  s.description    = 'Expo module that bridges Amazon Chime SDK for React Native video calling'
  s.author         = 'DreamTeam'
  s.homepage       = 'https://dreamteam.ai'
  s.license        = { type: 'MIT' }
  s.platforms      = { ios: '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'AmazonChimeSDK', '~> 0.23'
  s.dependency 'AmazonChimeSDKMedia', '~> 0.20'

  s.source_files = '**/*.swift'
end
