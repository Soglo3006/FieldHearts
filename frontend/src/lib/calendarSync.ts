/** Google Calendar "Add event" deep link */
export function googleCalendarUrl(event: {
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  notes?: string | null;
}): string {
  const format = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Uneden",
    dates: `${format(event.starts_at)}/${format(event.ends_at)}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.notes) params.set("details", event.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
