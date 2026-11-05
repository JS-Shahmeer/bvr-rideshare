export type NotificationRow = { id: string; user_id: string; title: string; message: string; booking_id: string | null; role: string };

export type ExpoMessage = { to: string; title: string; body: string; sound: 'default'; data: Record<string, string> };

/** Expo push messages for one notification, one per device token. */
export function pushMessages(n: NotificationRow, tokens: string[]): ExpoMessage[] {
  return tokens
    .filter((t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
    .map((to) => ({ to, title: n.title, body: n.message, sound: 'default', data: { bookingId: n.booking_id ?? '', role: n.role } }));
}
