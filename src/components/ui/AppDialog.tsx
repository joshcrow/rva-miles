'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogProps,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ReactNode } from 'react';

export interface AppDialogProps extends Omit<DialogProps, 'title'> {
  title?: ReactNode;
  showCloseButton?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AppDialog({
  title,
  showCloseButton = true,
  actions,
  children,
  onClose,
  ...props
}: AppDialogProps) {
  return (
    <Dialog
      onClose={onClose}
      {...props}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: showCloseButton ? 1 : 2,
          }}
        >
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          {showCloseButton && onClose && (
            <IconButton
              aria-label="close"
              onClick={(e) => onClose(e, 'escapeKeyDown')}
              sx={{ ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
