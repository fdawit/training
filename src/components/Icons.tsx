import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 22, children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export const PathIcon = (props: IconProps) => <IconBase {...props}><circle cx="7" cy="5" r="2.5"/><circle cx="17" cy="19" r="2.5"/><path d="M8.5 7c1 2 6 1 6 4s-5 2-5 5c0 1 .6 1.8 1.5 2.4"/></IconBase>;
export const TodayIcon = (props: IconProps) => <IconBase {...props}><path d="M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2Z"/><path d="M8 2v4m8-4v4M3 9h18"/><path d="m9 14 2 2 4-4"/></IconBase>;
export const ProgressIcon = (props: IconProps) => <IconBase {...props}><path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/></IconBase>;
export const SettingsIcon = (props: IconProps) => <IconBase {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></IconBase>;
export const TimerIcon = (props: IconProps) => <IconBase {...props}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></IconBase>;
export const CheckIcon = (props: IconProps) => <IconBase {...props}><path d="m5 12 4 4L19 6"/></IconBase>;
export const BoltIcon = (props: IconProps) => <IconBase {...props}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></IconBase>;
export const FlameIcon = (props: IconProps) => <IconBase {...props}><path d="M12 22c4 0 7-2.7 7-7.2 0-3.2-1.7-6.2-5-9.8.1 3-1.7 4.3-2.7 2.2C10.2 4.9 10.8 3.4 9 2c.1 3.6-4 6.1-4 11.8C5 19.1 8.3 22 12 22Z"/><path d="M12 22c-2.1 0-3.5-1.4-3.5-3.3 0-1.5.7-2.6 2.1-4.3.1 1.5 1 2.2 1.7 1 .6-1 .5-1.8.9-2.7 1.4 1.8 2.3 3.3 2.3 5.5 0 2.2-1.4 3.8-3.5 3.8Z"/></IconBase>;
export const DumbbellIcon = (props: IconProps) => <IconBase {...props}><path d="M6 8v8m12-8v8M3.5 9.5v5m17-5v5M6 12h12M2 11v2m20-2v2"/></IconBase>;
export const ChevronIcon = (props: IconProps) => <IconBase {...props}><path d="m9 18 6-6-6-6"/></IconBase>;
export const XIcon = (props: IconProps) => <IconBase {...props}><path d="m6 6 12 12M18 6 6 18"/></IconBase>;
export const PlayIcon = (props: IconProps) => <IconBase {...props}><path d="m8 5 11 7-11 7V5Z"/></IconBase>;
export const PauseIcon = (props: IconProps) => <IconBase {...props}><path d="M8 5v14m8-14v14"/></IconBase>;
export const DownloadIcon = (props: IconProps) => <IconBase {...props}><path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/></IconBase>;
export const UploadIcon = (props: IconProps) => <IconBase {...props}><path d="M12 16V4m-4 4 4-4 4 4M4 20h16"/></IconBase>;
