import { RefObject } from "react";

export function autoscroll(container: RefObject<HTMLDivElement | null>) {
  const PIXELS_TO_AUTOSCROLL = 140;
  const el = container.current;
  if (!el) return;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < PIXELS_TO_AUTOSCROLL)
    el.scrollTop = el.scrollHeight;
}

export function scrollToBottom(container: RefObject<HTMLDivElement | null>) {
  const el = container.current;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}