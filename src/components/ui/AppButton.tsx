'use client';

import { Button, ButtonProps } from '@mui/material';
import { forwardRef } from 'react';

export interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ loading, disabled, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </Button>
    );
  }
);

AppButton.displayName = 'AppButton';

export default AppButton;
