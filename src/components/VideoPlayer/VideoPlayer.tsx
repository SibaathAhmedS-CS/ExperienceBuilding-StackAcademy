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

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      onProgress?.(progress);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [onProgress, onComplete]);

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

