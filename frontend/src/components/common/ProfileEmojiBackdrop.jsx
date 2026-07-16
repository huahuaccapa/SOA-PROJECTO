import React, { useMemo } from 'react';

const EMOJIS = ['💻', '🛍️', '📦', '✨', '🚀', '🔐', '📊', '💳', '🧾', '🔔', '🎯', '🌐'];

function hashText(value = '') {
  return [...String(value)].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

const ProfileEmojiBackdrop = ({ seed = 'byteverse' }) => {
  const icons = useMemo(() => {
    const base = hashText(seed);
    return Array.from({ length: 12 }, (_, index) => {
      const value = (base + index * 2654435761) >>> 0;
      return {
        emoji: EMOJIS[value % EMOJIS.length],
        left: 4 + ((value >>> 3) % 90),
        top: 6 + ((value >>> 11) % 78),
        size: 18 + ((value >>> 19) % 22),
        rotate: -24 + ((value >>> 24) % 49),
        opacity: 0.12 + ((value % 18) / 100),
      };
    });
  }, [seed]);

  return (
    <div className="profile-emoji-backdrop" aria-hidden="true">
      {icons.map((icon, index) => (
        <span
          key={`${icon.emoji}-${index}`}
          style={{
            left: `${icon.left}%`,
            top: `${icon.top}%`,
            fontSize: `${icon.size}px`,
            opacity: icon.opacity,
            transform: `rotate(${icon.rotate}deg)`,
          }}
        >
          {icon.emoji}
        </span>
      ))}
    </div>
  );
};

export default ProfileEmojiBackdrop;
