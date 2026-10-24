import React, { useRef, useState } from 'react';
import { Button, CircularProgress, type ButtonProps } from '@mui/material';

export type AsyncButtonProps = Omit<ButtonProps, 'onClick'> & {
  onClick: () => Promise<unknown>;
};

/**
 * A button whose action is async. It shows a spinner and ignores clicks while the action is
 * pending (a ref guards the window before React re-renders). A rejection is not swallowed:
 * the caller must handle its own error and show it, as the rest of the app does.
 */
export const AsyncButton: React.FC<AsyncButtonProps> = ({ onClick, disabled, startIcon, children, ...rest }) => {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const handleClick = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onClick();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <Button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={handleClick}
      startIcon={pending ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : startIcon}
    >
      {children}
    </Button>
  );
};
