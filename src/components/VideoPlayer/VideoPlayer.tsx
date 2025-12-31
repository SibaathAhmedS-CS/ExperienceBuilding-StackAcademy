'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  Settings
} from 'lucide-react';
import styles from './VideoPlayer.module.css';

// TypeScript declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

// Helper to detect YouTube URLs and extract video ID
function getYouTubeVideoId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export default function VideoPlayer({
  src,
  poster,
  title,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  // Check if the source is a YouTube video
  const youtubeVideoId = getYouTubeVideoId(src);
  const isYouTube = isYouTubeUrl(src);

  useEffect(() => {
    // Only attach video element listeners if it's not a YouTube video
    if (isYouTube) return;
    
    const video = videoRef.current;
    if (!video) return;

    let completionTriggered = false;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      onProgress?.(progress);
      
      // Check if user skipped to last second (within 2 seconds of end)
      // Mark as complete if video is near the end
      if (video.duration > 0 && !completionTriggered) {
        const timeRemaining = video.duration - video.currentTime;
        if (timeRemaining <= 2 && timeRemaining > 0) {
          completionTriggered = true;
          onComplete?.();
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      completionTriggered = false; // Reset when new video loads
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (!completionTriggered) {
        completionTriggered = true;
        onComplete?.();
      }
    };

    const handleSeeked = () => {
      // Reset completion trigger when user seeks
      // This allows re-triggering if user seeks back and forward again
      if (video.duration > 0) {
        const timeRemaining = video.duration - video.currentTime;
        if (timeRemaining > 2) {
          completionTriggered = false;
        } else if (timeRemaining <= 2 && !completionTriggered) {
          completionTriggered = true;
          onComplete?.();
        }
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [onProgress, onComplete, isYouTube]);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // YouTube IFrame API integration for completion tracking
  useEffect(() => {
    if (!isYouTube || !youtubeVideoId || !containerRef.current) return;

    let player: any = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let completionTriggered = false;

    const initializePlayer = () => {
      if (!containerRef.current) return;

      const playerId = `youtube-player-${youtubeVideoId}`;
      const playerDiv = containerRef.current.querySelector(`#${playerId}`) as HTMLElement;
      
      if (!playerDiv) {
        console.warn('YouTube player div not found');
        return;
      }

      try {
        player = new (window as any).YT.Player(playerId, {
          videoId: youtubeVideoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              // Monitor video progress
              progressInterval = setInterval(() => {
                if (!player) return;
                
                try {
                  const currentTime = player.getCurrentTime();
                  const duration = player.getDuration();
                  
                  if (duration > 0 && currentTime !== undefined) {
                    const progress = (currentTime / duration) * 100;
                    onProgress?.(progress);
                    
                    // Check if video is near the end (within 2 seconds) or at the end
                    const timeRemaining = duration - currentTime;
                    if (timeRemaining <= 2 && timeRemaining >= 0 && !completionTriggered) {
                      completionTriggered = true;
                      onComplete?.();
                      if (progressInterval) {
                        clearInterval(progressInterval);
                        progressInterval = null;
                      }
                    }
                  }
                } catch (error) {
                  // YouTube API might throw errors, ignore them
                }
              }, 500); // Check every 500ms
            },
            onStateChange: (event: any) => {
              // State 0 = ENDED
              if (event.data === 0 && !completionTriggered) {
                completionTriggered = true;
                onComplete?.();
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              }
            },
          },
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // Load YouTube IFrame API script if not already loaded
    if (window.YT && (window as any).YT.Player) {
      initializePlayer();
    } else {
      // Load the script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Set up callback
      const originalCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        initializePlayer();
      };
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (error) {
          // Ignore destroy errors
        }
      }
    };
  }, [isYouTube, youtubeVideoId, onProgress, onComplete]);

  // YouTube embed player
  if (isYouTube && youtubeVideoId) {
    return (
      <div ref={containerRef} className={styles.player}>
        <div id={`youtube-player-${youtubeVideoId}`} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  // Standard video player for direct video files
  return (
    <div 
      ref={containerRef}
      className={`${styles.player} ${showControls ? styles.showControls : ''}`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={styles.video}
        playsInline
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className={styles.bufferingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isBuffering && (
        <div className={styles.playOverlay}>
          <button className={styles.bigPlayButton}>
            <Play size={48} fill="white" />
          </button>
          {title && <h3 className={styles.videoTitle}>{title}</h3>}
        </div>
      )}

      {/* Controls */}
      <div 
        className={styles.controls}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className={styles.progressSlider}
            style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
          />
        </div>

        {/* Controls Row */}
        <div className={styles.controlsRow}>
          {/* Left Controls */}
          <div className={styles.leftControls}>
            <button className={styles.controlBtn} onClick={togglePlay}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
            </button>
            
            <button className={styles.controlBtn} onClick={() => skip(-10)}>
              <SkipBack size={20} />
            </button>
            
            <button className={styles.controlBtn} onClick={() => skip(10)}>
              <SkipForward size={20} />
            </button>

            {/* Volume Control */}
            <div className={styles.volumeControl}>
              <button className={styles.controlBtn} onClick={toggleMute}>
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
              />
            </div>

            {/* Time Display */}
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className={styles.rightControls}>
            <button className={styles.controlBtn}>
              <Settings size={20} />
            </button>
            <button className={styles.controlBtn} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

