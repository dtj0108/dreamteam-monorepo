import { useMemo } from "react";
import { useChannels, useDMConversations } from "./useTeam";

/**
 * Hook to calculate total unread message count across all channels and DMs.
 * Used for displaying badges in navigation (ProductDrawer, Hub, etc.)
 */
export function useTeamUnreadCount(): number {
  const { data: channelsData } = useChannels({ joined: true });
  const { data: dmsData } = useDMConversations();

  return useMemo(() => {
    const channelUnread =
      channelsData?.channels?.reduce(
        (sum, c) => sum + (c.unread_count || 0),
        0
      ) || 0;

    const dmUnread =
      dmsData?.conversations?.reduce(
        (sum, d) => sum + (d.unread_count || 0),
        0
      ) || 0;

    return channelUnread + dmUnread;
  }, [channelsData, dmsData]);
}
