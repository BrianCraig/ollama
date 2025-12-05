export function humanizeRelative(iso?: string) {
  if (!iso) return "—";
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((then - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [30, "day"],
      [12, "month"],
      [Number.POSITIVE_INFINITY, "year"],
    ];

    let duration = diff;
    for (let i = 0; i < divisions.length; i++) {
      const [amount, unit] = divisions[i];
      if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit);
      duration = Math.round(duration / amount);
    }
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}