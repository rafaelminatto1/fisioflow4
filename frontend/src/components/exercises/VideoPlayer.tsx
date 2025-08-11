'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  url: string
  title: string
  thumbnail?: string
  autoplay?: boolean
  loop?: boolean
  showControls?: boolean
  onProgress?: (progress: number) => void
  onComplete?: () => void
  className?: string
}

export function VideoPlayer({
  url,
  title,
  thumbnail,
  autoplay = false,
  loop = false,
  showControls = true,
  onProgress,
  onComplete,
  className
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControlsTimeout, setShowControlsTimeout] = useState<NodeJS.Timeout>()
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Detectar se é URL do YouTube
  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  // Converter URL do YouTube para embed
  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = videoIdMatch?.[1]
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`
    }
    return url
  }

  // Handlers de tempo
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      setCurrentTime(current)
      
      if (onProgress) {
        const progress = duration > 0 ? (current / duration) * 100 : 0
        onProgress(progress)
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsVideoReady(true)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (onComplete) {
      onComplete()
    }
  }

  // Controles de reprodução
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      videoRef.current.muted = newVolume === 0
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted
      videoRef.current.muted = newMuted
      setIsMuted(newMuted)
      if (!newMuted && volume === 0) {
        setVolume(0.5)
        videoRef.current.volume = 0.5
      }
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  // Auto-hide dos controles
  const showControlsTemporarily = () => {
    setControlsVisible(true)
    if (showControlsTimeout) {
      clearTimeout(showControlsTimeout)
    }
    setShowControlsTimeout(
      setTimeout(() => {
        if (isPlaying) {
          setControlsVisible(false)
        }
      }, 3000)
    )
  }

  // Formatar tempo
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Detectar mudanças de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (showControlsTimeout) {
        clearTimeout(showControlsTimeout)
      }
    }
  }, [showControlsTimeout])

  // Se for YouTube, usar iframe
  if (isYouTubeUrl(url)) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="relative aspect-video">
          <iframe
            src={getYouTubeEmbedUrl(url)}
            title={title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div 
        ref={containerRef}
        className={cn(
          "relative group cursor-pointer",
          isFullscreen ? "w-screen h-screen bg-black" : "aspect-video"
        )}
        onMouseMove={showControlsTemporarily}
        onClick={togglePlay}
      >
        {/* Vídeo */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={thumbnail}
          autoPlay={autoplay}
          loop={loop}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={url} type="video/mp4" />
          Seu navegador não suporta vídeos HTML5.
        </video>

        {/* Overlay de loading */}
        {!isVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Controles */}
        {showControls && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300",
              controlsVisible || !isPlaying ? "opacity-100" : "opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra de progresso */}
            <div className="px-4 mb-2">
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
            </div>

            {/* Controles principais */}
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center space-x-2">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                {/* Restart */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restart}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div className="w-20">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Tempo */}
                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Velocidade */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {playbackRate}x
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32" align="end">
                    <div className="space-y-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <Button
                          key={rate}
                          variant={playbackRate === rate ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => changePlaybackRate(rate)}
                        >
                          {rate}x
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Badge de velocidade */}
        {playbackRate !== 1 && (
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/50 text-white">
              {playbackRate}x
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}