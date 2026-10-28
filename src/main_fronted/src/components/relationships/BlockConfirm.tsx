import React from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface BlockConfirmProps {
  open: boolean;
  userId: string;
  name: string;
  onClose: () => void;
}

/**
 * Asks before blocking someone. The copy says what changes for me and nothing more: the backend
 * does not stop them from seeing me, so the dialog never promises that.
 */
export const BlockConfirm: React.FC<BlockConfirmProps> = ({ open, userId, name, onClose }) => {
  const { blockUser } = useApp();
  return (
    <ConfirmDialog
      open={open}
      title={`Block ${name}?`}
      body="You won't see their posts, comments or messages. They won't be told."
      confirmLabel="Block"
      destructive
      // A refused block shows its reason as a toast; the dialog closes either way.
      onConfirm={async () => { await blockUser(userId); }}
      onClose={onClose}
    />
  );
};
