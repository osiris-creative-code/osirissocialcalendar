import type { SVGProps } from "react";
import type { ItemType } from "@/lib/types";

/**
 * Hand-drawn icon set.
 *
 * Deliberately not a brand-icon package: the content types need an Instagram
 * vocabulary (grid / ring / reel) without shipping Meta's trademarked marks.
 * Everything is stroke-based on a 24 box so sizes and colours come from CSS.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Six dots — the drag affordance. Replaces the ⠿ glyph, whose font metrics
 *  put the painted dots outside the button's hit box in Safari. */
export const GripIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={0}>
    <g fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </g>
  </Svg>
);

/** Post — a framed photo. */
export const PostIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.6" />
    <path d="M21 15.5 16.5 11 6 21" />
  </Svg>
);

/** Story — the ring around an avatar. */
export const StoryIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3.6 2.4" />
    <circle cx="12" cy="12" r="4" />
  </Svg>
);

/** Reels — a film strip with a play head. */
export const ReelIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 8h18M8.5 3 11 8M15 3l2.5 5" />
    <path d="M11 12.5v4l3.5-2z" fill="currentColor" stroke="none" />
  </Svg>
);

/** Güne özel — a starred day. */
export const SpecialIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 2.1 4.6 5 .5-3.7 3.4 1 4.9L12 15l-4.4 2.4 1-4.9L4.9 9.1l5-.5z" />
  </Svg>
);

export const ITEM_TYPE_ICONS: Record<ItemType, (p: IconProps) => React.ReactElement> = {
  post: PostIcon,
  story: StoryIcon,
  reel: ReelIcon,
  special: SpecialIcon,
};

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </Svg>
);

export const ReviseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Svg>
);

export const WhatsAppIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={0}>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.2c-.2.7-1.3 1.3-1.8 1.3-.5 0-.5.4-3.2-.8-2.7-1.2-4.3-4-4.4-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4v.9z"
    />
  </Svg>
);
