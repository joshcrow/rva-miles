'use client';

import { Drawer, DrawerProps, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ReactNode } from 'react';

export interface AppBottomSheetProps extends Omit<DrawerProps, 'anchor' | 'title'> {
  title?: ReactNode;
  showCloseButton?: boolean;
  showDragHandle?: boolean;
  children: ReactNode;
}

export default function AppBottomSheet({
  title,
  showCloseButton = true,
  showDragHandle = true,
  children,
  onClose,
  ...props
}: AppBottomSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          borderRadius: '16px 16px 0 0',
        },
      }}
      {...props}
    >
      {showDragHandle && (
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: 'divider',
            borderRadius: 2,
            mx: 'auto',
            mt: 1.5,
            mb: 1,
          }}
        />
      )}
      {(title || showCloseButton) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            pb: 1,
          }}
        >
          {title && (
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          )}
          {showCloseButton && onClose && (
            <IconButton
              aria-label="close"
              onClick={(e) => onClose(e, 'escapeKeyDown')}
              sx={{ ml: 'auto' }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      )}
      <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
    </Drawer>
  );
}
