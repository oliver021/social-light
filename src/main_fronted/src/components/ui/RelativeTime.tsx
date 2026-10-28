import React from 'react';
import { timeAgo } from './time';

export interface RelativeTimeProps {
  iso?: string | null;
}

/** A relative time ("5m ago") in a <time> element with the machine-readable ISO value. */
export const RelativeTime: React.FC<RelativeTimeProps> = ({ iso }) => {
  if (!iso) return null;
  return <time dateTime={iso}>{timeAgo(iso)}</time>;
};
