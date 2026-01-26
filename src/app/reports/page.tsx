'use client';

import { Container, Typography, Card, CardContent, Button, Box } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import Link from 'next/link';

export default function ReportsPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Reports
      </Typography>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              py: 4,
            }}
          >
            <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Coming Soon
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Advanced reports with charts, trends, and insights are coming in a future update.
              <br />
              <br />
              Planned features:
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', color: 'text.secondary', mb: 3 }}>
              <li>Monthly mileage trends</li>
              <li>Category breakdowns</li>
              <li>Vehicle usage comparison</li>
              <li>Tax year summaries</li>
            </Box>
            <Button
              component={Link}
              href="/export"
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              Export Your Data Instead
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
