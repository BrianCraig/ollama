export function detectOSFromNavigator(): "Windows" | "macOS" | "Linux" | "Unknown" {
  const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "").toLowerCase() : "";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

export async function copyToClipboard(text: string, onCopied?: (copied: boolean) => void) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      onCopied?.(true);
      return;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Prevent scrolling to bottom
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const successful = document.execCommand?.("copy");
    document.body.removeChild(ta);
    onCopied?.(!!successful);
  } catch {
    onCopied?.(false);
  }
}