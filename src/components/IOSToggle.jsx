import React from 'react';

/**
 * Proper iOS-style toggle switch.
 * Uses inline styles so it works regardless of Tailwind purge.
 * ON  → #34C759 (iOS green)
 * OFF → #E5E5EA (iOS light gray)
 */
export default function IOSToggle({ isOn, onChange, size = 'md', disabled = false }) {
  const dims = {
    sm: { track: { width: 36, height: 22 }, thumb: { size: 18, offset: 2, travel: 14 } },
    md: { track: { width: 51, height: 31 }, thumb: { size: 27, offset: 2, travel: 20 } },
    lg: { track: { width: 60, height: 36 }, thumb: { size: 32, offset: 2, travel: 24 } },
  }[size] || dims?.md;

  const { track, thumb } = dims;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      aria-checked={isOn}
      role="switch"
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width:  track.width,
        height: track.height,
        borderRadius: track.height / 2,
        backgroundColor: isOn ? '#34C759' : '#E5E5EA',
        border: 'none',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        transition: 'background-color 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top:    thumb.offset,
          left:   thumb.offset,
          width:  thumb.size,
          height: thumb.size,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22), 0 0px 2px rgba(0,0,0,0.12)',
          transform: isOn ? `translateX(${thumb.travel}px)` : 'translateX(0px)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
        }}
      />
    </button>
  );
}
